import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {TestD1} from './helpers/d1.mjs';
registerHooks({resolve(s,c,next){if(s.startsWith('.')&&!s.endsWith('.mjs')&&!s.endsWith('.ts')&&c.parentURL?.startsWith('file:')){const url=new URL(s+'.ts',c.parentURL);if(existsSync(url))return next(url.href,c)}return next(s,c)}});
const {catalogTick,catalogPage,catalogQuery,browseCatalog}=await import('../research/catalog/catalog.ts');
const {parseLinks}=await import('../research/connectors/pankgraph.ts');
const member={id:'ENSG00000134460',symbol:'IL2RA',predicates:['effector_gene_of'],sources:['Fixture predicted effector genes']};
function fixture(rows=[member],{partial=false,mismatch=false}={}){return async(url,init)=>{
 if(String(url).includes('execute-api')){const q=JSON.parse(init.body).query;
  if(q.includes('collect(DISTINCT'))return Response.json({records:rows});
  if(q.includes('AS gene'))return Response.json({records:[{gene:{id:mismatch?'ENSG99999999999':member.id}}]});
  return Response.json({records:[{source:{id:member.id,name:'IL2RA'},destination:{id:'MONDO_0005147',name:'T1D'},target:{id:'MONDO_0005147'},predicate:'effector_gene_of',evidence:{data_source:member.sources[0]},sourceLabels:['gene'],destinationLabels:['disease']}]});
 }
 if(String(url).includes('arax'))return partial?new Response('failure',{status:403}):Response.json({status:'Success',message:{results:[]}});
 if(String(url).includes('europepmc'))return Response.json({resultList:{result:[]}});
 return Response.json({studies:[]});
}}
const epoch=Date.parse('2026-11-08T00:00:00Z');
test('catalog scans, enriches without a typed gene, persists evidence, and is idempotent',async()=>{
 const db=new TestD1();try{
  const result=await catalogTick(db,fixture(),epoch);assert.equal(result.enriched,'IL2RA');
  const view=await browseCatalog(db);assert.equal(view.coverage.genes,1);assert.equal(view.genes[0].status,'updated');assert.equal(view.coverage.lastComplete,new Date(epoch).toISOString());
  assert.equal(db.count('evidence_assertions'),1);assert.match(db.db.prepare('SELECT document FROM evidence_assertion_versions').get().document,/computational_inference/);
  await catalogTick(db,fixture(),epoch+1000);assert.equal(db.count('evidence_runs'),1);
  await catalogTick(db,fixture(),epoch+31*86400000);assert.equal(db.count('gene_catalog'),1);assert.equal(db.count('gene_catalog_versions'),1);assert.equal(db.count('evidence_assertions'),1);
  assert.equal((await browseCatalog(db,'','HLA')).genes.length,0);
 }finally{db.close()}
});
test('checkpoint advances only with atomic catalog writes; full pages resume by stable ID',async()=>{
 const db=new TestD1();try{
  const rows=Array.from({length:50},(_,i)=>({...member,id:'ENSG'+String(i+1).padStart(11,'0'),symbol:'GENE'+i}));
  await catalogTick(db,fixture(rows,{mismatch:true}),epoch);
  assert.equal(db.count('gene_catalog'),50);assert.equal(db.db.prepare('SELECT cursor FROM gene_catalog_jobs').get().cursor,rows.at(-1).id);
  let query='';const f=async(u,i)=>{query=JSON.parse(i.body).query;return Response.json({records:[]})};
  // Make existing genes ineligible so this call only scans the next page.
  db.db.exec('UPDATE gene_catalog SET next_attempt=9999999999999');
  await catalogTick(db,f,epoch+1000);assert(query.includes('g.id > "'+rows.at(-1).id+'"'));assert.equal((await browseCatalog(db)).coverage.scanInProgress,false);
  const view=await browseCatalog(db);assert.equal(view.genes.length,40);assert.equal((await browseCatalog(db,view.next)).genes.length,10);
 }finally{db.close()}
 const db2=new TestD1();try{db2.failAt=1;await catalogTick(db2,fixture(),epoch);assert.equal(db2.count('gene_catalog'),0);assert.equal(db2.db.prepare('SELECT cursor FROM gene_catalog_jobs').get().cursor,'');assert((await browseCatalog(db2)).coverage.error);
 delete db2.failAt;await catalogTick(db2,fixture(),epoch+3600001);assert.equal(db2.count('gene_catalog'),1);
 }finally{db2.close()}
});
test('partial providers retain evidence and retry; resolver mismatch never attaches wrong evidence',async()=>{
 const db=new TestD1();try{
  await catalogTick(db,fixture(),epoch);const old=(await browseCatalog(db)).genes[0].last_success;
  await catalogTick(db,fixture([member],{partial:true}),epoch+31*86400000);
  const row=(await browseCatalog(db)).genes[0];assert.equal(row.status,'partial');assert.equal(row.last_success,old);assert.equal(db.count('evidence_assertions'),1);assert(row.detail.some(d=>d.status==='unavailable'));
  await catalogTick(db,fixture([member],{mismatch:true}),epoch+32*86400000);assert.equal((await browseCatalog(db)).genes[0].status,'failed');assert.equal(db.count('evidence_assertions'),1);
 }finally{db.close()}
});
test('lease prevents duplicate work, removed memberships retained, and malformed pages rejected',async()=>{
 const db=new TestD1();try{
  await catalogTick(db,fixture(),epoch);db.db.exec("UPDATE gene_catalog_jobs SET lease='other',lease_until=9999999999999");
  assert.equal((await catalogTick(db,()=>{throw Error('must not fetch')},epoch+1)).status,'busy');
  db.db.exec('UPDATE gene_catalog_jobs SET lease_until=0');await catalogTick(db,fixture([]),epoch+8*86400000);assert.equal(db.count('gene_catalog'),1);
  await assert.rejects(()=>catalogPage('',fixture([{...member,id:'bad'}])),/identifier/);
  await assert.rejects(()=>catalogPage(member.id,fixture()),/identifier/);
  assert.throws(()=>catalogQuery('" injection'),/cursor/);
 }finally{db.close()}
});

