import {env} from "cloudflare:workers";
import {data} from "./data";
import type {CrossSource} from "./cross-field";

export const collections = [
  {id:"publications",name:"T1D publications",description:"PubMed-indexed publications through Europe PMC. Abstracts, identifiers, subjects and source links.",query:'SRC:MED AND ("type 1 diabetes" OR "type I diabetes" OR "insulin-dependent diabetes" OR "Diabetes Mellitus, Type 1")'},
  {id:"recent",name:"Recently indexed publications",description:"Newly indexed T1D search matches from the past 30 days, collected while the historical import continues.",query:"T1D publication query with a 30-day first-index-date window"},
  {id:"trials",name:"T1D clinical trials",description:"Registered studies, eligibility, interventions, outcomes, status and posted aggregate results.",query:'Type 1 Diabetes'},
  {id:"atlas",name:"Reviewed Atlas findings",description:"The existing curated findings, with their source locations and evidence limitations.",query:"Reviewed Atlas edition"},
  {id:"fulltext",name:"Open full text",description:"Article bodies with an explicit CC BY or CC0 reuse license. Source XML remains linked.",query:"Eligible indexed publications"}
] as const;
export type CollectionId=typeof collections[number]["id"];
export type StoredRecord={id:string;provider:string;kind:string;title:string;year:number;doi:string|null;pmcid:string|null;url:string;abstract:string;license:string|null;full_text:string|null;full_text_status:string;document:string;updated:string};
type ImportState={id:string;cursor:string;state:string;total:number;processed:number;updated:string;error:string|null;lease:string|null;lease_until:number};
export function plain(value:string=""){return value.replace(/<[^>]*>/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/\s+/g," ").trim()}
export function reusable(license:string=""){return /^(cc[ -]by(?:[ -]\d(?:\.\d)?)?|cc0|public domain)$/i.test(license.trim())}
function db(){if(!env.DB)throw Error("Research database unavailable");return env.DB}
async function json(url:string){
 const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error("Provider returned HTTP "+response.status);
 return response.json() as Promise<any>;
}
export function publicationRecord(s:any):StoredRecord {
 if(!/^\d+$/.test(s.id)||typeof s.title!=="string")throw Error("Invalid publication record");
 return {id:"pubmed-"+s.id,provider:"Europe PMC",kind:"Publication",title:plain(s.title),year:Number(s.pubYear)||0,doi:s.doi?.toLowerCase()||null,pmcid:s.pmcid||null,url:"https://pubmed.ncbi.nlm.nih.gov/"+s.id+"/",abstract:plain(s.abstractText||""),license:s.license||null,full_text:null,
 full_text_status:s.pmcid&&s.isOpenAccess==="Y"&&reusable(s.license)?"Eligible":"Source link available",
 document:JSON.stringify({authors:s.authorString,publicationTypes:s.pubTypeList?.pubType||[],subjects:s.meshHeadingList?.meshHeading||[],keywords:s.keywordList?.keyword||[],grants:s.grantsList?.grant||[],fullTextLinks:s.fullTextUrlList?.fullTextUrl||[],firstPublicationDate:s.firstPublicationDate,sourceUpdated:s.dateOfRevision,provenance:"Europe PMC core record",evidenceStatus:"Indexed source; interpretation unreviewed"}),updated:new Date().toISOString()};
}
export function trialRecord(s:any):StoredRecord{
 const p=s.protocolSection,id=p?.identificationModule?.nctId;
 if(!/^NCT\d{8}$/.test(id))throw Error("Invalid trial record");
 const publicData={status:p.statusModule,design:p.designModule,eligibility:p.eligibilityModule,interventions:p.armsInterventionsModule,outcomes:p.outcomesModule,references:p.referencesModule,results:s.resultsSection||null,hasResults:!!s.hasResults,evidenceStatus:"Registry report; interpretation unreviewed"};
 return {id:"trial-"+id,provider:"ClinicalTrials.gov",kind:"Trial",title:p.identificationModule.briefTitle,year:Number(p.statusModule.studyFirstPostDateStruct?.date?.slice(0,4))||0,doi:null,pmcid:null,url:"https://clinicaltrials.gov/study/"+id,abstract:plain(p.descriptionModule?.briefSummary||""),license:null,full_text:null,full_text_status:s.hasResults?"Posted aggregate results":"Protocol available",document:JSON.stringify(publicData),updated:new Date().toISOString()};
}
function upsert(record:StoredRecord){
 return db().prepare("INSERT INTO research_records(id,provider,kind,title,year,doi,pmcid,url,abstract,license,full_text,full_text_status,document,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,year=excluded.year,doi=coalesce(excluded.doi,research_records.doi),pmcid=coalesce(excluded.pmcid,research_records.pmcid),abstract=excluded.abstract,license=coalesce(excluded.license,research_records.license),full_text_status=CASE WHEN research_records.full_text IS NOT NULL THEN research_records.full_text_status ELSE excluded.full_text_status END,document=excluded.document,updated=excluded.updated")
 .bind(record.id,record.provider,record.kind,record.title,record.year,record.doi,record.pmcid,record.url,record.abstract,record.license,record.full_text,record.full_text_status,record.document,record.updated);
}
async function init(id:CollectionId){
 await db().prepare("INSERT OR IGNORE INTO research_imports(id,cursor,state,total,processed,updated,lease_until) VALUES (?,'*','Ready',0,0,?,0)").bind(id,new Date().toISOString()).run();
}
async function loadPage(id:CollectionId,cursor:string){
 if(id==="publications"||id==="recent"){
  const window=id==="recent"?" AND FIRST_IDATE:["+new Date(Date.now()-30*86400000).toISOString().slice(0,10)+" TO "+new Date().toISOString().slice(0,10)+"]":"";
  const query=collections[0].query+window+" sort_date:y";
  const r=await json("https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=100&cursorMark="+encodeURIComponent(cursor)+"&query="+encodeURIComponent(query));
  if(!Array.isArray(r.resultList?.result)||!Number.isFinite(r.hitCount))throw Error("Invalid Europe PMC page");
  const next=r.nextCursorMark&&r.nextCursorMark!==cursor?r.nextCursorMark:"";
  return {records:r.resultList.result.map(publicationRecord),next,total:r.hitCount};
 }
 if(id==="trials"){
  const r=await json("https://clinicaltrials.gov/api/v2/studies?pageSize=100&countTotal=true&query.cond=Type%201%20Diabetes"+(cursor==="*"?"":"&pageToken="+encodeURIComponent(cursor)));
  if(!Array.isArray(r.studies))throw Error("Invalid ClinicalTrials.gov page");
  return {records:r.studies.map(trialRecord),next:r.nextPageToken||"",total:r.totalCount||0};
 }
 const records:StoredRecord[]=data.findings.map(f=>({id:"atlas-"+f.id,provider:"Atlas",kind:"Reviewed finding",title:f.title,year:0,doi:null,pmcid:null,url:f.url,abstract:f.summary+" "+f.effect,license:null,full_text:null,full_text_status:"Reviewed source locator",document:JSON.stringify(f),updated:new Date().toISOString()}));
 return {records,next:"",total:records.length};
}
async function importText(){
 const rows=await db().prepare("SELECT * FROM research_records WHERE full_text_status='Eligible' OR (full_text_status='Retry full text' AND updated<?) ORDER BY updated DESC LIMIT 3").bind(new Date(Date.now()-3600000).toISOString()).all<StoredRecord>();
 const statements:D1PreparedStatement[]=[];
 for(const row of rows.results){
  if(!row.pmcid||!/^PMC\d+$/.test(row.pmcid)||!reusable(row.license||""))continue;
  try{
  const response=await fetch("https://www.ebi.ac.uk/europepmc/webservices/rest/"+row.pmcid+"/fullTextXML",{signal:AbortSignal.timeout(20000)});
  if(response.status===404){statements.push(db().prepare("UPDATE research_records SET full_text_status='Full text unavailable' WHERE id=?").bind(row.id));continue}
  if(!response.ok)throw Error("Full-text provider returned HTTP "+response.status);
  const xml=await response.text();
  const body=xml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/)?.[1];
  if(!body){statements.push(db().prepare("UPDATE research_records SET full_text_status='Body unavailable' WHERE id=?").bind(row.id));continue}
  const text=plain(body);
  const bounded=text.slice(0,250000);
  statements.push(db().prepare("UPDATE research_records SET full_text=?,full_text_status=?,updated=? WHERE id=?").bind(bounded,text.length>bounded.length?"Indexed body (truncated)":"Indexed body",new Date().toISOString(),row.id));
  }catch{
   statements.push(db().prepare("UPDATE research_records SET full_text_status='Retry full text',updated=? WHERE id=?").bind(new Date().toISOString(),row.id));
  }
 }
 return {statements,count:rows.results.length};
}
export async function importBatch(id:CollectionId){
 await init(id);
 const token=crypto.randomUUID(),now=Date.now(),date=new Date(now).toISOString();
 const claimed=await db().prepare("UPDATE research_imports SET lease=?,lease_until=? WHERE id=? AND lease_until<?").bind(token,now+120000,id,now).run();
 if(!claimed.meta.changes)return {busy:true,message:"An import is already running. Retry shortly."};
 try{
  const state=await db().prepare("SELECT * FROM research_imports WHERE id=?").bind(id).first<ImportState>();
  if(!state)throw Error("Import checkpoint unavailable");
  // Completed scans may refresh daily. Interrupted scans always resume their checkpoint.
  if(state.state==="Complete"&&Date.now()-Date.parse(state.updated)<86400000){
   await db().prepare("UPDATE research_imports SET lease=NULL,lease_until=0 WHERE id=? AND lease=?").bind(id,token).run();
   return {complete:true,count:0,message:"Collection scan complete. A fresh scan becomes available after 24 hours."};
  }
  if(id==="fulltext"){
   const page=await importText();
   await db().batch([...page.statements,db().prepare("UPDATE research_imports SET state='Ready',processed=processed+?,updated=?,error=NULL,lease=NULL,lease_until=0 WHERE id=? AND lease=?").bind(page.count,date,id,token),db().prepare("INSERT INTO research_import_runs VALUES (?,?,?,?,?,?)").bind(token,id,page.count,"Succeeded","Eligible article bodies",date)]);
   return {count:page.count,complete:page.count===0};
  }
  const cursor=state.state==="Complete"?"*":state.cursor;
  const page=await loadPage(id,cursor);
  const processed=(cursor==="*"?0:state.processed)+page.records.length;
  await db().batch([...page.records.map(upsert),db().prepare("UPDATE research_imports SET cursor=?,state=?,total=?,processed=?,updated=?,error=NULL,lease=NULL,lease_until=0 WHERE id=? AND lease=?").bind(page.next||"*",page.next?"Importing":"Complete",page.total,processed,date,id,token),db().prepare("INSERT INTO research_import_runs VALUES (?,?,?,?,?,?)").bind(token,id,page.records.length,"Succeeded","Saved records and checkpoint together",date)]);
  return {count:page.records.length,processed,total:page.total,complete:!page.next};
 }catch(error){
  const message=error instanceof Error?error.message:"Import failed";
  await db().batch([db().prepare("UPDATE research_imports SET state='Retry available',error=?,lease=NULL,lease_until=? WHERE id=? AND lease=?").bind(message,Date.now()+10000,id,token),db().prepare("INSERT INTO research_import_runs VALUES (?,?,?,?,?,?)").bind(token,id,0,"Failed",message,date)]);
  throw error;
 }
}
export function matchQuery(query:string){
 return (query.match(/[\p{L}\p{N}-]+/gu)||[]).filter(t=>!new Set(["what","how","could","the","and","for","with","from","that","this","does","can","are","help"]).has(t.toLowerCase())).slice(0,16).map(t=>'"'+t+'"').join(" OR ");
}
export async function searchRecords(query:string,limit=30,offset=0,kind=""){
 const match=matchQuery(query),filter=kind?" AND r.kind=?":"";
 const base=match?" FROM research_fts f JOIN research_records r ON r.id=f.id WHERE research_fts MATCH ?":" FROM research_records r WHERE 1=1";
 const values: (string|number)[]=match?[match]:[];
 if(kind)values.push(kind);
 const rows=await db().prepare("SELECT r.id,r.provider,r.kind,r.title,r.year,r.url,r.doi,r.pmcid,r.full_text_status,r.updated"+base+filter+(match?" ORDER BY bm25(research_fts)":" ORDER BY r.updated DESC")+" LIMIT ? OFFSET ?").bind(...values,limit,offset).all();
 const count=await db().prepare("SELECT count(*) AS count"+base+filter).bind(...values).first<{count:number}>();
 return {records:rows.results,total:count?.count||0};
}
export async function coverage(){
 const [counts,imports,runs]=await Promise.all([
  db().prepare("SELECT provider,kind,count(*) AS count,sum(CASE WHEN length(abstract)>0 THEN 1 ELSE 0 END) AS withAbstract,sum(CASE WHEN full_text IS NOT NULL THEN 1 ELSE 0 END) AS withFullText,sum(CASE WHEN full_text_status='Eligible' THEN 1 ELSE 0 END) AS eligibleFullText FROM research_records GROUP BY provider,kind").all(),
  db().prepare("SELECT id,state,total,processed,updated,error FROM research_imports").all(),
  db().prepare("SELECT * FROM research_import_runs ORDER BY created DESC LIMIT 12").all()
 ]);
 return {counts:counts.results,imports:imports.results,runs:runs.results,collections};
}
export async function recordDetail(id:string){
 const row=await db().prepare("SELECT * FROM research_records WHERE id=?").bind(id).first<StoredRecord>();
 if(!row)return null;
 const document=JSON.parse(row.document);
 const links:string[]=(document.references?.references||[]).flatMap((r:{pmid?:string})=>r.pmid?["pubmed-"+r.pmid]:[]);
 const linked=links.length?await db().prepare("SELECT id,title,url FROM research_records WHERE id IN ("+links.map(()=>"?").join(",")+")").bind(...links).all():{results:[]};
 return {...row,document,abstract:undefined,full_text:undefined,abstractAvailable:!!row.abstract,fullTextCharacters:row.full_text?.length||0,linkedRecords:linked.results};
}
export async function rememberSources(sources:CrossSource[]){
 const ids=[...new Set(sources.filter(s=>/^pubmed-\d+$/.test(s.id)).map(s=>s.id.slice(7)))];
 if(!ids.length)return;
 const query="SRC:MED AND ("+ids.map(id=>"EXT_ID:"+id).join(" OR ")+")";
 const r=await json("https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=100&query="+encodeURIComponent(query));
 if(!Array.isArray(r.resultList?.result))throw Error("Could not retain retrieved records");
 await db().batch(r.resultList.result.map((s:any)=>upsert(publicationRecord(s))));
}
export async function storedEvidence(terms:string):Promise<CrossSource[]>{
 const match=matchQuery(terms);if(!match)return [];
 const rows=await db().prepare("SELECT r.* FROM research_fts f JOIN research_records r ON r.id=f.id WHERE research_fts MATCH ? AND r.kind='Publication' ORDER BY bm25(research_fts) LIMIT 40").bind(match).all<StoredRecord>();
 const tokens=(terms.toLowerCase().match(/[a-z0-9-]{3,}/g)||[]);
 return rows.results.filter(r=>r.abstract||r.full_text).map(r=>{
   const passages=(r.full_text||"").split(/(?<=[.!?])\s+/).filter(p=>tokens.some(t=>p.toLowerCase().includes(t))).slice(0,12).join(" ").slice(0,5000);
   return {id:r.id,title:r.title,year:String(r.year),url:r.url,abstract:("Abstract: "+r.abstract.slice(0,5000)+(passages?" Indexed article-body passages: "+passages:"")),roles:/type [i1] diabetes|type 1 diabetes|insulin.dependent diabetes/i.test(r.title+" "+r.abstract)?["T1D"]:["Other fields"]};
 });

}
