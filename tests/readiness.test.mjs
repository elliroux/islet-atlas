import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {TestD1} from './helpers/d1.mjs';
globalThis.__readyEnv={ATLAS_AUTH_MODE:'access'};globalThis.__readyUser=null;
registerHooks({resolve(s,c,next){
 if(s==='cloudflare:workers')return {url:'data:text/javascript,export const env=globalThis.__readyEnv',shortCircuit:true};
 if(s.endsWith('/chatgpt-auth'))return {url:'data:text/javascript,export const getChatGPTUser=async()=>globalThis.__readyUser',shortCircuit:true};
 if(s.startsWith('.')&&!s.endsWith('.mjs')&&!s.endsWith('.ts')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return next(u.href,c)}return next(s,c);
}});
const notebook=await import('../app/api/notebook/route.ts');
const {requestJson,capture}=await import('../research/connectors/types.ts');
const {appOrigin}=await import('../lib/app-origin.ts');
const {stagingConfig}=await import('../scripts/prepare-staging.mjs');
const origin='https://islet-atlas-staging-review.test.workers.dev';
const entry={id:'notebook-1',revision:1,updated:'2026-11-08',original:'Synthetic investigation',nodes:[]};
const post=(d,from=origin)=>notebook.POST(new Request(origin+'/api/notebook',{method:'POST',headers:{Origin:from},body:JSON.stringify(d)}));
test('notebooks preserve ownership, conflict detection and prior content',async()=>{
 const db=new TestD1();globalThis.__readyEnv.DB=db;
 try{
  assert.equal((await notebook.GET()).status,401);assert.equal((await post(entry)).status,401);
  globalThis.__readyUser={userId:'access:one'};assert.equal((await post(entry)).status,200);
  assert.equal((await post({...entry,original:'Cross-origin write'},'https://evil.invalid')).status,403);
  assert.equal((await post({...entry,revision:3})).status,409);
  assert.equal((await post({...entry,revision:2,original:'Revised synthetic entry'})).status,200);
  globalThis.__readyUser={userId:'access:two'};assert.deepEqual(await (await notebook.GET()).json(),[]);
  assert.equal((await post(entry)).status,200);assert.equal(db.count('investigations'),2);
  globalThis.__readyUser={userId:'access:one'};const records=await (await notebook.GET()).json();assert.equal(records[0].revision,2);assert.equal(records[0].original,'Revised synthetic entry');
 }finally{db.close();globalThis.__readyUser=null;delete globalThis.__readyEnv.DB}
});
test('staging authentication uses an exact configured HTTPS origin and fails closed',()=>{
 assert.equal(appOrigin(),'https://isletatlas.org');assert.equal(appOrigin(origin),origin);
 for(const bad of ['','http://staging.example.org','https://evil@isletatlas.org','https://isletatlas.org/path','https://isletatlas.org?x=1','https://isletatlas.org:444'])assert.equal(appOrigin(bad),null);
 const args={name:'islet-atlas-staging-review',database:'11111111-2222-4333-8444-555555555555',origin,issuer:'https://test.cloudflareaccess.com',audience:'staging-only'};
 const config=stagingConfig(args);assert.equal(config.vars.ATLAS_BACKGROUND_INGESTION,'disabled');assert.deepEqual(config.triggers.crons,[]);assert.equal(config.vars.ATLAS_AUTH_MODE,'access');
 assert.throws(()=>stagingConfig({...args,database:'5d965dbc-66fd-422e-a5b7-594788a26702'}),/non-production/);
 assert.throws(()=>stagingConfig({...args,name:'islet-atlas'}),/distinct/);
 assert.throws(()=>stagingConfig({...args,origin:'https://isletatlas.org'}),/exact/);
});
test('provider cooldown is respected without a premature retry; transient retry is bounded',async()=>{
 for(const value of ['120',new Date(Date.now()+120000).toUTCString()]){
  let calls=0;await assert.rejects(()=>requestJson('https://provider.invalid',{},async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':value}})}),/cooldown/);assert.equal(calls,1);
 }
 let calls=0;const result=await requestJson('https://provider.invalid',{},async()=>{calls++;return calls===1?new Response('',{status:503}):Response.json({recovered:true})});assert.equal(calls,2);assert.equal(result.recovered,true);
 calls=0;await assert.rejects(()=>requestJson('https://provider.invalid',{},async()=>{calls++;throw new DOMException('Timeout','TimeoutError')}),/Timeout/);assert.equal(calls,1);
 const logs=[];assert.deepEqual(await capture('fixture','https://provider.invalid',{},1,async()=>[1,2],logs),[]);assert.equal(logs[0].status,'unavailable');
});
