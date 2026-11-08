"use client";
import {useEffect,useState} from "react";
import type {CatalogView} from "../research/catalog/catalog";
const date=(v:string|null|undefined)=>v?new Date(v).toLocaleString():"Not yet recorded";
export function CatalogResults({data,onSelect,disabled=false}:{data:CatalogView;onSelect:(gene:string)=>void;disabled?:boolean}) {
 return <><div className="catalog-coverage"><h3>Source coverage and updates</h3><p>{data.coverage.genes} source-reported genes · {data.coverage.updated||0} with a successful background evidence refresh · {data.coverage.partial||0} partial · {data.coverage.failed||0} failed</p>
 <p>Catalog source: PanKgraph · Last page retrieved: {date(data.coverage.lastPage)} · Last completed catalog scan: {date(data.coverage.lastComplete)}</p>
 <p>Background collection: {data.coverage.backgroundEnabled?"enabled":"disabled in this environment"}. {data.coverage.scanInProgress?"Catalog scan in progress; coverage is partial.":""}</p>
 {data.coverage.error&&<p role="status">{data.coverage.error}</p>}
 <details><summary>Underlying sources and gene counts</summary><ul>{data.coverage.sources.map((s:any)=><li key={s.source}>{s.source}: {s.genes} genes</li>)}</ul></details>
 <details><summary>What this catalog covers—and what is missing</summary>{data.limitations.map(x=><p key={x}>{x}</p>)}</details></div>
 {!data.genes.length&&<p>No matching catalog entries are stored yet. The catalog becomes browsable after its first background import; you can still use the optional gene lookup below.</p>}
 <div className="connected-candidates catalog-grid">{data.genes.map(g=><article key={g.id}><h3><button className="catalog-gene" disabled={disabled} onClick={()=>onSelect(g.symbol)}>Explore {g.symbol} →</button></h3>
 <p><a href={"https://www.ensembl.org/Homo_sapiens/Gene/Summary?g="+encodeURIComponent(g.id.replace("ENSEMBL:",""))} target="_blank" rel="noreferrer">{g.id} ↗</a></p>
 <p>{g.document.predicates.map((x:string)=>x.replaceAll("_"," ")).join(" · ")} · Unreviewed source link</p>
 <p>{g.document.sources.join("; ")||"Underlying source not supplied"}</p>
 <p>Catalog last seen: {date(g.last_seen)}<br/>Evidence refresh: {g.status} · Last successful refresh: {date(g.last_success)}<br/>Last attempted: {date(g.last_attempt)}</p>
 <details><summary>Source trace and provider updates for {g.symbol}</summary><a href="https://pankbase.org/" target="_blank" rel="noreferrer">PanKbase / PanKgraph ↗</a><p>Target disease: MONDO:0005147. This is a source link, not proof of causation.</p><pre>{g.document.query}</pre><p>API endpoint: {g.document.endpoint}</p>{g.detail.map((d:any,i:number)=><p key={i}>{d.provider||"Background refresh"}: {d.status} {typeof d.count==="number"?`· ${d.count} records`:""} · {d.retrievedAt?date(d.retrievedAt):d.note}</p>)}</details>
 </article>)}</div></>;
}
export default function GeneCatalog({onSelect,disabled}:{onSelect:(gene:string)=>void;disabled:boolean}) {
 const [data,setData]=useState<CatalogView>(),[query,setQuery]=useState(""),[filter,setFilter]=useState(""),[after,setAfter]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError("");fetch("/api/genes?"+new URLSearchParams({q:filter,after}),{signal:abort.signal}).then(async r=>{const d=await r.json() as CatalogView & {error?:string};if(!r.ok)throw Error(d.error||"Catalog unavailable");return d}).then(setData).catch(e=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setLoading(false)});return ()=>abort.abort()},[filter,after]);
 return <section aria-labelledby="catalog-title" className="gene-catalog"><h2 id="catalog-title">Explore T1D-linked genes</h2><p>Choose a gene below to open its saved evidence and research questions. No gene name needed. You can request fresh connections after choosing a gene.</p>
 <form className="connected-search" onSubmit={e=>{e.preventDefault();setFilter(query.trim().toUpperCase());setAfter("")}}><label htmlFor="catalog-filter">Filter catalog by gene symbol (optional)</label><div><input id="catalog-filter" value={query} onChange={e=>setQuery(e.target.value)} maxLength={25} pattern="[A-Za-z][A-Za-z0-9-]{0,24}"/><button>Filter catalog</button><button type="button" onClick={()=>{setQuery("");setFilter("");setAfter("")}}>Show all</button></div></form>
 {loading?<p role="status">Loading gene catalog…</p>:error?<p role="alert">{error}</p>:data&&<><CatalogResults data={data} onSelect={onSelect} disabled={disabled}/><div className="connected-actions">{after&&<button onClick={()=>setAfter("")}>First page</button>}{data.next&&<button onClick={()=>setAfter(data.next!)}>Next genes →</button>}</div></>}
 </section>;
}
