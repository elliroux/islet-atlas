import {requestJson,safeUrl,strings,text,type Candidate,type GraphLink,type Fetcher} from "./types";
export const TRANSLATOR="https://arax.ncats.io/api/arax/v1.4/query";
export function translatorQuery(geneId:string){
 if(!/^ENSEMBL:ENSG\d+$/.test(geneId)&&!/^NCBIGene:\d+$/.test(geneId))throw Error("Unsupported gene identifier");
 return {message:{query_graph:{nodes:{drug:{categories:["biolink:Drug"]},gene:{ids:[geneId]}},edges:{e:{subject:"drug",object:"gene",predicates:["biolink:affects","biolink:physically_interacts_with"]}}}},query_options:{kp_timeout:20}};
}
export function parseTranslator(data:any):Candidate[]{
 if(data.status&&data.status!=="Success"&&data.status!=="OK")throw Error("Translator did not complete: "+text(data.status));
 const m=data.message;
 if(!m||!Array.isArray(m.results))throw Error("Translator response schema changed; connector needs review.");
 if(!m.results.length)return [];
 if(!m.knowledge_graph?.nodes||!m.knowledge_graph?.edges)throw Error("Translator omitted supporting graph");
 const {nodes,edges}=m.knowledge_graph, candidates=new Map<string,Candidate>();
 for(const result of m.results){
  for(const binding of result.node_bindings?.drug||[]){
   const node=nodes[binding.id];if(!node)continue;
   if(!candidates.has(binding.id)&&candidates.size>=12)continue;
   const c:Candidate=candidates.get(binding.id)||{id:binding.id,name:text(node.name)||binding.id,links:[]};
   for(const a of result.analyses||[]){for(const bound of a.edge_bindings?.e||[]){
    const e=edges[bound.id];if(!e||typeof e.predicate!=="string"||!(e.subject===binding.id||e.object===binding.id))continue;
    const geneBindings=(result.node_bindings?.gene||[]).map((b:any)=>b.id);
    const other=e.subject===binding.id?e.object:e.subject;
    if(!geneBindings.includes(other))continue;
    if(c.links.some(l=>l.id===bound.id))continue;
    const sources=Array.isArray(e.sources)?e.sources:[],attributes=Array.isArray(e.attributes)?e.attributes:[];
    const publications=[...new Set(attributes.filter((a:any)=>a.attribute_type_id==="biolink:publications").flatMap((a:any)=>strings(a.value)))].filter((v):v is string=>typeof v==="string");
    const link:GraphLink={id:bound.id,subject:text(nodes[e.subject]?.name)||e.subject,predicate:e.predicate,object:text(nodes[e.object]?.name)||e.object,kind:attributes.some((a:any)=>a.attribute_type_id==="biolink:knowledge_level"&&["prediction","logical_entailment"].includes(a.value))?"Computational inference":"Provider assertion",properties:{subjectId:e.subject,objectId:e.object,subjectCategories:nodes[e.subject]?.categories||[],objectCategories:nodes[e.object]?.categories||[],boundGeneId:other,knowledgeLevel:attributes.find((a:any)=>a.attribute_type_id==="biolink:knowledge_level")?.value,qualifiers:e.qualifiers||[],attributes:attributes.filter((a:any)=>!String(a.attribute_type_id).includes("score")),sourceChain:sources},sources:sources.map((s:any)=>s.resource_id).filter((s:any)=>typeof s==="string"),publications,urls:sources.flatMap((s:any)=>strings(s.source_record_urls)).map(safeUrl).filter((s:any)=>!!s)};
    if(c.links.length<12)c.links.push(link);
   }}
   if(c.links.length)candidates.set(c.id,c);
  }
 }
 return [...candidates.values()];
}
export async function translator(query:ReturnType<typeof translatorQuery>,fetcher:Fetcher=fetch){return parseTranslator(await requestJson(TRANSLATOR,{method:"POST",body:JSON.stringify(query)},fetcher))}
