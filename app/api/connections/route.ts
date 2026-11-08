import {limitedText} from "../../../lib/http-body";
import {env} from "cloudflare:workers";
import {persistRun} from "../../../research/evidence/store";
import {z} from "zod";
import {investigateConnections} from "../../../research/connectors/investigation";
import type {ConnectedRun} from "../../../research/connectors/types";
export const dynamic="force-dynamic";
// Small per-isolate cache/coalescer; public biological terms only, never personal data.
const cache=new Map<string,{expires:number;run:ConnectedRun}>();
const pending=new Map<string,Promise<ConnectedRun>>();
const schema=z.object({gene:z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9-]{0,24}$/),candidate:z.string().trim().min(1).max(100).regex(/^[\p{L}\p{N} .,+()'/-]+$/u).optional()});
async function collect(gene:string,candidate?:string):Promise<ConnectedRun>{
 const run=await investigateConnections(gene,candidate);
 try{if(!env.DB)throw Error("Database unavailable");run.persistence=await persistRun(env.DB,run)}
 catch{run.persistence={status:"unavailable",notice:"Live results were retrieved, but could not be saved. Export this run and retry; existing evidence is unchanged."};console.error("evidence_ingestion_failed",{runId:run.id,gene:run.gene});}
 return run;
}
export async function POST(req:Request){
 if(req.headers.get("Origin")!==new URL(req.url).origin)return Response.json({error:"Origin mismatch"},{status:403});
 const raw=await limitedText(req,1000);if(raw===null)return Response.json({error:"Request too large"},{status:413});
 let input;try{input=schema.safeParse(JSON.parse(raw))}catch{return Response.json({error:"Invalid JSON"},{status:400})}
 if(!input.success)return Response.json({error:"Enter a valid gene symbol, such as IL2RA."},{status:400});
 const key=JSON.stringify(input.data),now=Date.now();
 for(const [k,v] of cache)if(v.expires<now)cache.delete(k);
 const cached=cache.get(key);if(cached)return Response.json(cached.run,{headers:{"Cache-Control":"no-store"}});
 if(!pending.has(key)&&pending.size>=4)return Response.json({error:"Research services are busy. Please retry shortly."},{status:429,headers:{"Retry-After":"30"}});
 if(!pending.has(key))pending.set(key,collect(input.data.gene,input.data.candidate));
 try{const run=await pending.get(key)!;if(cache.size>=30)cache.delete(cache.keys().next().value!);if(run.persistence?.status==="saved"&&run.queries.every(q=>q.status!=="unavailable"))cache.set(key,{expires:now+300000,run});return Response.json(run,{headers:{"Cache-Control":"no-store"}})}finally{pending.delete(key)}
}
