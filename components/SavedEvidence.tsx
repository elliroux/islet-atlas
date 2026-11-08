"use client";
import {useEffect,useRef,useState} from "react";
import type {EvidenceView, SavedAssertion} from "../research/evidence/types";
function AssertionSource({assertion:a}:{assertion:SavedAssertion}) {
  return <details className="connected-relation"><summary>{a.subject.name} → {a.predicate.replace("biolink:","").replaceAll("_"," ")} → {a.object.name}</summary>
    <p>{a.classification.replaceAll("_"," ")} · {a.review} · {a.stance==="negated"?"Explicitly negated by provider":"Reported by provider"}</p>
    <p>{a.subject.id} → {a.object.id}</p><p>{a.provider} · {a.sources.join(" / ")||"Original provider not supplied"} · retrieved {a.retrievedAt}</p>
    <a href={a.sourceUrl} target="_blank" rel="noreferrer">Original source / query endpoint ↗</a>
    {a.publications.map(id=><p key={id}><a href={id.startsWith("PMID:")?"https://pubmed.ncbi.nlm.nih.gov/"+id.slice(5)+"/":"https://doi.org/"+id.slice(4)} target="_blank" rel="noreferrer">{id} ↗</a></p>)}
    <p>{a.provenance?.map(p=>`${p.resourceId} (${p.role||"role unknown"})${p.upstream.length?" via "+p.upstream.join(", "):""}`).join("; ")}</p>
    <p>Species: {a.context.species||"unknown"} · tissue: {a.context.tissue||"unknown"} · direction: {a.context.direction||"unknown"}</p>
    <p>Population: {a.context.population||"not reported"}</p>{a.context.statistics!==null&&<pre>{JSON.stringify(a.context.statistics,null,2)}</pre>}
    <p>{a.context.limitations.join(" ")}</p><small>Source ID: {a.sourceId} · {a.retention.replaceAll("_"," ")} · {a.license||"reuse license not supplied"}</small>
  </details>;
}
export default function SavedEvidence({gene,revision}:{gene:string;revision?:string}) {
  const [data,setData]=useState<EvidenceView>(),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  const [provider,setProvider]=useState(""),[classification,setClassification]=useState(""),[review,setReview]=useState("");
  const seq=useRef(0);
  useEffect(()=>{
    const id=++seq.current,abort=new AbortController();setLoading(true);setError("");setData(undefined);
    const params=new URLSearchParams({gene});if(provider)params.set("provider",provider);if(classification)params.set("classification",classification);if(review)params.set("review",review);
    fetch("/api/evidence?"+params,{signal:abort.signal}).then(async r=>{const d=await r.json() as EvidenceView & {error?:string};if(!r.ok)throw Error(d.error||"Saved evidence unavailable");if(id===seq.current)setData(d);})
      .catch(e=>{if(!abort.signal.aborted&&id===seq.current)setError(e.message);}).finally(()=>{if(id===seq.current)setLoading(false);});
    return()=>abort.abort();
  },[gene,revision,provider,classification,review]);
  return <section aria-labelledby="saved-evidence-heading" className="saved-evidence">
    <h2 id="saved-evidence-heading">Saved evidence & candidate discoveries: {gene}</h2>
    <p>Explore previously retrieved relationships without contacting providers. These are unreviewed source assertions and research prompts.</p>
    <fieldset className="evidence-filters"><legend>Combine assertion filters</legend>
      <label>Source<select value={provider} onChange={e=>setProvider(e.target.value)}><option value="">All sources</option><option>PanKgraph</option><option>Translator</option></select></label>
      <label>Evidence type<select value={classification} onChange={e=>setClassification(e.target.value)}><option value="">All types</option><option value="reported_association">Reported association</option><option value="provider_assertion">Provider assertion</option><option value="computational_inference">Computational inference</option></select></label>
      <label>Review state<select value={review} onChange={e=>setReview(e.target.value)}><option value="">All visible</option><option value="unreviewed">Unreviewed</option><option value="reviewed">Source reviewed</option></select></label>
    </fieldset>
    <p>Age at diagnosis, family history, HLA alleles, disease stage and participant-level filters are unavailable in this graph view. Unknown source metadata stays unknown.</p>
    <p role="status">{loading?"Loading saved evidence…":data?`${data.coverage.assertions} relationships · ${data.coverage.documents} literature / registry matches${data.coverage.bounded?" · display capped; more records are stored":""}`:""}</p>
    {error&&<p role="alert">{error}</p>}
    {data&&<SavedEvidenceResults data={data}/>}
  </section>;
}

export function SavedEvidenceResults({data}:{data:EvidenceView}) {
  return <><p>Last retrieval: {data.coverage.lastRetrieved||"No saved investigation yet"}. <a href="/api/evidence?coverage=1" target="_blank" rel="noreferrer">Source coverage and recent retrieval log ↗</a></p>
      {!data.assertions.length&&<p>No saved relationships match. Run a connected investigation or broaden the filters. This is not evidence of absence.</p>}
      {data.discoveries.map(d=><article key={d.id} className="connected-evidence"><small>{d.designation} · deterministic method v1</small><h3>{d.hypothesis}</h3>
        <p>{d.alreadyReported}</p><p>{d.uncertainty}</p>
        <details><summary>Source assertions behind this question ({d.supporting.length})</summary>{d.supporting.map(a=><AssertionSource key={a.id} assertion={a}/>)}</details>
        <details><summary>Contrary source assertions ({d.contradictory.length})</summary>{d.contradictory.length?d.contradictory.map(a=><AssertionSource key={a.id} assertion={a}/>):<p>No explicit negated edge was found in this bounded saved view. Opposing study outcomes have not been automatically assessed.</p>}</details>
        <details><summary>Evidence gaps & validation questions</summary><ul>{d.gaps.map(g=><li key={g}>{g}</li>)}</ul>{d.questions.map(q=><p key={q}>{q}</p>)}</details>
        <details><summary>Why this appears here: {d.priority.total} review-priority points</summary><p>{d.priority.meaning}</p><ul>{d.priority.factors.map(f=><li key={f.name}>{f.points}: {f.name}</li>)}</ul></details>
      </article>)}
      <details><summary>All saved relationships in this view ({data.assertions.length})</summary>{data.assertions.map(a=><AssertionSource key={a.id} assertion={a}/>)}</details>
      <details><summary>Related publications and trials ({data.documents.length})</summary><p>Search matches are contextual metadata, not automatically supporting findings. Registry references may describe the same study.</p>{data.documents.map(d=><article key={d.id} className="connected-evidence"><h3><a href={d.url} target="_blank" rel="noreferrer">{d.title} ↗</a></h3><p>{d.id} · {d.year} · {d.status||d.kind}</p>{d.whyStopped&&<p>Reported stop reason: {d.whyStopped}</p>}<p>{d.population||"Population not reported"}</p><a href={"/research"}>Search the full research collection →</a></article>)}</details>
      {!!data.collectionRecords?.length&&<details><summary>Matching records already in the research collection ({data.collectionRecords.length})</summary>{data.collectionRecords.map(r=><p key={r.id}><a href={"/api/research?id="+encodeURIComponent(r.id)} target="_blank" rel="noreferrer">{r.title} · {r.kind} ↗</a></p>)}</details>}
      {data.limitations.map(l=><small key={l}>{l}</small>)}
    </>;
}
