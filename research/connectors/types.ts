export type QueryLog = {provider:string;endpoint:string;request:unknown;retrievedAt:string;status:"complete"|"empty"|"unavailable";count:number;limit:number;note:string};
export type GraphLink = {id:string;subject:string;predicate:string;object:string;kind:"Graph association"|"Provider assertion"|"Computational inference";properties:Record<string,unknown>;sources:string[];publications:string[];urls:string[]};
export type Candidate = {id:string;name:string;links:GraphLink[]};
export type EvidenceRecord = {id:string;title:string;url:string;provider:string;kind:"Publication"|"Trial registration";year:string;publicationTypes?:string[];status?:string;whyStopped?:string;population?:string;phase?:string;hasResults?:boolean;linkedPublications?:string[]};
export type ConnectedRun = {version:1;id:string;date:string;gene:string;geneId?:string;candidate?:string;question:string;links:GraphLink[];candidates:Candidate[];evidence:EvidenceRecord[];queries:QueryLog[];gaps:string[]};
export type Fetcher=typeof fetch;
export function safeUrl(value:unknown):string|undefined {if(typeof value!=="string")return;try{const u=new URL(value);if(u.protocol==="https:"||u.protocol==="http:")return u.href}catch{}}
export function text(value:unknown,max=600):string{return typeof value==="string"?value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,max):""}
export function strings(value:unknown):string[]{return Array.isArray(value)?value.filter((v):v is string=>typeof v==="string"):typeof value==="string"?[value]:[]}
export async function requestJson(url:string,init:RequestInit={},fetcher:Fetcher=fetch):Promise<any>{
 const r=await fetcher(url,{...init,signal:AbortSignal.timeout(45000),headers:{Accept:"application/json","Content-Type":"application/json",...init.headers}});
 if(!r.ok)throw Error("Provider returned HTTP "+r.status);
 // Bound provider payloads before parsing, including streamed responses without Content-Length.
 const reader=r.body?.getReader();if(!reader)throw Error("Empty provider response");
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>12_000_000)throw Error("Provider response exceeds size limit");chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 return JSON.parse(new TextDecoder().decode(bytes));
}
export async function capture<T>(provider:string,endpoint:string,request:unknown,limit:number,fn:()=>Promise<T[]>,queries:QueryLog[]):Promise<T[]>{
 const log:QueryLog={provider,endpoint,request,retrievedAt:new Date().toISOString(),status:"complete",count:0,limit,note:"Bounded retrieval; no result is not evidence of absence."};
 try{const records=await fn();log.count=records.length;log.status=records.length?"complete":"empty";return records}catch(e){log.status="unavailable";log.note=e instanceof Error?e.message:"Provider unavailable";return []}finally{queries.push(log)}
}
