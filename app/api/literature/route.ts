import type {Hit,SearchRun} from "../../../research/types";
export const dynamic="force-dynamic";
async function get(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status); return r.json() as Promise<any>}
async function pubmed(q:string):Promise<Hit[]> {
 const base="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
 const result=await get(base+"esearch.fcgi?db=pubmed&retmode=json&retmax=12&sort=relevance&term="+encodeURIComponent(q));
 const ids=result.esearchresult?.idlist;if(!Array.isArray(ids))throw Error("Missing PubMed result");if(!ids.length)return [];
 const summaries=await get(base+"esummary.fcgi?db=pubmed&retmode=json&id="+ids.join(","));
 return ids.map(id=>({title:summaries.result[id].title,year:summaries.result[id].pubdate,source:"PubMed",url:"https://pubmed.ncbi.nlm.nih.gov/"+id+"/"}));
}
async function trials(q:string):Promise<Hit[]> {
 const r=await get("https://clinicaltrials.gov/api/v2/studies?pageSize=12&query.term="+encodeURIComponent(q));if(!Array.isArray(r.studies))throw Error("Missing study list");
 return r.studies.map((s:any)=>({title:s.protocolSection.identificationModule.briefTitle,source:"ClinicalTrials.gov",year:s.protocolSection.statusModule.overallStatus.replaceAll("_"," ").toLowerCase(),url:"https://clinicaltrials.gov/study/"+s.protocolSection.identificationModule.nctId}))
}
export async function GET(req:Request){
 const q=new URL(req.url).searchParams.get("q")?.trim();if(!q||q.length>400)return Response.json({error:"Enter 1–400 characters."},{status:400});
 const t1d=new URL(req.url).searchParams.get("scope")!=="adjacent";
 const results=await Promise.allSettled([pubmed(t1d?"("+q+") AND (diabetes mellitus, type 1[MeSH Terms] OR type 1 diabetes[tiab] OR T1D[tiab])":q),trials(t1d?"("+q+") AND (type 1 diabetes OR T1D)":q)]);const run:SearchRun={date:new Date().toISOString(),query:q,scope:(t1d?"T1D filter applied. ":"Adjacent fields included. ")+"Up to 12 PubMed titles and 12 trial registrations. Candidate records only.",errors:[],hits:[]};
 results.forEach((r,i)=>{if(r.status==="fulfilled")run.hits.push(...r.value);else run.errors.push((i?"ClinicalTrials.gov":"PubMed")+" unavailable. Coverage is incomplete.")});return Response.json(run,{headers:{"Cache-Control":"no-store"}});
}
