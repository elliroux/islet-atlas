import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {TestD1} from './helpers/d1.mjs';
globalThis.__evidenceEnv={ATLAS_AUTH_MODE:'public'};
globalThis.__reviewer=null;
registerHooks({resolve(s,c,next){
 if(s==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__evidenceEnv',shortCircuit:true};
 if(s.endsWith('/access-auth'))return {url:'data:text/javascript,export const getAccessUser=async()=>globalThis.__reviewer',shortCircuit:true};
 if(s.startsWith('.')&&!s.endsWith('.ts')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return next(u.href,c);}
 return next(s,c);
}});
const evidence=await import('../app/api/evidence/route.ts');
const review=await import('../app/api/evidence/review/route.ts');
const connections=await import('../app/api/connections/route.ts');
test('public evidence read is bounded, validates filters and fails visibly without D1',async()=>{
 globalThis.__evidenceEnv.DB=new TestD1();
 assert.equal((await evidence.GET(new Request('https://isletatlas.org/api/evidence?gene=IL2RA'))).status,200);
 assert.equal((await evidence.GET(new Request('https://isletatlas.org/api/evidence?gene=IL2RA&provider=arbitrary'))).status,400);
 assert.equal((await evidence.GET(new Request('https://isletatlas.org/api/evidence?gene=%22%20OR%201=1'))).status,400);
 globalThis.__evidenceEnv.DB.close();delete globalThis.__evidenceEnv.DB;
 assert.equal((await evidence.GET(new Request('https://isletatlas.org/api/evidence?gene=IL2RA'))).status,503);
});
test('forged identity and cross-origin requests cannot review or inject records',async()=>{
 const forged=new Request('https://isletatlas.org/api/evidence/review',{method:'POST',headers:{Origin:'https://isletatlas.org','oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.com'},body:'{}'});
 assert.equal((await review.POST(forged)).status,403);
 assert.equal((await connections.POST(new Request('https://isletatlas.org/api/connections',{method:'POST',body:'{"gene":"IL2RA"}'}))).status,403);
 assert.equal((await connections.POST(new Request('https://isletatlas.org/api/connections',{method:'POST',headers:{Origin:'https://isletatlas.org'},body:'{"gene":"IL2RA\" DELETE"}'}))).status,400);
});
test('review requires the exact current version; stores audit with reviewer identity',async()=>{
 const db=new TestD1();Object.assign(globalThis.__evidenceEnv,{DB:db,ATLAS_AUTH_MODE:'access',ATLAS_ACCESS_AI_OWNER_EMAIL:'owner@example.com'});globalThis.__reviewer={userId:'access:owner',email:'owner@example.com'};
 const a='assertion:'+'a'.repeat(64),v='version:'+'b'.repeat(64);
 db.db.prepare('INSERT INTO evidence_entities VALUES (?,?,?)').run('HGNC:1','fixture','gene');
 db.db.prepare('INSERT INTO evidence_assertions VALUES (?,?,?,?,?,?,?,?)').run(a,'HGNC:1','HGNC:1','related','fixture','unreviewed',v,'2026');
 db.db.prepare('INSERT INTO evidence_assertion_versions VALUES (?,?,?,?)').run(v,a,'{}','2026');
 const req=(body,origin='https://isletatlas.org')=>new Request('https://isletatlas.org/api/evidence/review',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});
 const body={assertion:a,version:v,decision:'reviewed',note:'Reviewed the original source locator, without asserting clinical efficacy.'};
 assert.equal((await review.POST(req(body,'https://attacker.example'))).status,403);
 assert.equal((await review.POST(req({...body,version:'version:'+'c'.repeat(64)}))).status,409);
 assert.equal(db.count('evidence_reviews'),0);assert.equal((await review.POST(req(body))).status,200);
 assert.equal(db.count('evidence_reviews'),1);assert.equal(db.db.prepare('SELECT review FROM evidence_assertions').get().review,'reviewed');db.close();
});
test('streamed oversized investigation body is rejected before parsing',async()=>{
 const response=await connections.POST(new Request('https://isletatlas.org/api/connections',{method:'POST',headers:{Origin:'https://isletatlas.org'},body:'x'.repeat(1001)}));
 assert.equal(response.status,413);
});

const catalog=await import('../app/api/genes/route.ts');
test('catalog read requires no gene, validates keyset filters and never starts ingestion',async()=>{
 const db=new TestD1();globalThis.__evidenceEnv.DB=db;
 try{
  const r=await catalog.GET(new Request('https://isletatlas.org/api/genes'));assert.equal(r.status,200);const data=await r.json();assert.equal(data.coverage.genes,0);assert.equal(data.coverage.lastComplete,null);assert.equal(db.count('gene_catalog_jobs'),0);
  assert.equal((await catalog.GET(new Request('https://isletatlas.org/api/genes?after=bad'))).status,400);
  assert.equal((await catalog.GET(new Request('https://isletatlas.org/api/genes?q=%25'))).status,400);
 }finally{db.close();delete globalThis.__evidenceEnv.DB}
 assert.equal((await catalog.GET(new Request('https://isletatlas.org/api/genes'))).status,503);
});
