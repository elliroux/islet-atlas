// Local-only scheduled-handler preview. The pinned Wrangler asset router does not
// forward simulated scheduled events, so omit assets in this temporary test config.
// Run the usual app preview separately to inspect the same local D1 data in the UI.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
delete config.assets;
config.main=resolve('dist/server/index.js');
await mkdir('work',{recursive:true});
await writeFile('work/catalog-scheduled.json',JSON.stringify(config));
const child=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','work/catalog-scheduled.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','8791','--inspector-port','0','--var','ATLAS_BACKGROUND_INGESTION:enabled'],{stdio:'inherit',env:{...process.env,CHOKIDAR_USEPOLLING:'1',WRANGLER_SEND_METRICS:'false'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??1});
