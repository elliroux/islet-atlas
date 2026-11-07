import cards from "./supplements.json";
import type {Answer, EvidenceCard, Investigation, StudyItem} from "./types";

export const supplementQuestion="Are any supplements known to slow progression of type 1 diabetes?";
export const supplementCards:EvidenceCard[]=cards;
export const supplementTerms="(nicotinamide OR ergocalciferol OR calcitriol OR cholecalciferol) AND (C-peptide OR progression OR prevention)";
export const sameQuestion=(q:string)=>q.trim().toLowerCase().replace(/[?!.]+$/,"")===supplementQuestion.toLowerCase().replace("?","");
export function starterStudies():StudyItem[]{
 return supplementCards.map(c=>({...c,status:"Source-checked starter",added:new Date().toISOString(),reason:"Selected to distinguish prevention, preservation, same-trial reanalysis and independent evidence."}));
}
export function cardCitation(c:EvidenceCard){return {id:c.id,title:c.title,url:c.url,locator:c.locator,family:c.family}}
export function studyGuide(question:string,studies:StudyItem[]):Answer{
 const selected=studies.filter(s=>!s.excluded&&(s.status!=="Metadata only"||s.checked));
 let answer=selected.map(s=>s.result+" ["+s.id+"]").join("\n\n");
 const d2=["pubmed-34913020","pubmed-38441899"];
 if(sameQuestion(question)&&[...d2,"pubmed-15043959","pubmed-39194033"].every(id=>selected.some(s=>s.id===id&&!s.checked))){
 answer="These selected studies do not establish that a supplement delays clinical diagnosis or durably preserves insulin production. [pubmed-15043959] [pubmed-39194033]\n\nBefore diagnosis, ENDIT found similar rates of progression in the nicotinamide and placebo groups. [pubmed-15043959]\n\nAfter diagnosis, a vitamin D2 trial in 36 young people found no significant difference in C-peptide at individual visits. A later analysis found a slower decline using a different measure in the same participants. How long any benefit might persist after treatment is unknown. [pubmed-34913020] [pubmed-38441899]";
 }
 return {question,answer:answer||"No selected study supplies a checkable result for this question yet.",engine:"Source summaries · model unavailable",sources:selected.map(s=>s.id),citations:selected.map(cardCitation),reasoning:"These are source summaries. A synthesis of this question requires comparison of populations, endpoints and study families.",branches:d2.every(id=>selected.some(s=>s.id===id))?[{question:"Did an independent trial reproduce the vitamin D2 C-peptide result using a prespecified endpoint?",observation:"The primary report and secondary analysis used the same trial participants.",sources:d2}]:[],search:"Included source snapshots for this investigation.",date:new Date().toISOString()};
}
export function parseSource(input:string){
 const text=input.trim();
 const pm=text.match(/^(?:pubmed-|pmid\s*:?\s*|https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/)?(\d{1,9})(?:\/?(?:#abstract)?)?$/i);
 if(pm)return "pubmed-"+pm[1];
 const nct=text.match(/^(?:trial-|https:\/\/clinicaltrials\.gov\/study\/)?(NCT\d{8})(?:\/?(?:#[\w-]*)?)?$/i);
 if(nct)return "trial-"+nct[1].toUpperCase();
 const doi=text.replace(/^(?:doi:\s*|https:\/\/doi\.org\/)/i,"");
 return /^10\.\d{4,9}\/[a-z0-9._;()/:+-]+$/i.test(doi)?"doi-"+doi.toLowerCase():null;
}
export function exportReport(d:Investigation){
 const rows=[d.original,"","Created "+d.created,"","## My conclusion",d.conclusion||"No conclusion recorded.","","## Sources"];
 for(const s of d.studies||[])rows.push("",s.title,"Status: "+s.status+(s.excluded?" · excluded":" · included"),"Selection reason: "+s.reason,"Study family: "+s.family,s.endpoint,s.result,s.limit,s.locator,s.url);
 for(const n of d.nodes){rows.push("","## "+n.response.question,n.response.answer,n.response.reasoning,n.response.search);
 for(const c of n.response.citations)rows.push(c.title+" · "+c.locator+" · "+c.url);
 for(const b of n.response.branches)rows.push("Follow-up: "+b.question+" — "+b.observation+(b.dismissed?" (dismissed)":""));
 for(const s of n.searches)rows.push("Search: "+s.query+" · "+s.date+" · "+s.scope,...s.errors,...s.hits.map(h=>h.title+" · "+h.url));}
 for(const trace of d.traces||[]){
 rows.push("","## Finding trace: "+trace.anchor.title,trace.date,trace.anchor.url,trace.gap);
 for(const x of trace.related)rows.push(x.relation+" · "+x.title,x.interpretation,x.reason,x.locator+" · "+x.url);
 for(const e of trace.events)rows.push(e.label+" · "+(e.date||"Date unknown"),e.text,e.locator+" · "+e.url);
 for(const s of trace.log)rows.push(s.scope+" · "+s.query+" · "+s.outcome);
 }
 return rows.join("\n");
}
export function downloadText(name:string,content:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
