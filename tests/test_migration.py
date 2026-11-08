import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import io
import urllib.error
from unittest.mock import patch
import unittest

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('migration',ROOT/'scripts/migrate-research.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.p=Path(self.tmp.name)
        for name in ['source','destination']:
            with sqlite3.connect(self.p/(name+'.sqlite')) as db:
                for migration in sorted((ROOT/'drizzle').glob('*.sql')):db.executescript(migration.read_text())
                db.execute("INSERT INTO research_imports VALUES('publications',?,'Importing',100,1,'2026-11-07',NULL,NULL,0)",(name+'-cursor',))
                db.execute("INSERT INTO investigations VALUES('private-owner','private-notebook',1,'2026','PRIVATE')")
        self.source=self.p/'source.sqlite';self.dest=self.p/'destination.sqlite'
        with sqlite3.connect(self.source) as db:
            for i in range(30):self.record(db,'pubmed-'+str(i),'source title '+str(i),"' quoted \n content "+('x'*200000 if i==0 else ''))
        with sqlite3.connect(self.dest) as db:self.record(db,'pubmed-1','destination annotation','keep body')
    def tearDown(self):self.tmp.cleanup()
    def record(self,db,id,title,body):
        db.execute('INSERT INTO research_records VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(id,'Europe PMC','Publication',title,2026,None,None,'https://pubmed.ncbi.nlm.nih.gov/'+id[7:]+'/','abstract','CC BY',body,'Indexed body','{}','2026-11-07'))
    def test_idempotent_resume_preserves_conflicts_cursors_and_private_data(self):
        manifest=m.plan(self.source,self.dest,self.p/'plan');self.assertEqual(len(manifest['report']['missingIds']),29)
        self.assertEqual(manifest['report']['conflictingIds'],['pubmed-1'])
        with self.assertRaises(RuntimeError):m.apply_local(self.p/'plan',self.dest,self.p/'backup1.sqlite',fail_batch=1)
        with sqlite3.connect(self.dest) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM research_migration_batches').fetchone()[0],1)
        result=m.apply_local(self.p/'plan',self.dest,self.p/'backup2.sqlite')
        self.assertTrue(result['preservationVerified']);self.assertFalse(result['parityVerified'])
        self.assertEqual(result['conflictingIds'],['pubmed-1'])
        with sqlite3.connect(self.dest) as db:
            before=db.execute('SELECT count(*) FROM research_migration_rows').fetchone()[0]
            self.assertEqual(db.execute('SELECT count(*) FROM research_records').fetchone()[0],30)
            self.assertEqual(db.execute('SELECT cursor FROM research_imports').fetchone()[0],'destination-cursor')
            self.assertEqual(db.execute("SELECT full_text FROM research_records WHERE id='pubmed-1'").fetchone()[0],'keep body')
            self.assertEqual(db.execute('SELECT count(*) FROM investigations').fetchone()[0],1)
            self.assertEqual(db.execute("SELECT count(*) FROM research_migration_rows WHERE table_name='investigations'").fetchone()[0],0)
            self.assertEqual(db.execute("SELECT count(*) FROM research_fts WHERE research_fts MATCH 'source'").fetchone()[0],29)
        m.apply_local(self.p/'plan',self.dest,self.p/'backup3.sqlite')
        with sqlite3.connect(self.dest) as db:self.assertEqual(db.execute('SELECT count(*) FROM research_migration_rows').fetchone()[0],before)
        with self.assertRaises(ValueError):m.apply_local(self.p/'plan',self.dest,self.p/'backup3.sqlite')
    def test_corrupt_plan_rejected_before_writes(self):
        m.plan(self.source,self.dest,self.p/'plan');batch=self.p/'plan/batch-000000.json';batch.write_text('[]')
        with self.assertRaisesRegex(ValueError,'checksum'):m.apply_local(self.p/'plan',self.dest,self.p/'backup.sqlite')
        self.assertFalse((self.p/'backup.sqlite').exists())
    def test_schema_drift_fails_closed(self):
        with sqlite3.connect(self.source) as db:db.execute('ALTER TABLE research_records ADD COLUMN extra TEXT')
        with self.assertRaisesRegex(ValueError,'Schema mismatch'):m.plan(self.source,self.dest,self.p/'plan')
    def test_refresh_archives_previous_record(self):
        with sqlite3.connect(self.dest) as db:
            db.execute("UPDATE research_records SET title='new title' WHERE id='pubmed-1'")
            old=json.loads(db.execute('SELECT document FROM research_record_history').fetchone()[0]);self.assertEqual(old['title'],'destination annotation');self.assertEqual(old['full_text'],'keep body')
    def test_remote_transport_retries_transient_failure_without_changing_batch(self):
        calls=[]
        def opener(request,**kwargs):
            calls.append(request)
            if len(calls)==1:raise urllib.error.HTTPError(request.full_url,503,'Unavailable',{},None)
            return io.BytesIO(b'{"success":true,"result":[{"success":true,"results":[]}]}')
        with patch.object(m.urllib.request,'urlopen',opener),patch.object(m.time,'sleep',lambda _:None):
            result=m.remote_request('a'*32,'b'*36,'test-secret',{'batch':[{'sql':'SELECT 1','params':[]}]})
        self.assertTrue(result[0]['success']);self.assertEqual(calls[0].data,calls[1].data)
        self.assertEqual(calls[0].headers['Authorization'],'Bearer test-secret')
    def test_remote_requires_explicit_approval(self):
        with self.assertRaisesRegex(ValueError,'approval'):m.apply_remote('unused','unused','unused',False)

if __name__=='__main__':unittest.main()
