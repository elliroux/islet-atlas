import {requestJson,text,type EvidenceRecord,type Fetcher} from "./types";
export const EUROPEPMC="https://www.ebi.ac.uk/europepmc/webservices/rest/search";
export const TRIALS="https://clinicaltrials.gov/api/v2/studies";
export function evidenceQueries(term:string){
 const quoted='"'+term.replace(/["\\]/g," ")+'"';
 return {publications:'SRC:MED AND ('+quoted+') AND ("type 1 diabetes" OR "type I diabetes")',trials:{"query.cond":"Type 1 Diabetes","query.term":quoted}};
}
export function parsePublications(data:any):EvidenceRecord[]{
 if(!Array.isArray(data.resultList?.result))throw Error("Publication response schema changed");
 return data.resultList.result.filter((r:any)=>/^\d+$/.test(r.id)).map((r:any)=>({id:"PMID:"+r.id,title:text(r.title),url:"https://pubmed.ncbi.nlm.nih.gov/"+r.id+"/",provider:"Europe PMC / PubMed",kind:"Publication",year:text(r.pubYear),publicationTypes:r.pubTypeList?.pubType||[]}));
}
export function parseTrials(data:any):EvidenceRecord[]{
 if(!Array.isArray(data.studies))throw Error("Trial response schema changed");
 return data.studies.filter((s:any)=>/^NCT\d{8}$/.test(s.protocolSection?.identificationModule?.nctId)).map((s:any)=>{
 const p=s.protocolSection,e=p.eligibilityModule||{},id=p.identificationModule.nctId;
 return {id,title:text(p.identificationModule.briefTitle),url:"https://clinicaltrials.gov/study/"+id,provider:"ClinicalTrials.gov",kind:"Trial registration",year:p.statusModule?.lastUpdatePostDateStruct?.date||"",status:p.statusModule?.overallStatus||"Unknown",whyStopped:text(p.statusModule?.whyStopped)||"No stop reason reported in this retrieved record.",population:[e.minimumAge,e.maximumAge,e.sex].filter(Boolean).join(" · "),phase:p.designModule?.phases?.join(" / ")||"Not specified",hasResults:s.hasResults===true,linkedPublications:(p.referencesModule?.references||[]).filter((r:any)=>/^\d+$/.test(r.pmid)).map((r:any)=>"PMID:"+r.pmid)};
 });
}
export async function publications(query:string,fetcher:Fetcher=fetch){return parsePublications(await requestJson(EUROPEPMC+"?"+new URLSearchParams({query,format:"json",resultType:"core",pageSize:"10"}),{},fetcher))}
export async function trials(query:Record<string,string>,fetcher:Fetcher=fetch){return parseTrials(await requestJson(TRIALS+"?"+new URLSearchParams({...query,pageSize:"10",format:"json"}),{},fetcher))}
export function deduplicate(records:EvidenceRecord[]):EvidenceRecord[]{return [...new Map(records.map(r=>[r.id,r])).values()]}
