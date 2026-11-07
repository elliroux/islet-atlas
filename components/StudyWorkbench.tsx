"use client";
import FindingTrace from "./FindingTrace";
import {useEffect,useState} from "react";
import type {Investigation,Node,SearchRun,StudyItem} from "../research/types";
import {data,familyOf,findings,records} from "../research/data";
import {downloadText,exportReport,parseSource,supplementTerms} from "../research/workbench";

type Props={doc:Investigation; node:Node; busy:boolean; setBusy:(value:boolean)=>void; save:(doc:Investigation)=>Promise<void>; ask:(question:string)=>void};
const comparedFields=["stage","design","endpoint","result","limit"] as const;
const fieldNames=["Disease stage","Study design","Endpoint and follow-up","Reported finding","Limitations and overlap"];
function RecordEditor({item,onCommit,busy}:{item:StudyItem;onCommit:(next:StudyItem)=>void;busy:boolean}){
 const [result,setResult]=useState(item.result),[family,setFamily]=useState(item.family),[reason,setReason]=useState(item.reason);
 return <details className="source-editor"><summary>Review or correct extraction</summary>
 <label>Finding in your words<textarea value={result} maxLength={3200} onChange={e=>setResult(e.target.value)}/></label>
 <label>Study family<input value={family} maxLength={180} onChange={e=>setFamily(e.target.value)}/></label>
 <label>Selection or exclusion reason<input value={reason} maxLength={400} onChange={e=>setReason(e.target.value)}/></label>
 <button disabled={busy||!result.trim()||!family.trim()||!reason.trim()} onClick={()=>{const now=new Date().toISOString();onCommit({...item,result:result.trim(),family:family.trim(),reason:reason.trim(),checked:now,originalResult:item.originalResult??item.result,edits:[...(item.edits||[]),{date:now,previous:item.result}]})}}>Save my source check</button>
 {item.originalResult&&<small>Original extraction: {item.originalResult}</small>}</details>
}
export default function StudyWorkbench({doc,node,busy,setBusy,save,ask}:Props){
 const studies=doc.studies||[],included=studies.filter(s=>!s.excluded);
 const hasSupplements=studies.some(s=>s.id==="pubmed-34913020");
 const [terms,T]=useState(hasSupplements?supplementTerms:""),[scope,Scope]=useState("t1d"),[identifier,Id]=useState("");
 const [message,Message]=useState(""),[conclusion,C]=useState(doc.conclusion||""),[follow,F]=useState("");
 const [first,A]=useState(hasSupplements?"pubmed-34913020":""),[second,B]=useState(hasSupplements?"pubmed-38441899":"");
 const [active,Active]=useState(hasSupplements?"pubmed-34913020":""),[atlasId,AtlasId]=useState("");
 useEffect(()=>{C(doc.conclusion||"")},[doc.id,doc.conclusion]);
 const left=included.find(s=>s.id===first)||included[0];const right=included.find(s=>s.id===second&&s.id!==left?.id)||included.find(s=>s.id!==left?.id);
 async function mutate(next:Investigation){setBusy(true);try{await save(next)}finally{setBusy(false)}}
 async function add(ref:string,reason:string){
  if(busy)return;Message("");const parsed=parseSource(ref);
  if(!parsed){Message("Enter a PubMed ID, DOI, trial ID, or record URL.");return}
  const exists=studies.find(s=>s.id===parsed);if(exists){Active(exists.id);Message("Already in this investigation.");return}
  if(studies.length>=48){Message("This investigation holds up to 48 sources. Start another investigation for additional records.");return}
  setBusy(true);try{const r=await fetch("/api/source",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({identifier:ref,question:doc.original})});
   const v=await r.json() as {study?:StudyItem;error?:string;notice?:string};if(!v.study)throw Error(v.error||"Source unavailable.");
   if(studies.some(s=>s.id===v.study!.id)){Message("Already in this investigation.");return}
   const item={...v.study,reason};await save({...doc,studies:[...studies,item]});Active(item.id);Id("");Message(v.notice||"Added to investigation. Future answers can cite this source.");
  }catch(e){Message(e instanceof Error?e.message:"Could not add record.")}finally{setBusy(false)}
 }
 async function search(){
  setBusy(true);Message("");try{const r=await fetch("/api/literature?scope="+scope+"&q="+encodeURIComponent(terms));if(!r.ok)throw Error();
   const run=await r.json() as SearchRun;await save({...doc,nodes:doc.nodes.map(n=>n.id===node.id?{...n,searches:[...n.searches,run]}:n)});
  }catch{Message("Search unavailable. Retry or use a record identifier.")}finally{setBusy(false)}
 }
 const update=(item:StudyItem)=>mutate({...doc,studies:studies.map(s=>s.id===item.id?item:s)});
 async function addAtlas(){
 const f=findings.get(atlasId);if(!f||busy||studies.length>=48)return;
 const id="atlas-"+f.id;if(studies.some(s=>s.id===id)){Active(id);return}
 const record=records.get(f.record)!;
 const item:StudyItem={id,title:f.title,url:f.url,year:record.year,family:familyOf(f).name,stage:f.stage,design:f.evidence+" · "+f.population+" · "+f.factor+" vs "+f.comparator,endpoint:f.endpoint+" · "+f.followup,result:f.effect+" "+f.uncertainty,limit:f.limitation+" Harms: "+f.harms,locator:f.locator,access:record.access,status:"Atlas finding",reason:"Selected from reviewed atlas.",added:new Date().toISOString()};
 await mutate({...doc,studies:[...studies,item]});Active(id);AtlasId("");
 }
 const selected=studies.find(s=>s.id===active);
 return <section className="workbench" aria-label="Investigation workspace"><div className="benchhead"><div><label>Investigation workspace</label><h2>My evidence</h2></div><span>{included.length} included · {studies.length-included.length} excluded</span></div>
 <h3>Find another study</h3><form className="searchbox" onSubmit={e=>{e.preventDefault();void search()}}><input aria-label="Search literature" placeholder="Search terms, intervention, or endpoint" maxLength={400} value={terms} onChange={e=>T(e.target.value)}/><select aria-label="Search scope" value={scope} onChange={e=>Scope(e.target.value)}><option value="t1d">Type 1 diabetes</option><option value="adjacent">Include adjacent fields</option></select><button disabled={busy||!terms.trim()}>Search public records</button></form>
 <form className="searchbox" onSubmit={e=>{e.preventDefault();void add(identifier,"Added directly by identifier.")}}><input aria-label="Study identifier" value={identifier} onChange={e=>Id(e.target.value)} placeholder="Or enter a PMID, DOI, or NCT number" maxLength={300}/><button disabled={busy||!identifier.trim()}>Add to investigation</button></form>
 <details><summary>Add a reviewed finding from the Atlas</summary><div className="searchbox"><select aria-label="Atlas finding" value={atlasId} onChange={e=>AtlasId(e.target.value)}><option value="">Choose a finding</option>{data.findings.map(f=><option key={f.id} value={f.id}>{f.title}</option>)}</select><button disabled={busy||!atlasId||studies.length>=48} onClick={addAtlas}>Add Atlas finding</button></div></details>
 <p role="status">{busy?"Working…":message}</p>
 {node.searches.slice().reverse().map((s,i)=><details open={i===0} key={s.date}><summary>{s.query} · {s.hits.length} results</summary><small>{s.scope} · {s.date}</small>{s.errors.map(e=><p key={e}>{e}</p>)}{s.hits.map(h=>{const existing=studies.some(x=>x.id===parseSource(h.url));return <div className="searchhit" key={h.url}><div><a href={h.url} target="_blank" rel="noreferrer">{h.title} ↗</a><small>{h.source} · {h.year}</small></div><button disabled={busy||existing} onClick={()=>add(h.url,"Found with search: "+s.query)}>{existing?"Added":"Add to investigation"}</button></div>})}{!s.hits.length&&!s.errors.length&&<small>No matches. Try a broader query.</small>}</details>)}
 <h3>Selected sources</h3>{!studies.length&&<p>Add a public record to extract and check a finding.</p>}
 {studies.map(s=><button className={"studyrow"+(s.id===active?" chosen":"")} key={s.id} onClick={()=>Active(s.id===active?"":s.id)}><span>{s.title}</span><small>{s.year} · {s.excluded?"Excluded":s.status} · {s.family}</small></button>)}
 {selected&&<div className="inspect"><label>{selected.checked?"Researcher-checked":selected.status}</label><h3>{selected.title}</h3><p>{selected.result}</p><p>{selected.limit}</p>{selected.excerpt&&<blockquote>{selected.excerpt}</blockquote>}<a href={selected.extractedFrom||selected.url} target="_blank" rel="noreferrer">Inspect source passage ↗</a><small>{selected.locator} · {selected.access}</small><FindingTrace key={selected.id} card={selected} onAdd={add} included={studies.map(s=>s.id)} onSave={t=>mutate({...doc,traces:[...(doc.traces||[]),t]})}/><RecordEditor key={selected.id+selected.checked} item={selected} busy={busy} onCommit={update}/><button disabled={busy} onClick={()=>update({...selected,excluded:!selected.excluded})}>{selected.excluded?"Include again":"Exclude from future answers"}</button></div>}
 {left&&right&&<><h3>Compare selected studies</h3><div className="pair">{[[left,A],[right,B]].map(([s,fn],i)=><select aria-label={i?"Right study":"Left study"} value={(s as StudyItem).id} key={i} onChange={e=>(fn as (v:string)=>void)(e.target.value)}>{included.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select>)}</div>
 <div className="overlap">{(left.family===right.family&&left.family!=="Overlap unverified")||(/NCT\d{8}/.test(left.family)&&left.family.match(/NCT\d{8}/)?.[0]===right.family.match(/NCT\d{8}/)?.[0])?"Shared study family. These reports cannot count as independent replications.":left.family==="Overlap unverified"||right.family==="Overlap unverified"?"Participant overlap is unverified. Check enrollment and registry identifiers.":[left,right].some(s=>s.id==="pubmed-39194033")&&[left,right].some(s=>["pubmed-34913020","pubmed-38441899"].includes(s.id))?"The review reuses the vitamin D2 trial. These are overlapping sources.":"Separate study families. Check intervention, stage and endpoint before judging replication."}</div>
 <div className="tablewrap"><table><thead><tr><th>Compare</th>{[left,right].map(x=><th key={x.id}><a href={x.url} target="_blank" rel="noreferrer">{x.title} ↗</a></th>)}</tr></thead><tbody>{comparedFields.map((k,i)=><tr key={k}><th>{fieldNames[i]}</th><td>{left[k]}</td><td>{right[k]}</td></tr>)}</tbody></table></div></>}
 <h3>Ask about the included evidence</h3><form className="searchbox" onSubmit={e=>{e.preventDefault();ask(follow.trim());F("")}}><input aria-label="Evidence follow-up question" value={follow} onChange={e=>F(e.target.value)} maxLength={1500} placeholder="What do these studies establish together?"/><button disabled={busy||!follow.trim()}>Ask follow-up</button></form>
 <button disabled={busy||!included.length} onClick={()=>ask(doc.original)}>Reassess original question with these sources</button>
 {(doc.traces||[]).length>0&&<><h3>Saved finding traces</h3>{doc.traces!.map(t=><details key={t.anchor.id+t.date}><summary>{t.anchor.title} · {new Date(t.date).toLocaleDateString()}</summary><FindingTrace card={t.anchor} initial={t} onAdd={add} included={studies.map(s=>s.id)} onSave={next=>mutate({...doc,traces:[...(doc.traces||[]),next]})}/></details>)}</>}
 <h3>My conclusion</h3><textarea aria-label="My conclusion" maxLength={8000} value={conclusion} onChange={e=>C(e.target.value)} placeholder="Record your interpretation and what would change it."/>{conclusion!==(doc.conclusion||"")&&<small>Unsaved draft</small>}<button disabled={busy||conclusion===(doc.conclusion||"")} onClick={()=>mutate({...doc,conclusion})}>Save conclusion</button>
 <button disabled={busy||conclusion!==(doc.conclusion||"")} onClick={()=>downloadText("islet-investigation.md",exportReport(doc),"text/markdown")}>Export report</button>
 </section>
}
