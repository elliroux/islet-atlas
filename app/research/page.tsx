"use client";
import {useEffect,useRef,useState} from "react";

type Row={id:string;title:string;kind:string;provider:string;year:number;url:string;full_text_status:string};
type Coverage={counts:{provider:string;kind:string;count:number;withAbstract:number;withFullText:number;eligibleFullText:number}[];imports:{id:string;state:string;total:number;processed:number;updated:string;error:string|null}[];runs:{id:string;source:string;count:number;status:string;detail:string;created:string}[];collections:{id:string;name:string;description:string;query:string}[]};
type Detail=Row&{document:Record<string,unknown>;doi:string|null;pmcid:string|null;license:string|null;abstractAvailable:boolean;fullTextCharacters:number;linkedRecords:{id:string;title:string;url:string}[]};
export default function Research(){
 const [stats,setStats]=useState<Coverage>(),[rows,setRows]=useState<Row[]>([]),[q,setQ]=useState(""),[kind,setKind]=useState(""),[offset,setOffset]=useState(0),[total,setTotal]=useState(0),[busy,setBusy]=useState(""),[notice,setNotice]=useState(""),[detail,setDetail]=useState<Detail|null>(null);
 const stop=useRef(false),searchId=useRef(0);
 async function refresh(){const r=await fetch("/api/research");if(!r.ok)throw Error("Coverage is temporarily unavailable.");setStats(await r.json() as Coverage);}
 async function search(query=q,start=offset,filter=kind){
  const id=++searchId.current;
  const r=await fetch("/api/research?"+new URLSearchParams({q:query,offset:String(start),kind:filter}));
  if(!r.ok)throw Error("Search is temporarily unavailable.");
  const result=await r.json() as {records:Row[];total:number};
  if(id===searchId.current){setRows(result.records);setTotal(result.total);}
 }
 useEffect(()=>{void refresh().catch(e=>setNotice(e.message));return()=>{stop.current=true;searchId.current++}},[]);
 useEffect(()=>{const timer=setTimeout(()=>{void search(q,offset,kind).catch(e=>setNotice(e.message))},250);return()=>clearTimeout(timer)},[q,offset,kind]);
 async function ingest(source:string){
  stop.current=false;setBusy(source);setNotice("Importing and saving research…");
  try{
   for(let i=0;i<10&&!stop.current;i++){
    const r=await fetch("/api/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source})});
    const result=await r.json() as {error?:string;count:number;complete?:boolean;busy?:boolean;message?:string};
    if(!r.ok)throw Error(result.error||"Import failed");
    await refresh();setNotice(result.message||"Saved "+result.count+" records in the latest batch.");
    if(result.complete||result.busy)break;
   }
   await search();
  }catch(e){setNotice((e instanceof Error?e.message:"Import interrupted")+". Resume from the saved checkpoint.")}
  finally{setBusy("");}
 }
 async function inspect(id:string){
  setDetail(null);
  try{const r=await fetch("/api/research?id="+encodeURIComponent(id));if(!r.ok)throw Error("Record unavailable");setDetail(await r.json() as Detail)}
  catch{setNotice("Record details could not be loaded. Retry.")}
 }
 return <main className="foundation-page">
  <a href="/">← Islet Atlas</a><h1>Research collection</h1>
  <p>Search the evidence accumulated by Islet Atlas. Import progress and source coverage are recorded with each batch.</p>
  <div className="coverage-grid">
   <section><strong>{stats?.counts.reduce((n,r)=>n+r.count,0).toLocaleString()||"0"}</strong><span>stored records</span></section>
   <section><strong>{stats?.counts.reduce((n,r)=>n+r.withAbstract,0).toLocaleString()||"0"}</strong><span>abstracts or summaries</span></section>
   <section><strong>{stats?.counts.reduce((n,r)=>n+r.withFullText,0).toLocaleString()||"0"}</strong><span>indexed article bodies</span></section>
  </div>
  <p role="status">{notice}</p>
  <details open><summary>Coverage and imports</summary>
   <p>Each run imports up to ten batches. Closing this page stops after the current batch. Resume continues from the saved checkpoint. Completed scans can refresh after 24 hours.</p>
   <div className="coverage-grid">{stats?.collections.map(c=>{const state=stats.imports.find(s=>s.id===c.id);return <section key={c.id}>
    <h2>{c.name}</h2><p>{c.description}</p>
    <p>{state?.state||"Ready to import"}{state&&c.id!=="fulltext"?" · "+state.processed.toLocaleString()+" processed / "+state.total.toLocaleString()+" source matches":""}</p>
    {state?.updated&&<small>Last successful batch {new Date(state.updated).toLocaleString()}</small>}
    {state?.error&&<p>{state.error}</p>}
    <button disabled={!!busy} onClick={()=>void ingest(c.id)}>{busy===c.id?"Importing…":"Import / resume"}</button>
    <details><summary>Source query</summary><p>{c.query}</p></details>
   </section>})}</div>
   {busy&&<button onClick={()=>{stop.current=true;setNotice("Stopping after this batch is saved.");}}>Stop after this batch</button>}
   <p>Source-match totals describe these queries. Full text is indexed when an explicit supported reuse license is supplied. Participant-level cohort data still require access from their custodians.</p>
  </details>
  <h2>Search stored research</h2>
  <div className="foundation-search"><input aria-label="Search stored research" placeholder="Gene, medicine, exposure, outcome…" value={q} onChange={e=>{setQ(e.target.value);setOffset(0)}}/><select aria-label="Record type" value={kind} onChange={e=>{setKind(e.target.value);setOffset(0)}}><option value="">All record types</option><option>Publication</option><option>Trial</option><option>Reviewed finding</option></select></div>
  <p>{total.toLocaleString()} matches · terms are matched across titles, abstracts and indexed article bodies.</p>
  {rows.map(r=><section className="foundation-record" key={r.id}><small>{r.provider} · {r.kind} · {r.year||"Year unspecified"}</small><h3><button onClick={()=>void inspect(r.id)}>{r.title}</button></h3><small>{r.full_text_status}</small><a href={r.url} target="_blank" rel="noreferrer">Original source ↗</a></section>)}
  <div className="foundation-search"><button disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-30))}>Previous</button><span>{total?offset+1:0}–{Math.min(offset+30,total)}</span><button disabled={offset+30>=total} onClick={()=>setOffset(offset+30)}>Next</button></div>
  {detail&&<section className="record-detail" role="dialog" aria-label="Research record" aria-modal="true"><button onClick={()=>setDetail(null)}>Close</button><h2>{detail.title}</h2><p>{detail.abstractAvailable?"Abstract or summary indexed. ":""}{detail.fullTextCharacters?detail.fullTextCharacters.toLocaleString()+" full-text characters indexed.":detail.full_text_status}</p><p>{detail.doi?"DOI "+detail.doi:""} {detail.license?" · License "+detail.license:""}</p><a href={detail.url} target="_blank" rel="noreferrer">Read original source ↗</a>
  {detail.pmcid&&<p><a href={"https://pmc.ncbi.nlm.nih.gov/articles/"+detail.pmcid+"/"} target="_blank" rel="noreferrer">Read article body ↗</a></p>}
  {detail.linkedRecords.map(r=><p key={r.id}><a href={r.url} target="_blank" rel="noreferrer">Linked publication · {r.title} ↗</a></p>)}
  <h3>Source-reported fields</h3><pre>{JSON.stringify(detail.document,null,2)}</pre></section>}
  <details><summary>Recent import activity</summary>{stats?.runs.map(r=><p key={r.id}>{r.source} · {r.status} · {r.count} records<small>{r.detail} · {new Date(r.created).toLocaleString()}</small></p>)}</details>
 </main>;
}
