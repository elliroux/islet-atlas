import {requestJson,safeUrl,text,strings,type Fetcher,type GraphLink} from "./types";
export const PANKGRAPH="https://nzi5e9mb0f.execute-api.us-east-1.amazonaws.com/production/pank2-neo4j-api-development";
export function geneQuery(symbol:string){
 if(!/^[A-Z][A-Z0-9-]{0,24}$/.test(symbol))throw Error("Use a gene symbol, for example IL2RA.");
 return `MATCH (g:gene {name:"${symbol}"}) RETURN properties(g) AS gene LIMIT 1`;
}
export const CONNECTION_LIMIT=80;
export function connectionQuery(symbol:string){
 geneQuery(symbol);
 return `MATCH (g:gene {name:"${symbol}"})-[r]-(n) WHERE n:pathway OR n:reactome OR n:kegg OR n:gene_ontology OR n.id = "MONDO_0005147" RETURN properties(startNode(r)) AS source, properties(endNode(r)) AS destination, type(r) AS predicate, properties(n) AS target, properties(r) AS evidence, labels(startNode(r)) AS sourceLabels, labels(endNode(r)) AS destinationLabels ORDER BY CASE WHEN n.id = "MONDO_0005147" THEN 0 ELSE 1 END, predicate, target.id LIMIT ${CONNECTION_LIMIT}`;
}
export async function pankQuery(query:string,fetcher:Fetcher=fetch):Promise<any[]>{
 let data=await requestJson(PANKGRAPH,{method:"POST",body:JSON.stringify({query})},fetcher);
 if(typeof data==="string")data=JSON.parse(data);
 if(!Array.isArray(data.records))throw Error("PanKgraph response schema changed; connector needs review.");
 return data.records;
}
export function parseLinks(rows:any[]):GraphLink[]{
 return rows.map((row,i)=>{
  if(!row.target||typeof row.predicate!=="string"||!row.source||!row.destination)throw Error("Invalid PanKgraph relation");
  const p=row.evidence||{};
  const publications=strings(p.publication_source).filter(s=>/^(PUBMED|PMID):\d+$/i.test(s)).map(s=>"PMID:"+s.split(":")[1]);
  return {id:"pank-"+i,subject:text(row.source.name)||text(row.source.id),predicate:row.predicate,object:text(row.destination.name)||text(row.destination.id),kind:(/predict/i.test(strings(p.data_source).join(" "))?"Computational inference":"Graph association") as GraphLink["kind"],properties:{...p,targetId:row.target.id,subjectId:row.source.id,objectId:row.destination.id,subjectCategories:row.sourceLabels||[],objectCategories:row.destinationLabels||[],sourceRecordId:p.id||null},sources:strings(p.data_source),publications,urls:[safeUrl(row.target.link),safeUrl(row.target.url),...publications.map(p=>"https://pubmed.ncbi.nlm.nih.gov/"+p.split(":")[1]+"/")].filter((s):s is string=>!!s)};
 });
}
