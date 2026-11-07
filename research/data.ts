import seed from "./corpus.json";
import type {Corpus, Finding} from "./types";
export const data:Corpus = seed;
export const checked = "November 6, 2026";
export const records = new Map(data.records.map(r=>[r.id,r]));
export const findings = new Map(data.findings.map(f=>[f.id,f]));
export const families = new Map(data.families.map(f=>[f.id,f]));
export function familyOf(f:Finding){return families.get(records.get(f.record)!.family)!}
export function topic(f:Finding){
 if(f.mechanism==="Metabolic progression")return f.mechanism;
 const s=(f.mechanism+" "+f.factor+" "+f.title).toLowerCase();
 if(/anti-cd3|teplizumab|anti.cd3|hokt3/.test(s) && f.area==="Progression")return "T-cell modulation";
 if(f.area==="Curative research") return /encapsul|vx-264|device/.test(s)?"Cell encapsulation":"Islet replacement";
 if(/enterovirus|virome|viral|virus/.test(s))return "Viral exposure";
 if(/autoantibod|seroconversion/.test(s))return "Islet autoantibodies";
 if(/atg|globulin|g-csf/.test(s))return "Immune modulation";
 return "Islet immune response";
}
export const areas=["Causation","Progression","Curative research"];
export function cssArea(area:string){return ["cause","progress","cure"][areas.indexOf(area)]||"cause"}
export function rankedFindings(){
 const ids=["tn-delay","m120-cohorts","donor-anti-cd3","prot-negative","zim-insulin","protect-cpep"];
 const first=data.findings.find(f=>f.area==="Causation");
 return [...new Set([findings.get(ids[0]),first,...ids.slice(1).map(id=>findings.get(id)),...data.findings].filter((f):f is Finding=>!!f))];
}
