import {data, familyOf, findings, topic} from "./data";
import {leads} from "./leads";
import type {Finding} from "./types";

export const missions = ["What causes T1D?", "How do we cure T1D?"] as const;
export type Mission = typeof missions[number];
export type Connection = {
  id:string; title:string; kind:string; sources:Finding[]; anchors:Finding[];
  reason:string; challenge:string; scope:string; test:string;
};
const causes = missions[0];

function eligible(f:Finding, mission:Mission) {
  return f.area === (mission === causes ? "Causation" : "Curative research");
}

// Conservative annotations. Age at entry and age at diagnosis have separate fields.
export function variables(f:Finding) {
  const family = familyOf(f).id;
  const context:string[] = [];
  if (/children|ages 8–|aged 5–26/i.test(f.population)) context.push("Includes children");
  if (/adults|42-year-old|8–49|8–35|5–26/i.test(f.population)) context.push("Includes adults");
  if (/relatives/i.test(f.population)) context.push("Includes relatives with T1D in the family");
  if (family === "up421") context.push("Childhood diagnosis (about age 5)");
  if (family === "protect") context.push("Enrolled ages 8–17");
  if (family === "tn10") context.push("Enrolled ages 8–49");
  if (family === "forward" && f.population.includes("24–60")) context.push("Full-dose group ages 24–60");
  return context;
}

function makePairs(mission:Mission):Connection[] {
  const pairs:Connection[] = [];
  for (const [index,a] of data.findings.entries()) {
    for (const b of data.findings.slice(index+1)) {
      if (!eligible(a,mission) && !eligible(b,mission)) continue;
      if (familyOf(a).id === familyOf(b).id || topic(a) !== topic(b)) continue;
      pairs.push({
        id:a.id+"~"+b.id, kind:"Suggested study pair", sources:[a,b], anchors:[a,b],
        title:familyOf(a).name+" and "+familyOf(b).name+" · "+topic(a),
        reason:"These findings share a research topic and come from different study groups. Compare their populations, measurements and timing below.",
        challenge:a.limitation+" "+b.limitation,
        scope:"Matched within the reviewed Atlas collection. Participant overlap and prior direct tests require a separate check.",
        test:"Check for shared participants and comparable measurements. Then look for a study that measures both outcomes in the same population and reports their relationship."
      });
    }
  }
  return pairs;
}

export function discover(mission:Mission, selected:string[], search:string) {
  const reviewed:Connection[] = leads.filter(l=>mission===causes ? l.id==="virus" : l.id!=="virus").map(l=>{
    const sources=l.sourceIds.map(id=>findings.get(id)!);
    return {id:l.id,title:l.title,kind:"Reviewed hypothesis",sources,anchors:sources,reason:l.observation+" "+l.inference,challenge:l.challenge,scope:l.search,test:l.test};
  });
  if (mission===causes) {
    const sources=["islet-cd8","cd8-coculture"].map(id=>findings.get(id)!);
    reviewed.push({
      id:"tissue-and-assay", title:"Do the T cells seen in pancreatic tissue recognize the same target that allowed a T cell to damage islets in the lab?",
      kind:"Proposed research question", sources, anchors:sources,
      reason:"One team located islet-reactive T cells in donor pancreases. Another showed that a T cell recognizing a particular insulin precursor could damage compatible human islets in the lab. The two observations raise a question about which cells actually contribute to injury in tissue.",
      challenge:"Tissue collected after diagnosis cannot establish what initiated disease. A single laboratory clone can show what is possible without establishing how often it happens.",
      scope:"These two records address different parts of the question. This edition has not checked the wider literature for a direct test.",
      test:"Identify insulin-precursor-reactive cells in compatible donor tissue, compare islets with and without injury, and test the recovered cells against matched islets with specificity controls."
    });
  }
  const pairs=makePairs(mission).filter(pair=>!reviewed.some(l=>pair.sources.every(f=>l.sources.includes(f))));
  return [...reviewed,...pairs].filter(c=>c.anchors.some(f=>{
    const tags=variables(f);
    const description=[f.title,f.population,f.stage,f.factor,f.mechanism,f.endpoint,familyOf(f).name].join(" ").toLowerCase();
    return selected.every(s=>tags.includes(s)) && description.includes(search.trim().toLowerCase());
  }));
}
