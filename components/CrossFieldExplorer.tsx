"use client";
import {useEffect,useRef,useState} from "react";
import {problems,type CrossRun} from "../research/cross-field";
import type {Mission} from "../research/discovery";

export default function CrossFieldExplorer({mission}:{mission:Mission}){
  const options=problems.filter(p=>p.mission===(mission==="What causes T1D?"?"cause":"cure"));
  const [problem,setProblem]=useState<string>(options[0].id);
  const [question,setQuestion]=useState("");
  const [terms,setTerms]=useState("");
  const [run,setRun]=useState<CrossRun>();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState<CrossRun[]>([]);
  const [saveMessage,setSaveMessage]=useState("");
  const request=useRef(0);
  useEffect(()=>{
    try{
      const entries=JSON.parse(localStorage.getItem("atlas-cross-field")||"[]");
      if(Array.isArray(entries))setSaved(entries.filter(s=>s&&typeof s.date==="string"&&typeof s.question==="string"&&Array.isArray(s.sources)&&Array.isArray(s.candidates)&&Array.isArray(s.queries)&&Array.isArray(s.errors)).slice(0,20));
    }catch{}
    return ()=>{request.current++};
  },[]);
  const current=options.find(p=>p.id===problem)||options[0];
  async function search(){
    const sequence=++request.current;
    setBusy(true);setError("");setRun(undefined);setSaveMessage("");
    try{
      const response=await fetch("/api/cross-field",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({problem:current.id,question,terms})});
      const result=await response.json() as CrossRun & {error?:string};
      if(!response.ok)throw Error(result.error||"Search unavailable.");
      if(sequence===request.current)setRun(result);
    }catch(e){setError(e instanceof Error?e.message:"Search unavailable.")}
    finally{if(sequence===request.current)setBusy(false)}
  }
  function save(){
    if(!run)return;
    const next=[run,...saved.filter(s=>s.date!==run.date)].slice(0,20);
    try{localStorage.setItem("atlas-cross-field",JSON.stringify(next));setSaved(next);setSaveMessage("Saved on this device.")}
    catch{setSaveMessage("Device storage is unavailable. This investigation could not be saved.")}
  }
  return <section className="cross-field">
    <h2>Look across other fields</h2>
    <p>Start with an unsolved T1D problem. Search for medicines, mechanisms and methods that another field could contribute.</p>
    <form onSubmit={e=>{e.preventDefault();void search()}}>
      <label htmlFor="cross-problem">Research problem</label>
      <select id="cross-problem" value={current.id} disabled={busy} onChange={e=>{setProblem(e.target.value);setRun(undefined);setQuestion("");setTerms("");}}>{options.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
      <label htmlFor="cross-question">Your research question (optional)</label>
      <textarea id="cross-question" disabled={busy} value={question} maxLength={800} placeholder={current.question} onChange={e=>setQuestion(e.target.value)}/>
      <label htmlFor="cross-terms">Mechanism or exposure to search (optional)</label>
      <input id="cross-terms" disabled={busy} value={terms} maxLength={200} placeholder={current.mechanism} onChange={e=>setTerms(e.target.value)}/>
      <small>The problem and mechanism terms drive retrieval. Your question guides the interpretation of retrieved studies.</small>
      <button className="find-connections" disabled={busy}>{busy?"Searching across fields…":"Search across fields"}</button>
    </form>
    <p role="status">{error||run?.notice}</p>{process.env.NEXT_PUBLIC_ATLAS_STANDALONE!=="true"&&run?.notice.includes("configured maintainer")&&<a href="/signin-with-chatgpt?return_to=%2F">Sign in for maintainer AI access ↗</a>}
    {run&&<div>
      <h3>{run.question}</h3>
      <small>{new Date(run.date).toLocaleString()} · Stored research plus up to eight records per live search · Focused prior-testing results appear in the search log. Titles require inspection before deciding whether the exact idea was tested.</small>
      {run.errors.map(e=><p key={e}>{e}</p>)}
      {run.candidates.map((c,i)=><section className="connection" key={i}>
        <small>AI-generated hypothesis · {c.candidate}</small><h3>{c.title}</h3>
        <h4>What the studies observed</h4><p>{c.observation}</p>
        <div className="finding-pair">{[["T1D evidence",c.t1dIds],["Evidence from another field",c.otherIds]].map(([title,ids])=><section key={title as string}><strong>{title}</strong>{(ids as string[]).map(id=>{const s=run.sources.find(s=>s.id===id)!;return <p key={id}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><small>{s.year} · Source record</small></p>})}</section>)}</div>
        <h4>Why it could connect</h4><p>{c.bridge}</p>
        <h4>Where the analogy could break</h4><p>{c.challenge}</p>
        <h4>Prior testing in the retrieved evidence</h4><p>{c.priorWork}</p>
        <h4>First experiment</h4><p>{c.experiment}</p>
        <h4>What would weaken the idea</h4><p>{c.wouldWeaken}</p>
      </section>)}
      <details><summary>Inspect searches and {run.sources.length} retrieved records</summary>
        {run.queries.map(q=><p key={q.role+q.query}><strong>{q.role}</strong><br/>{q.query}<small>{q.count} records</small></p>)}
        {run.sources.map(s=><p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><small>{s.year} · {s.roles.join(" / ")} · Candidate record</small></p>)}
      </details>
      <button onClick={save}>Save investigation on this device</button><small role="status">{saveMessage}</small>
    </div>}
    {saved.length>0&&<details><summary>Saved cross-field investigations ({saved.length})</summary>{saved.map(s=><p key={s.date}><button disabled={busy} onClick={()=>{setRun(s);setError("");setSaveMessage("");}}>{s.question}</button><small>{new Date(s.date).toLocaleString()}</small></p>)}</details>}
    {mission==="How do we cure T1D?"&&<details className="connection">
      <summary>Replay a known connection · Verapamil</summary>
      <p>This worked example separates early evidence from later outcomes. Model training can contain later results, so this replay demonstrates the reasoning. Discovery accuracy requires a separate evaluation.</p>
      <h3>Early evidence</h3>
      <p>Cardiac experiments linked verapamil with lower TXNIP expression. Later cell and mouse work examined whether the same route could preserve beta cells.</p>
      <p><a href="https://pubmed.ncbi.nlm.nih.gov/19258488/" target="_blank" rel="noreferrer">Cardiac TXNIP study, 2009 ↗</a><br/><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3314354/" target="_blank" rel="noreferrer">Beta-cell experiments, 2012 ↗</a></p>
      <h3>The question to test</h3><p>Could this existing cardiovascular medicine preserve insulin secretion after T1D diagnosis? A placebo-controlled trial measuring stimulated C-peptide could test translation from laboratory work to people.</p>
      <h3>Where the bridge could fail</h3><p>Effects in cells or mice may fail to translate to people. Preserving beta cells and controlling immune-mediated destruction require separate evidence.</p>
      <details><summary>Reveal the later pediatric trial</summary><p>In a randomized trial of 88 newly diagnosed children and adolescents, stimulated C-peptide at 52 weeks was about 30% higher with verapamil than placebo. The study evaluated preservation over one year.</p><a href="https://pubmed.ncbi.nlm.nih.gov/36826844/" target="_blank" rel="noreferrer">Read the 2023 trial ↗</a></details>
    </details>}
  </section>
}
