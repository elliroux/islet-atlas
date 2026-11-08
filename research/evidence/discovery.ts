import type { Discovery, EvidenceDocument, SavedAssertion } from "./types";

/** Reproducible structural questions, not source-independent biological claims or clinical scores. */
export function discoverEvidence(gene:string, assertions:SavedAssertion[], documents:EvidenceDocument[]):Discovery[] {
  const available=assertions.filter(a=>a.review!=="rejected").sort((a,b)=>a.id.localeCompare(b.id,"en"));
  const positive=available.filter(a=>a.stance==="reported");
  const paths:SavedAssertion[][]=positive.map(a=>[a]);
  pairs: for(let i=0;i<positive.length;i++) for(const b of positive.slice(i+1)) {
    const a=positive[i];
    const shared=[a.subject.id,a.object.id].filter(id=>id===b.subject.id||id===b.object.id);
    // Same directed claim aggregated twice is not a new path or independent replication.
    if(shared.length!==1 || a.provider===b.provider)continue;
    paths.push([a,b]);
    if(paths.length>=400)break pairs;
  }
  const unique=new Map<string,Discovery>();
  for(const path of paths) {
    const ids=path.map(a=>a.id).sort(), id=ids.join("~");if(unique.has(id))continue;
    const entities=[...new Map(path.flatMap(a=>[a.subject,a.object]).map(e=>[e.id,e])).values()];
    const contradictory=available.filter(a=>a.stance==="negated"&&path.some(p=>p.subject.id===a.subject.id&&p.object.id===a.object.id&&p.predicate===a.predicate));
    const pmids=[...new Set(path.flatMap(a=>a.publications))];
    const allComputational=path.every(a=>a.classification==="computational_inference");
    const factors=[{name:"Two source-linked edges sharing one entity",points:path.length===2?2:0},
      {name:"At least one primary-record locator to inspect (not replication)",points:pmids.length?1:0},
      {name:"Explicit contrary assertion to resolve",points:contradictory.length?2:0},
      {name:"Reported direction available for every edge",points:path.every(a=>a.context.direction)?1:0}];
    const gaps=["Independent replication and shared cohorts have not been established.","Publication search matches have not been assessed for support, contradiction or comparable endpoints."];
    if(path.some(a=>!a.context.species))gaps.push("Species not reported for at least one relationship.");
    if(path.some(a=>!a.context.tissue))gaps.push("Relevant tissue or cell context is unknown for at least one relationship.");
    if(path.some(a=>!a.context.direction))gaps.push("Direction of effect or intervention action requires source review.");
    if(!pmids.length)gaps.push("No supporting publication identifier was supplied on these edges.");
    if(allComputational)gaps.push("Only computational assertions support this structural connection.");
    if(documents.some(d=>d.kind==="Trial registration"&&!d.hasResults))gaps.push("At least one matched trial has no posted aggregate results in the retrieved metadata; no outcome is inferred.");
    const names=entities.map(e=>e.name).join(" / ");
    unique.set(id,{id,hypothesis:path.length===2?`Could the source-reported relationships involving ${names} be relevant together in T1D?`:`Does the reported ${path[0].subject.name} → ${path[0].object.name} relationship hold in the relevant T1D context?`,
      designation:allComputational?"speculative connection":"candidate hypothesis",entities,relationships:ids,supporting:path,contradictory,gaps,
      uncertainty:"Structural research prompt only. Unreviewed provider assertions do not establish causality, therapeutic benefit, novelty or a durable cure. Zero detected contradictions does not mean agreement.",
      alreadyReported:path.length===1?"The relationship is reported by the linked provider; its relevance to this question is unassessed.":"Individual edges are reported by their providers. Whether this combined mechanism is already reported in literature is unknown.",
      questions:[`Check original sources for ${gene}, species, tissue, population, outcome and effect direction before comparing studies.`,"Test the proposed direction in a relevant controlled model with an opposing perturbation and specificity controls; assess human evidence and safety separately."],
      priority:{total:factors.reduce((n,f)=>n+f.points,0),factors,meaning:"Transparent review-priority points, version 1. Not a probability, validated scientific confidence or drug efficacy ranking."}});
  }
  // Repeated provider paths through the same entity set share one question. Keep all source assertions,
  // but use the maximum structural priority rather than rewarding aggregator/citation volume.
  const questions=new Map<string,Discovery>();
  for(const d of [...unique.values()].sort((a,b)=>b.priority.total-a.priority.total||a.id.localeCompare(b.id,"en"))) {
    const key=d.entities.map(e=>e.id).sort().join("~");const existing=questions.get(key);
    if(!existing){questions.set(key,d);continue;}
    existing.supporting=[...new Map([...existing.supporting,...d.supporting].map(a=>[a.id,a])).values()];
    existing.contradictory=[...new Map([...existing.contradictory,...d.contradictory].map(a=>[a.id,a])).values()];
    existing.relationships=[...new Set([...existing.relationships,...d.relationships])];
    existing.gaps=[...new Set([...existing.gaps,...d.gaps])];
    if(d.designation==="candidate hypothesis")existing.designation="candidate hypothesis";
    if(existing.supporting.some(a=>a.classification!=="computational_inference"))existing.gaps=existing.gaps.filter(g=>!g.startsWith("Only computational assertions"));
  }
  return [...questions.values()].slice(0,12);
}
