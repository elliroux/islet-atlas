#!/usr/bin/env python3
"""Additive migration from authorized SQLite exports. Never reads notebooks or resets cursors.

plan: immutable, checksummed pages + reconciliation report; no writes to either DB.
apply-local: backup then transactional rehearsal; idempotent/resumable.
apply-remote: explicit target + approval flag; credentials only from environment.
verify: reconcile every source version, ID, FTS entry and retained checkpoint.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

TABLES = {
    'research_records': ['id','provider','kind','title','year','doi','pmcid','url','abstract','license','full_text','full_text_status','document','updated'],
    'research_imports': ['id','cursor','state','total','processed','updated','error','lease','lease_until'],
    'research_import_runs': ['id','source','count','status','detail','created'],
}
ROOT = Path(__file__).resolve().parent.parent

def encode(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def hash_value(value):
    return hashlib.sha256(encode(value).encode()).hexdigest()

def now():
    return datetime.now(timezone.utc).isoformat()

def connect(path, readonly=True):
    db = sqlite3.connect(Path(path).resolve().as_uri() + ('?mode=ro' if readonly else '?mode=rw'), uri=True)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db

def inspect(db):
    for table, columns in TABLES.items():
        actual = [r['name'] for r in db.execute('PRAGMA table_info(' + table + ')')]
        if set(actual) != set(columns):
            raise ValueError('Schema mismatch in ' + table + '; review and extend the exporter before proceeding')

def rows(db):
    inspect(db)
    for table, columns in TABLES.items():
        for row in db.execute('SELECT ' + ','.join(columns) + ' FROM ' + table + ' ORDER BY id'):
            document = dict(row)
            yield {'table_name': table, 'row_id': row['id'], 'digest': hash_value(document), 'document': document}

def counts(db):
    return [dict(r) for r in db.execute('SELECT provider,kind,count(*) AS count FROM research_records GROUP BY provider,kind ORDER BY provider,kind')]

def content(row):
    return {k:v for k,v in row.items() if k != 'updated'}

def plan(source, destination, out, source_name='legacy-islet-atlas'):
    out = Path(out)
    if out.exists():
        raise ValueError('Plan directory already exists; resume it or choose a new immutable snapshot directory')
    with connect(source) as src, connect(destination) as dst:
        inspect(src); inspect(dst)
        # Read transactions provide consistent views even if a local export has another reader/writer.
        src.execute('BEGIN'); dst.execute('BEGIN')
        inventory = {r['id']: dict(r) for r in dst.execute('SELECT * FROM research_records')}
        missing, conflicts, identical = [], [], 0
        out.mkdir(parents=True, mode=0o700)
        pages, page, size, snapshot_hash = [], [], 0, hashlib.sha256()
        def save_page():
            nonlocal page, size
            if not page: return
            name = f'batch-{len(pages):06}.json'
            data = encode(page).encode()
            (out / name).write_bytes(data)
            pages.append({'file':name, 'sha256':hashlib.sha256(data).hexdigest(), 'rows':len(page)})
            page, size = [], 0
        for row in rows(src):
            if row['table_name']=='research_records':
                old = inventory.get(row['row_id'])
                if old is None: missing.append(row['row_id'])
                elif content(old) != content(row['document']): conflicts.append(row['row_id'])
                else: identical += 1
            encoded = encode(row).encode()
            if len(encoded)>900_000: raise ValueError('Source row exceeds bounded migration size: '+row['row_id'])
            if page and (size+len(encoded)>500_000 or len(page)>=25): save_page()
            page.append(row);size+=len(encoded);snapshot_hash.update(encoded+b'\n')
        save_page()
        report={'sourceCounts':counts(src),'destinationCounts':counts(dst),'missingIds':missing,'conflictingIds':conflicts,'identicalContent':identical,
                'policy':'Insert missing records; archive every source version and checkpoint. Existing destination records and active cursors remain unchanged.'}
        manifest={'version':1,'source':source_name,'snapshot':snapshot_hash.hexdigest(),'created':now(),'pages':pages,'report':report}
        (out/'manifest.json').write_text(encode(manifest))
        (out/'reconciliation.json').write_text(json.dumps(report,indent=2))
        return manifest

def read_plan(directory):
    directory=Path(directory)
    manifest=json.loads((directory/'manifest.json').read_text())
    if manifest.get('version')!=1 or not re.fullmatch('[a-f0-9]{64}',manifest.get('snapshot','')):
        raise ValueError('Invalid migration manifest')
    if not isinstance(manifest.get('source'),str) or not re.fullmatch('[a-zA-Z0-9_.-]{1,100}',manifest['source']):
        raise ValueError('Invalid source namespace')
    expected=hashlib.sha256()
    # Validate the complete immutable plan before any destination write.
    for index, page in enumerate(manifest['pages']):
        if page['file']!=f'batch-{index:06}.json': raise ValueError('Invalid batch filename')
        data=(directory/page['file']).read_bytes()
        if hashlib.sha256(data).hexdigest()!=page['sha256']: raise ValueError('Batch checksum mismatch')
        items=json.loads(data)
        if len(items)!=page['rows'] or len(items)>25: raise ValueError('Invalid batch size')
        for row in items:
            if row['table_name'] not in TABLES or set(row['document'])!=set(TABLES[row['table_name']]): raise ValueError('Invalid row schema')
            if row['row_id']!=row['document']['id'] or hash_value(row['document'])!=row['digest']: raise ValueError('Invalid row identity/hash')
            expected.update(encode(row).encode()+b'\n')
    if expected.hexdigest()!=manifest['snapshot']: raise ValueError('Snapshot checksum mismatch')
    return manifest

def queries(manifest, index, items):
    payload=encode(items); date=manifest['created']
    archive={"sql":"INSERT OR IGNORE INTO research_migration_rows(source,table_name,row_id,digest,document,imported_at) SELECT ?,json_extract(value,'$.table_name'),json_extract(value,'$.row_id'),json_extract(value,'$.digest'),json_extract(value,'$.document'),? FROM json_each(?)", "params":[manifest['source'],date,payload]}
    columns=TABLES['research_records']
    insert={"sql":"INSERT INTO research_records("+','.join(columns)+") SELECT "+','.join("json_extract(value,'$.document."+c+"')" for c in columns)+" FROM json_each(?) WHERE json_extract(value,'$.table_name')='research_records' ON CONFLICT(id) DO NOTHING", "params":[payload]}
    marker={"sql":"INSERT OR IGNORE INTO research_migration_batches VALUES (?,?,?,?,?)", "params":[manifest['source'],manifest['snapshot'],str(index),str(len(items)),date]}
    return [archive,insert,marker]

def apply_local(directory, destination, backup, fail_batch=None):
    manifest=read_plan(directory)
    if Path(backup).exists(): raise ValueError('Backup path must be new; never overwrite a backup')
    with connect(destination,False) as dst:
        inspect(dst)
        with sqlite3.connect(backup) as copy: dst.backup(copy)
        for i,page in enumerate(manifest['pages']):
            if dst.execute('SELECT 1 FROM research_migration_batches WHERE source=? AND snapshot=? AND batch=?',(manifest['source'],manifest['snapshot'],i)).fetchone():continue
            items=json.loads((Path(directory)/page['file']).read_text())
            with dst:
                for j,q in enumerate(queries(manifest,i,items)):
                    dst.execute(q['sql'],q['params'])
                    if i==fail_batch and j==1:raise RuntimeError('Injected migration interruption before checkpoint')
        return verify(directory,destination)

def verify(directory,destination):
    manifest=read_plan(directory)
    missing,unarchived,conflicts,unindexed=[],[],[],[]
    with connect(destination) as db:
        for page in manifest['pages']:
            for row in json.loads((Path(directory)/page['file']).read_text()):
                archived=db.execute('SELECT document FROM research_migration_rows WHERE source=? AND table_name=? AND row_id=? AND digest=?',(manifest['source'],row['table_name'],row['row_id'],row['digest'])).fetchone()
                if not archived or hash_value(json.loads(archived['document']))!=row['digest']:unarchived.append(row['row_id'])
                if row['table_name']=='research_records':
                    current=db.execute('SELECT * FROM research_records WHERE id=?',(row['row_id'],)).fetchone()
                    if not current: missing.append(row['row_id'])
                    elif content(dict(current))!=content(row['document']):conflicts.append(row['row_id'])
                    if not db.execute('SELECT 1 FROM research_fts WHERE id=?',(row['row_id'],)).fetchone():unindexed.append(row['row_id'])
        result={'preservationVerified':not(missing or unarchived or unindexed),'parityVerified':not(missing or unarchived or unindexed or conflicts),
                'missingIds':missing,'unarchivedVersions':unarchived,'unindexedIds':unindexed,'conflictingIds':conflicts,'destinationCounts':counts(db)}
        return result

def remote_request(account,database,token,body):
    url=f'https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{database}/query'
    for attempt in range(3):
        try:
            request=urllib.request.Request(url,data=encode(body).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','User-Agent':'IsletAtlasMigration/1'},method='POST')
            with urllib.request.urlopen(request,timeout=60) as response:result=json.load(response)
            if not result.get('success') or any(not r.get('success') for r in result.get('result',[])):raise RuntimeError('D1 rejected the migration request; inspect the database audit log')
            return result['result']
        except (urllib.error.URLError,TimeoutError) as error:
            retryable=not isinstance(error,urllib.error.HTTPError) or error.code in (429,500,502,503,504)
            if not retryable or attempt==2:raise RuntimeError('D1 request failed; saved checkpoints permit a safe retry') from None
            time.sleep(2**attempt)

def apply_remote(directory,account,database,approved):
    if not approved:raise ValueError('Remote writes require --approved-production-migration after explicit owner approval')
    if not re.fullmatch('[a-f0-9]{32}',account) or not re.fullmatch('[a-f0-9-]{36}',database):raise ValueError('Invalid explicit account/database target')
    token=os.environ.get('CLOUDFLARE_API_TOKEN')
    if not token:raise ValueError('CLOUDFLARE_API_TOKEN must be provided privately in the operator environment')
    manifest=read_plan(directory)
    remote_request(account,database,token,{'sql':'SELECT source,snapshot,batch FROM research_migration_batches LIMIT 1'})
    for i,page in enumerate(manifest['pages']):
        result=remote_request(account,database,token,{'sql':'SELECT 1 FROM research_migration_batches WHERE source=? AND snapshot=? AND batch=?','params':[manifest['source'],manifest['snapshot'],str(i)]})
        if result[0].get('results'):continue
        items=json.loads((Path(directory)/page['file']).read_text())
        # The D1 batch API commits these writes together. Lost responses can be retried safely.
        remote_request(account,database,token,{'batch':queries(manifest,i,items)})
        print(encode({'batch':i,'rows':len(items),'status':'applied'}),flush=True)
    return {'status':'batches applied','verification':'Export the destination and run verify. Do not cut over automation based only on this response.'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    p=sub.add_parser('plan');p.add_argument('--source',required=True);p.add_argument('--destination',required=True);p.add_argument('--out',required=True);p.add_argument('--source-name',default='legacy-islet-atlas')
    p=sub.add_parser('apply-local');p.add_argument('--plan',required=True);p.add_argument('--destination',required=True);p.add_argument('--backup',required=True)
    p=sub.add_parser('verify');p.add_argument('--plan',required=True);p.add_argument('--destination',required=True)
    p=sub.add_parser('apply-remote');p.add_argument('--plan',required=True);p.add_argument('--account',required=True);p.add_argument('--database',required=True);p.add_argument('--approved-production-migration',action='store_true')
    args=parser.parse_args()
    if args.command=='plan':result=plan(args.source,args.destination,args.out,args.source_name);result={'snapshot':result['snapshot'],'pages':len(result['pages']),'report':result['report']}
    elif args.command=='apply-local':result=apply_local(args.plan,args.destination,args.backup)
    elif args.command=='verify':result=verify(args.plan,args.destination)
    else:result=apply_remote(args.plan,args.account,args.database,args.approved_production_migration)
    print(json.dumps(result,indent=2))
    if args.command=='verify' and not result['parityVerified']:raise SystemExit(2)
if __name__=='__main__':main()
