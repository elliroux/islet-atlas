"use client";
import {useState} from "react";
import {discover,missions,type Mission} from "../research/discovery";
import {familyOf} from "../research/data";

const groups = [
  ["Participants", "Includes children", "Includes adults", "Enrolled ages 8–17", "Enrolled ages 8–49", "Full-dose group ages 24–60"],
  ["Age at diagnosis", "Childhood diagnosis (about age 5)"],
  ["Family history", "Includes relatives with T1D in the family"]
];

export default function ConnectionExplorer({inspect,investigate}:{inspect:(id:string)=>void;investigate:(q:string)=>void}) {
  const [mission,setMission]=useState<Mission>(missions[0]);
  const [started,start]=useState(false);
  const [selected,select]=useState<string[]>([]);
  const [search,setSearch]=useState("");
  const results=discover(mission,selected,search);
  function toggle(value:string){select(old=>old.includes(value)?old.filter(x=>x!==value):[...old,value]);}
  return <div className="discovery">
    <div className="mission-buttons">{missions.map(m=><button key={m} aria-pressed={m===mission} onClick={()=>setMission(m)}>{m}</button>)}</div>
    <button className="find-connections" onClick={()=>start(true)}>Find connections</button>
    {started && <>
      <details className="narrow"><summary>Narrow by study variables</summary>
        <p>Selections must appear together in one finding. Other findings in the connection supply context. These filters describe studies, rather than individual participant outcomes.</p>
        {groups.map(([label,...options])=><fieldset key={label}><legend>{label}</legend>{options.map(value=><button key={value} aria-pressed={selected.includes(value)} onClick={()=>toggle(value)}>{value}</button>)}</fieldset>)}
        <label htmlFor="study-topic">Studies involving</label>
        <input id="study-topic" value={search} placeholder="e.g. TEDDY, enterovirus, islets" onChange={e=>setSearch(e.target.value)}/>
        <small>Family relationship types and diagnosis ages are shown only where the collection identifies them. The childhood diagnosis estimate uses reported age and disease duration in the UP421 case.</small>
      </details>
      <p role="status">{results.length} connections in the reviewed collection{selected.length+Number(Boolean(search))>0?" · "+[...selected,search].filter(Boolean).join(" · "):""}</p>
      {(selected.length>0 || search) && <button onClick={()=>{select([]);setSearch("");}}>Clear filters</button>}
      {!results.length && <p>No indexed finding in this collection matches these selections together. Try removing one variable.</p>}
      {results.map(c=><details className="connection" key={c.id}><summary><small>{c.kind}</small><strong>{c.title}</strong></summary>
        <p>{c.reason}</p><div className="finding-pair">{c.sources.map(f=><section key={f.id}>
          <small>{familyOf(f).name}</small><strong>{f.title}</strong><p>{f.summary}</p><small>{f.population}</small>
          <button onClick={()=>inspect(f.id)}>Inspect finding</button> <a href={f.url} target="_blank" rel="noreferrer">Source ↗</a><small>{f.locator}</small>
        </section>)}</div>
        <h3>What challenges this idea?</h3><p>{c.challenge}</p>
        <h3>Has anyone tested it?</h3><p>{c.scope}</p>
        <h3>What could settle it?</h3><p>{c.test}</p>
        <button onClick={()=>investigate(c.title+" Compare "+c.sources.map(f=>f.title).join(" and ")+".")}>Investigate this question →</button>
      </details>)}
    </>}
  </div>
}
