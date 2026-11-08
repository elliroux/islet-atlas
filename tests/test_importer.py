import importlib.util
from pathlib import Path
import io
import json
import unittest
import urllib.error
spec=importlib.util.spec_from_file_location('updater',Path(__file__).resolve().parent.parent/'scripts/update-research.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ImporterTests(unittest.TestCase):
    def test_bounded_retry_preserves_same_source_and_target(self):
        calls=[]
        def opener(req,**kw):
            calls.append(req)
            if len(calls)==1:raise urllib.error.HTTPError(req.full_url,503,'Unavailable',{},None)
            return io.BytesIO(json.dumps({'count':100,'complete':True}).encode())
        self.assertTrue(m.update('publications',2,m.CLOUDFLARE,{},opener=opener,sleep=lambda _:None))
        self.assertEqual(len(calls),2);self.assertEqual(calls[0].data,calls[1].data)
        self.assertEqual(calls[0].full_url,'https://isletatlas.org/api/research')
    def test_failures_are_reported_without_advancing_local_checkpoint(self):
        def opener(req,**kw):raise urllib.error.HTTPError(req.full_url,403,'Forbidden',{},None)
        self.assertFalse(m.update('publications',50,m.LEGACY,{},opener=opener,sleep=lambda _:None))
if __name__=='__main__':unittest.main()
