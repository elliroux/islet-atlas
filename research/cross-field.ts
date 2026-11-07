import {z} from "zod";

export const problems = [
  {id:"preserve", mission:"cure", title:"Keep beta cells alive", t1d:'(TXNIP OR "beta cell apoptosis" OR "oxidative stress")', mechanism:"beta cell apoptosis oxidative stress TXNIP", question:"Could an existing medicine help preserve insulin-producing cells?", other:'(TXNIP OR "oxidative stress") AND (cardiovascular OR neurodegeneration OR repurposing)'},
  {id:"immune", mission:"cure", title:"Reduce the immune attack", t1d:'("memory T cells" OR "immune tolerance")', mechanism:"autoreactive memory T cells immune tolerance", question:"Could an approach from another immune disease interrupt the attack on beta cells?", other:'("memory T cells" OR "immune tolerance") AND (psoriasis OR arthritis OR transplantation)'},
  {id:"graft", mission:"cure", title:"Help replacement cells survive", t1d:'(islet AND (hypoxia OR fibrosis OR vascularization))', mechanism:"transplant graft hypoxia fibrosis vascularization", question:"Could tissue engineering or transplantation research address loss of replacement islets?", other:'(hypoxia OR fibrosis OR vascularization) AND ("tissue engineering" OR "organ transplantation")'},
  {id:"trigger", mission:"cause", title:"Separate a trigger from an early sign", t1d:'(viral OR infection) AND (autoimmunity OR longitudinal)', mechanism:"viral infection autoimmunity temporal causal inference", question:"Could a method from infectious disease research distinguish a trigger from a consequence of T1D?", other:'("causal inference" OR longitudinal) AND (viral OR infection) AND autoimmunity'},
  {id:"genetic", mission:"cause", title:"Test whether a suspected exposure is causal", t1d:'"Mendelian randomization"', mechanism:"Mendelian randomization causal exposure autoimmune", question:"Could genetic causal-inference methods help test a suspected contributor to T1D?", other:'"Mendelian randomization" AND (autoimmune OR cardiovascular)'}
] as const;

export type CrossSource={id:string;title:string;year:string;url:string;abstract:string;roles:string[]};
export const candidateSchema=z.object({
  title:z.string().max(250), candidate:z.string().max(150),
  t1dIds:z.array(z.string()).min(1).max(3), otherIds:z.array(z.string()).min(1).max(3),
  observation:z.string().max(1000), bridge:z.string().max(1000),
  challenge:z.string().max(1000), experiment:z.string().max(1000),
  wouldWeaken:z.string().max(600), priorWork:z.string().max(600)
});
export type CrossCandidate=z.infer<typeof candidateSchema>;
export type CrossRun={problem:string;question:string;date:string;queries:{role:string;query:string;count:number}[];sources:CrossSource[];candidates:CrossCandidate[];notice:string;errors:string[]};
export function validCandidate(c:CrossCandidate,sources:CrossSource[]) {
  const relevant=(ids:string[],role:string)=>ids.every(id=>sources.some(s=>s.id===id&&s.roles.includes(role)));
  return relevant(c.t1dIds,"T1D")&&relevant(c.otherIds,"Other fields")&&c.otherIds.some(id=>!c.t1dIds.includes(id));
}
export function mergeSources(sources:CrossSource[]) {
  const unique=new Map<string,CrossSource>();
  for(const source of sources){
    const prior=unique.get(source.id);
    unique.set(source.id,{...source,roles:[...new Set([...(prior?.roles||[]),...source.roles])]});
  }
  return [...unique.values()];
}
export function searchQuery(terms:string,role:string) {
  const words=terms.match(/[\p{L}\p{N}-]+/gu)?.slice(0,16)||[];
  const phrase=words.map(w=>'"'+w+'"').join(" OR ");
  return '('+phrase+')'+(role==="T1D"?' AND ("type 1 diabetes" OR "type I diabetes")':"");
}