test('throttled enumeration retains checkpoint, backs off, and recovers without duplicate records',async()=>{
 const db=new TestD1();let calls=0;try{
  await catalogTick(db,async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'120'}})},epoch);
  assert.equal(calls,1);assert.equal(db.count('gene_catalog'),0);
  const failed=db.db.prepare('SELECT * FROM gene_catalog_jobs').get();assert.equal(failed.cursor,'');assert.equal(failed.lease_until,0);assert(failed.error);
  await catalogTick(db,()=>{throw Error('must respect backoff')},epoch+1000);assert.equal(db.count('gene_catalog'),0);
  await catalogTick(db,fixture(),epoch+3600001);assert.equal(db.count('gene_catalog'),1);assert.equal(db.count('evidence_assertions'),1);assert.equal((await browseCatalog(db)).coverage.error,null);
 }finally{db.close()}
});
test('partial enrichment recovers after cooldown and crash-expired leases permit safe resumption',async()=>{
 const db=new TestD1();try{
  await catalogTick(db,fixture([member],{partial:true}),epoch);
  assert.equal((await browseCatalog(db)).genes[0].status,'partial');
  const count=db.count('evidence_runs');await catalogTick(db,()=>{throw Error('early retry')},epoch+1000);assert.equal(db.count('evidence_runs'),count);
  db.db.exec(`UPDATE gene_catalog_jobs SET lease='simulated-crash',lease_until=${epoch+2000}`);
  await catalogTick(db,fixture(),epoch+6*3600000+1);
  assert.equal((await browseCatalog(db)).genes[0].status,'updated');assert.equal(db.count('evidence_assertions'),1);assert.equal(db.db.prepare('SELECT lease_until FROM gene_catalog_jobs').get().lease_until,0);
 }finally{db.close()}
});
