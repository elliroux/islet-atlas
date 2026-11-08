import importlib.util,sqlite3,tempfile,unittest,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('rehearsal',ROOT/'scripts/rehearse-schema.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class SchemaRehearsal(unittest.TestCase):
 def test_pre_phase2_data_survives_and_backup_remains_untouched(self):
  with tempfile.TemporaryDirectory() as t:
   src=Path(t)/'before.sqlite';dest=Path(t)/'after.sqlite'
   with sqlite3.connect(src) as db:
    for name in ['0000_swift_phalanx.sql','0001_lovely_medusa.sql']:db.executescript((ROOT/'drizzle'/name).read_text())
    db.execute("INSERT INTO investigations VALUES('access:fixture','existing',7,'2026','private fixture')")
    db.execute("INSERT INTO research_imports VALUES('publications','keep-cursor','Importing',1000,500,'2026',NULL,'active-lease',9999999999999)")
    db.execute("INSERT INTO research_import_runs VALUES('existing-run','publications',100,'complete','keep detail','2026')")
    db.execute("INSERT INTO research_records VALUES('pubmed-1','Europe PMC','Publication','HLA-DQA1 fixture',2026,NULL,NULL,'https://example.invalid','retained abstract','CC BY','retained full body','Indexed body','{}','2026')")
   before=hashlib.sha256(src.read_bytes()).hexdigest();r=m.rehearse(src,dest)
   self.assertEqual(r['applied'],['0002_unified_evidence.sql','0003_gene_catalog.sql']);self.assertEqual(hashlib.sha256(src.read_bytes()).hexdigest(),before)
   self.assertEqual(r['preservedTables']['investigations']['rows'],1)
   with sqlite3.connect(dest) as db:
    self.assertEqual(db.execute("SELECT count(*) FROM research_fts WHERE research_fts MATCH 'HLA'").fetchone()[0],1)
    self.assertEqual(db.execute('SELECT cursor FROM research_imports').fetchone()[0],'keep-cursor')
   with self.assertRaises(ValueError):m.rehearse(src,dest)
   self.assertEqual(m.rehearse(dest,Path(t)/'again.sqlite')['applied'],[])
