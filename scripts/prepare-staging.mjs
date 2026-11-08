// Generate a separate, ignored staging config; never rewrite production configuration.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
const PRODUCTION_DB='5d965dbc-66fd-422e-a5b7-594788a26702';
export function stagingConfig({name,database,origin,issuer,audience}) {
  if(!/^islet-atlas-staging-[a-z0-9-]+$/.test(name||''))throw Error('Use a distinct islet-atlas-staging-* Worker name');
  if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(database||'')||database===PRODUCTION_DB||database==='00000000-0000-4000-8000-000000000000')throw Error('A real, non-production D1 ID is required');
  const u=new URL(origin);
  if(u.protocol!=='https:'||u.hostname==='isletatlas.org'||u.hostname.endsWith('.isletatlas.org')||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash||!u.hostname.startsWith(name+'.')||!u.hostname.endsWith('.workers.dev'))throw Error('Use this staging Worker’s exact workers.dev origin');
  if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer||'')||!audience)throw Error('Configure a separate staging Access application first');
  return {name,main:resolve('worker/index.ts'),compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],workers_dev:true,keep_vars:false,
    vars:{ATLAS_AUTH_MODE:'access',ATLAS_APP_ORIGIN:u.origin,ATLAS_ACCESS_ISSUER:issuer,ATLAS_ACCESS_AUDIENCE:audience,ATLAS_BACKGROUND_INGESTION:'disabled'},
    d1_databases:[{binding:'DB',database_name:name+'-db',database_id:database,migrations_dir:resolve('drizzle')}],triggers:{crons:[]}};
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const {values}=parseArgs({options:Object.fromEntries(['name','database','origin','issuer','audience'].map(k=>[k,{type:'string'}]))});
 const config=stagingConfig(values);await mkdir('work/staging',{recursive:true,mode:0o700});
 await writeFile('work/staging/wrangler.json',JSON.stringify(config,null,2),{flag:'wx',mode:0o600});
 console.log('Created work/staging/wrangler.json. No deployment, migration or schedule activation performed.');
}
