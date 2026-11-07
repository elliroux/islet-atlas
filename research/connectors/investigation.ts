import {capture,type ConnectedRun,type QueryLog,type Fetcher} from "./types";
import {PANKGRAPH,CONNECTION_LIMIT,geneQuery,connectionQuery,pankQuery,parseLinks} from "./pankgraph";
import {TRANSLATOR,translatorQuery,translator} from "./translator";
import {EUROPEPMC,TRIALS,evidenceQueries,publications,trials,deduplicate} from "./literature";
export async function investigateConnections(gene:string,candidate:string|undefined,fetcher:Fetcher=fetch):Promise<ConnectedRun>{
 const queries:QueryLog[]=[],q=geneQuery(gene),date=new Date().toISOString();
 const run:ConnectedRun={version:1,id:crypto.randomUUID(),date,gene,candidate,question:candidate?`What human evidence supports or challenges investigating ${candidate} in T1D, and how does it relate to ${gene}?`:`Which pathways and drug relationships are connected to ${gene}, and what T1D evidence needs review?`,links:[],candidates:[],evidence:[],queries,gaps:[]};
 const genes=await capture("PanKgraph gene lookup",PANKGRAPH,{query:q},1,()=>pankQuery(q,fetcher),queries);
 const geneId=genes[0]?.gene?.id;
 if(typeof geneId==="string"&&/^ENSG\d+$/.test(geneId))run.geneId="ENSEMBL:"+geneId;
 else {
  run.resolution=gene==="HLA"?"HLA names a gene family/complex, not one gene symbol. Choose a specific gene below. Literature searches for HLA still ran; drug connections were not queried.":`No exact gene named ${gene} was resolved in PanKgraph. Check the official symbol. Drug connections were not queried; literature searches still ran.`;
  if(gene==="HLA")run.geneOptions=["HLA-DQA1","HLA-DQB1","HLA-DRB1"];
  run.gaps.push(run.resolution);
  queries.push({provider:"NCATS Translator / ARAX",endpoint:TRANSLATOR,request:null,retrievedAt:new Date().toISOString(),status:"skipped",count:0,limit:12,note:"Not queried because a specific gene identifier was not resolved."});
 }
 const cq=connectionQuery(gene),eq=evidenceQueries(candidate||gene);
 const [links,candidates,papers,registrations]=await Promise.all([
  capture("PanKgraph pathways and T1D",PANKGRAPH,{query:cq},CONNECTION_LIMIT,async()=>parseLinks(await pankQuery(cq,fetcher)),queries),
  run.geneId?capture("NCATS Translator / ARAX",TRANSLATOR,translatorQuery(run.geneId),12,()=>translator(translatorQuery(run.geneId!),fetcher),queries):Promise.resolve([]),
  capture("Europe PMC / PubMed",EUROPEPMC,eq.publications,10,()=>publications(eq.publications,fetcher),queries),
  capture("ClinicalTrials.gov",TRIALS,eq.trials,10,()=>trials(eq.trials,fetcher),queries)
 ]);
 run.links=links;run.candidates=candidates;run.evidence=deduplicate([...papers,...registrations]);
 run.gaps.push("Graph relationships do not establish causation, therapeutic benefit, or a cure. Drug classification does not verify current approval or suitability for T1D.","Age at diagnosis, disease stage, species, direction of effect and safety require review of original studies. Unreported fields remain unknown.","Publication matches have not been classified as supporting or contradictory. Registry termination does not imply biological failure; use the reported reason when available.","Searches are bounded and use the entered name, without exhaustive synonym expansion. Empty results do not establish novelty. Provider order is not an efficacy ranking.","Overlapping cohorts and trial–publication families need human review before counting independent evidence. Graph links may share underlying sources.");
 if(!links.some(l=>l.properties.targetId==="MONDO_0005147"))run.gaps.push("No direct T1D link appeared in this bounded PanKgraph response. The selected gene's relevance to T1D remains to be established from the evidence.");
 return run;
}
