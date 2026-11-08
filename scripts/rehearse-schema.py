#!/usr/bin/env python3
"""Rehearse additive migrations on a NEW copy of a trusted SQLite backup.
Never modifies the source; reports aggregate hashes rather than private notebook contents.
"""
import argparse, hashlib, json, os, sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent

def snapshot(db):
    tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name") if not r[0].startswith(('sqlite_','_cf_','research_fts')) and r[0]!='d1_migrations']
    result={}
    for table in tables:
        quoted='"'+table.replace('"','""')+'"'
        columns=list(db.execute('PRAGMA table_info('+quoted+')'))
        order=','.join(str(i+1) for i in range(len(columns)))
        digest=hashlib.sha256();count=0
        for row in db.execute('SELECT * FROM '+quoted+' ORDER BY '+order):
            digest.update(json.dumps(row,ensure_ascii=False,separators=(',',':'),default=lambda x:{'bytes':x.hex()}).encode());digest.update(b'\n');count+=1
        result[table]={'rows':count,'sha256':digest.hexdigest()}
    return result

def rehearse(source,destination):
    source=Path(source).resolve();destination=Path(destination).resolve()
    if not source.is_file() or destination.exists():raise ValueError('Source must exist and destination must be new')
    destination.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    fd=os.open(destination,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(fd)
    with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as original,sqlite3.connect(destination) as copy:
        original.backup(copy)
        if copy.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Source integrity check failed')
        before=snapshot(copy)
        required={'investigations','research_records','research_imports','research_import_runs'}
        if not required.issubset(before):raise ValueError('Not an existing Atlas foundation database')
        applied=[]
        for table,name in [('evidence_entities','0002_unified_evidence.sql'),('gene_catalog','0003_gene_catalog.sql')]:
            if table not in before:
                # Fixed repository SQL only. Execute a whole additive migration transactionally.
                copy.executescript('BEGIN;\n'+(ROOT/'drizzle'/name).read_text()+'\nCOMMIT;')
                applied.append(name)
        after=snapshot(copy)
        if any(after.get(t)!=v for t,v in before.items()):raise ValueError('Existing data changed during rehearsal')
        missing=copy.execute('SELECT count(*) FROM (SELECT id FROM research_records EXCEPT SELECT id FROM research_fts)').fetchone()[0]
        extra=copy.execute('SELECT count(*) FROM (SELECT id FROM research_fts EXCEPT SELECT id FROM research_records)').fetchone()[0]
        if missing or extra:raise ValueError('Search index membership mismatch')
        mismatch=copy.execute("SELECT count(*) FROM research_records r JOIN research_fts f ON f.id=r.id WHERE f.title IS NOT r.title OR f.abstract IS NOT r.abstract OR f.full_text IS NOT coalesce(r.full_text,'') OR f.document IS NOT r.document").fetchone()[0]
        duplicate=copy.execute('SELECT count(*) FROM research_fts').fetchone()[0]!=copy.execute('SELECT count(*) FROM research_records').fetchone()[0]
        if mismatch or duplicate:raise ValueError('Search index content mismatch')
        copy.execute("INSERT INTO research_fts(research_fts) VALUES('integrity-check')")
        copy.commit()
        integrity=copy.execute('PRAGMA integrity_check').fetchone()[0]
        if integrity!='ok' or list(copy.execute('PRAGMA foreign_key_check')):raise ValueError('Destination integrity failure')
        return {'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'applied':applied,'preservedTables':before,'searchIndexVerified':True,'integrity':integrity,'productionParityClaimed':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--destination',required=True);p.add_argument('--report',required=True)
    a=p.parse_args()
    if Path(a.report).exists():raise ValueError('Report must be new')
    result=rehearse(a.source,a.destination)
    fd=os.open(a.report,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:json.dump(result,f,indent=2)
    print(json.dumps({'applied':result['applied'],'preservedTables':len(result['preservedTables']),'integrity':result['integrity'],'searchIndexVerified':True}))
