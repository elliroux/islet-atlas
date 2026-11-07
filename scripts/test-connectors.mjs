// Compile isolated connectors into a temporary directory; no network in default tests.
import ts from "typescript";
import {mkdtemp,readFile,writeFile,readdir,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import assert from "node:assert/strict";
const dir=await mkdtemp(join(tmpdir(),"atlas-connectors-"));
try{
 await writeFile(join(dir,"package.json"),'{"type":"module"}');
 for(const file of await readdir(new URL("../research/connectors/",import.meta.url))){
  if(!file.endsWith(".ts"))continue;
  const source=await readFile(new URL("../research/connectors/"+file,import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from "(\.\/[^".]+)"/g,'from "$1.js"');
  await writeFile(join(dir,file.replace(/\.ts$/,".js")),compiled);
 }
 const load=name=>import(pathToFileURL(join(dir,name+".js")));
 const {parseTranslator,translatorQuery}=await load("translator"),{geneQuery,connectionQuery,parseLinks}=await load("pankgraph"),{parseTrials,deduplicate}=await load("literature"),{investigateConnections}=await load("investigation"),{requestJson,safeUrl}=await load("types");
 assert.throws(()=>geneQuery('IL2RA"}) DELETE n'));
 assert.throws(()=>translatorQuery('http://localhost'));
 assert.equal(safeUrl('javascript:alert(1)'),undefined);
 assert.throws(()=>parseTranslator({status:"Error",message:{results:[]}}));
 assert.throws(()=>parseTranslator({message:{}}));
 assert.deepEqual(parseTranslator({message:{results:[]}}),[]);
 const edge={subject:"D:1",object:"NCBIGene:3559",predicate:"biolink:affects",qualifiers:[{qualifier_type_id:"biolink:object_direction_qualifier",qualifier_value:"increased"}],sources:[{resource_id:"infores:test",resource_role:"primary_knowledge_source",source_record_urls:["https://example.org/record"]}],attributes:[{attribute_type_id:"biolink:publications",value:["PMID:123"]}]};
 const result={node_bindings:{drug:[{id:"D:1"}],gene:[{id:"NCBIGene:3559"}]},analyses:[{edge_bindings:{e:[{id:"edge"}]}}]};
 const parsed=parseTranslator({status:"Success",message:{results:[result,result],knowledge_graph:{nodes:{"D:1":{name:"Example drug"},"NCBIGene:3559":{name:"IL2RA"}},edges:{edge}}}});
 assert.equal(parsed.length,1);assert.equal(parsed[0].links.length,1);assert.equal(parsed[0].links[0].properties.qualifiers[0].qualifier_value,"increased");assert.deepEqual(parsed[0].links[0].publications,["PMID:123"]);
 const links=parseLinks([{source:{name:"Pathway"},destination:{name:"IL2RA"},target:{id:"GO:1"},predicate:"contains",evidence:{data_source:"Test",publication_source:"PUBMED:123"}}]);
 assert.equal(links[0].subject,"Pathway");assert.equal(links[0].object,"IL2RA");assert.deepEqual(links[0].publications,["PMID:123"]);
 const records=parseTrials({studies:[{protocolSection:{identificationModule:{nctId:"NCT12345678",briefTitle:"Example"},statusModule:{overallStatus:"TERMINATED",whyStopped:"Recruitment stopped"},referencesModule:{references:[{pmid:"123"}]}}}]});
 assert.equal(records[0].whyStopped,"Recruitment stopped");assert.equal(records[0].hasResults,false);assert.deepEqual(records[0].linkedPublications,["PMID:123"]);assert.equal(deduplicate([...records,...records]).length,1);
 const failure=await investigateConnections("IL2RA",undefined,async()=>{throw Error("Offline")});assert.equal(failure.evidence.length,0);assert(failure.queries.every(q=>q.status==="unavailable"||q.status==="skipped"));assert(failure.queries.some(q=>q.provider.includes("Translator")&&q.status==="skipped"));
 assert(connectionQuery("HLA-DQA1").includes("n:reactome OR n:kegg OR n:gene_ontology"));
 const hla=await investigateConnections("HLA",undefined,async(url)=>String(url).includes("execute-api")?Response.json({records:[]}):String(url).includes("europepmc")?Response.json({resultList:{result:[]}}):Response.json({studies:[]}));
 assert.deepEqual(hla.geneOptions,["HLA-DQA1","HLA-DQB1","HLA-DRB1"]);assert.match(hla.resolution,/family/);assert(hla.queries.some(q=>q.status==="skipped"));
 const fake=async(url,init)=>{
  if(String(url).includes('execute-api')){const query=JSON.parse(init.body).query;return Response.json({records:query.includes('AS gene')?[{gene:{id:'ENSG00000134460'}}]:[]})}
  if(String(url).includes('arax'))throw Error('Translator unavailable');
  if(String(url).includes('europepmc'))return Response.json({resultList:{result:[{id:'123',title:'A study',pubYear:'2026'}]}});
  return Response.json({studies:[]});
 };
 const partial=await investigateConnections('IL2RA',undefined,fake);assert.equal(partial.evidence.length,1);assert(partial.queries.some(q=>q.provider.includes('Translator')&&q.status==='unavailable'));assert(partial.queries.some(q=>q.provider==='ClinicalTrials.gov'&&q.status==='empty'));
 await assert.rejects(()=>requestJson('https://example.org',{},async()=>new Response('x'.repeat(12_000_001))),/size limit/);
 console.log('Connector tests passed: provenance, direction, deduplication, invalid input, schema drift, response bounds, partial and total outages.');
 if(process.argv.includes('--live')){
  const run=await investigateConnections(process.argv.find(a=>a.startsWith('--gene='))?.slice(7)||'IL2RA',process.argv.includes('--candidate')?'Aldesleukin':undefined);
  console.log(JSON.stringify({gene:run.gene,geneId:run.geneId,candidate:run.candidate,links:run.links.length,candidates:run.candidates.map(c=>({id:c.id,name:c.name,edges:c.links.length})),evidence:run.evidence.length,queries:run.queries},null,2));
  if(run.queries.some(q=>q.status==='unavailable'))process.exitCode=1;
  if(!run.candidates.length||!run.evidence.length||!run.links.length)process.exitCode=1;
 }
}finally{await rm(dir,{recursive:true,force:true})}
