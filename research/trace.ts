import {data,findings,familyOf,records} from "./data";
import {supplementCards} from "./workbench";
import {leads} from "./leads";
import links from "./trace-links.json";
import type {EvidenceCard} from "./types";

export type Related={id:string;title:string;year:number|string;relation:string;interpretation:string;reason:string;url:string;locator:string;via:string;excerpt?:string};
export type Entry={label:string;text:string;url:string;locator:string;date?:string;refs?:{title:string;url:string;locator:string}[]};
export type Anchor=EvidenceCard & {pmid?:string;trial?:string;query:string};
export type Trace={date:string;anchor:Anchor;related:Related[];events:Entry[];log:{scope:string;query:string;outcome:string}[];gap:string};
export const modes=["Who else saw this?","What happened to this idea?"] as const;
export function atlasCard(id:string):EvidenceCard|undefined{
 const f=findings.get(id.replace(/^atlas-/,""));if(!f)return;
 const r=records.get(f.record)!;
 return {id:"atlas-"+f.id,title:f.title,url:f.url,year:r.year,family:familyOf(f).name,stage:f.stage,design:f.evidence+" · "+f.population,endpoint:f.endpoint,result:f.effect+" "+f.uncertainty,limit:f.limitation,locator:f.locator,access:r.access};
}
const studyQueries:Record<string,string>={
 "donor-cd3":'(islet transplantation) AND (anti-CD3 OR teplizumab OR hOKT3 OR induction)',
 forward:'(zimislecel OR VX-880 OR stem cell derived islets) AND diabetes',
 vx264:'(VX-264 OR encapsulated islets OR immune protection) AND diabetes',
 up421:'(gene-edited OR hypoimmune) AND (donor islets OR beta cells) AND diabetes',
 tn10:'teplizumab AND (delay OR prevention) AND type 1 diabetes',
 protege:'teplizumab AND C-peptide AND new onset type 1 diabetes',
 protect:'teplizumab AND C-peptide AND new onset type 1 diabetes',
};
export function anchorFor(card:EvidenceCard):Anchor{
 const f=findings.get(card.id.replace(/^atlas-/,"")),r=f?records.get(f.record):undefined;
 const pmid=card.id.match(/^pubmed-(\d+)$/)?.[1]||r?.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1]||(f?.record==="donor-paper"?"14961992":f?.record==="tn-main"?"31180194":undefined);
 const trial=card.family.match(/NCT\d{8}/)?.[0]||card.id.match(/NCT\d{8}/)?.[0]||(f?familyOf(f).refs.map(id=>records.get(id)).find(r=>r?.family===familyOf(f).id&&r.url.includes("clinicaltrials.gov"))?.url.match(/NCT\d{8}/)?.[0]:undefined);
 const vitamin=supplementCards.some(s=>s.id===card.id);
 const query=vitamin?(card.id==="pubmed-15043959"?"nicotinamide AND prevention AND type 1 diabetes":"(ergocalciferol OR cholecalciferol OR calcitriol OR vitamin D) AND type 1 diabetes AND (C-peptide OR beta cell)"):f?(studyQueries[familyOf(f).id]||f.factor+" AND type 1 diabetes"):card.title;
 return {...card,pmid,trial,query:query.slice(0,350)};
}
export function knownTrace(anchor:Anchor):Trace{
 const key=anchor.id.replace(/^atlas-/,""),f=findings.get(key);
 const related:Related[]=(links as (Related & {targets:string[]})[]).filter(x=>x.targets.includes(key)).map(x=>({...x,via:"Source-checked comparison"}));
 const events:Entry[]=[{label:"Reported result",text:anchor.result,url:anchor.url,locator:anchor.locator,date:String(anchor.year)}];
 if(f){
  const family=familyOf(f),r=records.get(f.record)!;
  for(const ref of data.findings.filter(x=>x.record!==f.record&&familyOf(x).id===family.id)){
   const record=records.get(ref.record)!;if(related.some(x=>x.url===record.url))continue;
   related.push({id:"atlas-"+ref.id,title:record.title,year:record.year,relation:"Same study family",interpretation:ref.effect,reason:family.replication,url:ref.url,locator:ref.locator,via:"Reviewed study-family link"});
  }
  const refs=family.refs.map(id=>records.get(id)!).filter(Boolean);
  const registry=refs.find(x=>x.family===family.id&&x.url.includes("clinicaltrials.gov"));
  const followSource:Record<string,string>={teddy:"teddy-catalog","islet-coculture":"coppieters-2012",tn10:"tn-fu",protege:"protect-main",protect:"protect-pp",forward:"zim-update",vx264:"vx264-update","donor-cd3":"donor-next",up421:"up-follow"};
  const later=records.get(followSource[family.id])||r;
  events.push({label:"Study status · reviewed record",text:family.status,url:(registry||r).url,locator:(registry||r).locator});
  events.push({label:"Subsequent work",text:family.subsequent,url:later.url,locator:later.locator,date:String(later.year)});
  if(family.id==="protege")events.push({label:"Interrupted measurements",text:family.status,url:records.get("prot-fu")!.url,locator:"Methods · follow-up and laboratory sampling",date:"2013"});
  if(family.id==="vx264"){
   const graft=findings.get("up-function")!,follow=findings.get("up-followup")!;
   for(const observation of [graft,follow]){
    const report=records.get(observation.record)!;
    events.push({label:"Different program · immune protection",date:String(report.year),text:observation.summary+" "+observation.limitation+" This addresses the goal of protecting cells. Whether it addresses the cause of VX-264’s missed endpoint remains unknown.",url:observation.url,locator:observation.locator});
   }
  }
  const lead=leads.find(x=>x.sourceIds.includes(key));if(lead)events.push({label:"Hypothesis for expert review",text:lead.inference+" "+lead.challenge+" Proposed test: "+lead.test+" What would weaken it: "+lead.weaken,url:anchor.url,locator:"Atlas interpretation; supporting finding · "+anchor.locator,refs:lead.sourceIds.map(id=>findings.get(id)!).map(x=>({title:x.title,url:x.url,locator:x.locator}))});
 }else if(supplementCards.some(s=>s.id===key)){
  for(const other of supplementCards.filter(s=>s.id!==key)){
   const same=anchor.family===other.family;
   const d2=["pubmed-34913020","pubmed-38441899"];
   const review=(d2.includes(key)&&other.id==="pubmed-39194033")||(key==="pubmed-39194033"&&d2.includes(other.id));
   const independent=(d2.includes(key)&&other.id==="pubmed-20805274")||(key==="pubmed-20805274"&&d2.includes(other.id));
   if(!same&&!review&&!independent)continue;
   related.push({...other,relation:same?"Same trial":review?"Overlapping review":"Separate trial · different formulation",interpretation:other.result,reason:review?"Figure 3B of the Ferraz review includes the Nwosu trial (reference 36).":other.limit,via:"Source-checked comparison"});
   if(Number(other.year)>Number(anchor.year))events.push({label:review?"Later synthesis":"Later analysis",text:other.result+" "+other.limit,url:other.url,locator:other.locator,date:String(other.year)});
  }
 }
 // Preserve the difference between a cited comparison and a successor program.
 for(const link of related.filter(x=>x.via==="Source-checked comparison"&&Number(x.year)>Number(anchor.year)&&!events.some(e=>e.url===x.url))){
  events.push({label:"Later related evidence",text:link.interpretation+" "+link.reason,url:link.url,locator:link.locator,date:String(link.year)});
 }
 return {anchor,date:new Date().toISOString(),related,events,log:[],gap:"Independent replication of this exact finding has not been established by the source-checked links."};
}
