"use client";
import {useEffect,useRef,useState} from "react";
import {anchorFor,knownTrace,modes,type Trace} from "../research/trace";
import type {EvidenceCard} from "../research/types";

type Props={card:EvidenceCard;initial?:Trace;onSave?:(trace:Trace)=>Promise<void>;onAdd?:(id:string,reason:string)=>Promise<void>;included?:string[]};
export default function FindingTrace({card,initial,onSave,onAdd,included=[]}:Props){
 const [mode,select]=useState<number|null>(initial?0:null),[trace,setTrace]=useState<Trace|undefined>(initial),[loading,load]=useState(false),[error,fail]=useState(""),[saved,mark]=useState(Boolean(initial)),[saving,wait]=useState(false),[adding,lock]=useState("");
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function search(){
  if(controller.current)return;
  const ac=new AbortController();controller.current=ac;load(true);fail("");mark(false);
  if(!trace)setTrace(knownTrace(anchorFor(card)));
  try{const response=await fetch("/api/trace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(card),signal:ac.signal});
   if(!response.ok)throw Error("Search unavailable");const result=await response.json() as Trace;setTrace(result)
  }catch{if(!ac.signal.aborted)fail("Live search unavailable. Only previously loaded or source-checked records are shown.")}
  finally{controller.current=null;if(!ac.signal.aborted)load(false)}
 }
 function choose(index:number){select(index);if(!trace&&!loading)void search()}
 async function preserve(){if(!onSave||!trace)return;wait(true);try{await onSave(trace);mark(true)}catch{fail("Could not save this trace. Please retry.")}finally{wait(false)}}
 return <section className="finding-trace"><div className="trace-controls">{modes.map((m,i)=><button key={m} aria-pressed={mode===i} onClick={()=>choose(i)}>{m}</button>)}</div>
 {mode!==null&&trace&&<div className="trace-body"><h3>{modes[mode]}</h3><p role="status">{loading?"Checking references, citing papers and related studies…":error}</p>
 {mode===0?<>{trace.related.map(x=><article className="relation" key={x.id}><label>{x.relation}</label><h4>{x.title}</h4><small>{x.year} · {x.via}</small><p>{x.interpretation}</p><p>{x.reason}</p>{x.excerpt&&<blockquote>{x.excerpt}…</blockquote>}<a href={x.url} rel="noreferrer" target="_blank">{x.locator} ↗</a>{onAdd&&x.id.startsWith("pubmed-")&&<div><button disabled={Boolean(adding)||included.includes(x.id)} onClick={async()=>{lock(x.id);try{await onAdd(x.id,"Found by tracing "+card.title+": "+x.via)}finally{lock("")}}}>{included.includes(x.id)?"In investigation":adding===x.id?"Adding…":"Add to investigation"}</button></div>}</article>)}<p className="trace-gap">{trace.gap}</p></>:<>
 {trace.events.filter(e=>e.label!=="Hypothesis for expert review").sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999")).map((e,i)=><article className="trace-event" key={i}><small>{e.date||"Date unspecified"} · {e.label}</small><p>{e.text}</p><a href={e.url} target="_blank" rel="noreferrer">{e.locator} ↗</a></article>)}
 {!trace.events.some(e=>/status/i.test(e.label))&&<p className="trace-gap">Study status and any reason work stopped remain unverified in this trace.</p>}
 {!(trace.anchor.id==="atlas-vx264-cpep"||trace.anchor.id.startsWith("atlas-zim-"))&&<p className="trace-gap">Program status: no decision to discontinue the entire research program was verified in this trace. Trial completion and later publications are recorded separately.</p>}
 {trace.events.filter(e=>e.label==="Hypothesis for expert review").map(e=><div className="branch" key={e.label}><strong>{e.label}</strong><p>{e.text}</p>{e.refs?.map(r=><p key={r.url+r.title}><a href={r.url} title={r.locator} target="_blank" rel="noreferrer">{r.title} ↗</a></p>)}</div>)}
 </>}
 <details><summary>Search scope and date</summary><small>{trace.date} · Up to 25 records per direction or topic, up to eight selected candidates read. Citations indicate a paper-to-paper link; assessment considers participants and endpoints.</small>{trace.log.length?trace.log.map(s=><p key={s.scope}><b>{s.scope}</b><small>{s.query}<br/>{s.outcome}</small></p>):<small>Source-checked links only; no completed live search log.</small>}</details>
 <div className="trace-controls"><button onClick={search} disabled={loading}>Run search again</button>{onSave&&<button disabled={saved||saving||loading} onClick={preserve}>{saved?"Saved in notebook":saving?"Saving…":"Save trace to notebook"}</button>}</div>
 </div>}</section>
}
