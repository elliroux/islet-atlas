import { safeUrl, strings, type ConnectedRun, type GraphLink } from "../connectors/types";
import { PANKGRAPH } from "../connectors/pankgraph";
import { TRANSLATOR } from "../connectors/translator";
import type { Assertion, Entity, EvidenceBundle } from "./types";

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(v => stableJson(v ?? null)).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.entries(value).filter(([,v])=>v!==undefined)
    .sort(([a],[b])=>a.localeCompare(b,"en")).map(([k,v])=>JSON.stringify(k)+":"+stableJson(v)).join(",") + "}";
  return JSON.stringify(value ?? null);
}
export async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableJson(value)));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
/** Deliberately narrow, explicit mappings. Unknown CURIE namespaces are retained, never merged by name. */
export function canonicalId(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 180) return null;
  let id = raw.trim();
  if (/^ENSG\d+$/.test(id)) id = "ENSEMBL:" + id;
  id = id.replace(/^(GO|MONDO|HP|CHEBI|HGNC|UBERON|CL|NCBITaxon)_(\d+)$/, "$1:$2")
    .replace(/^PUBMED:/i,"PMID:").replace(/^pmid:/i,"PMID:");
  if (/^NCT\d{8}$/.test(id)) id = "ClinicalTrials:" + id;
  if (/^R-HSA-\d+$/.test(id)) id = "REACT:" + id;
  if (/^hsa_?\d{5}$/.test(id)) id = "KEGG:" + id.replace("_", "");
  return /^[A-Za-z][A-Za-z0-9_.-]{0,35}:[A-Za-z0-9][A-Za-z0-9_.:/-]{0,140}$/.test(id) ? id : null;
}
function category(id: string, raw: unknown): string {
  const categories = strings(raw);
  if (categories.length) return categories[0].slice(0,80);
  const prefix = id.split(":")[0];
  return ({ENSEMBL:"gene",NCBIGene:"gene",HGNC:"gene",CHEBI:"chemical",MONDO:"disease",GO:"biological_process",REACT:"pathway",KEGG:"pathway"} as Record<string,string>)[prefix] || "unknown";
}
const field = (p:Record<string,unknown>, ...keys:string[]) => {
  for(const key of keys) if(typeof p[key]==="string" && p[key]) return String(p[key]).slice(0,1000);
  return null;
};
export async function normalizeRun(run: ConnectedRun): Promise<EvidenceBundle> {
  const geneId=canonicalId(run.geneId), aliases=new Map<string,string>();
  const bundle:EvidenceBundle={runId:run.id,gene:run.gene,geneId,date:run.date,assertions:[],documents:run.evidence.map(r=>({...r,id:canonicalId(r.id)||r.id})),aliases:[],quarantined:[],queries:run.queries};
  const input:[GraphLink,string,string][]=[...run.links.map(l=>[l,"PanKgraph",PANKGRAPH] as [GraphLink,string,string]),...run.candidates.flatMap(c=>c.links.map(l=>[l,"Translator",TRANSLATOR] as [GraphLink,string,string]))];
  // TRAPI's result binding is explicit equivalence for the submitted identifier, not a name guess.
  for(const [link,provider] of input) if(provider==="Translator" && geneId) {
    const bound=canonicalId(link.properties.boundGeneId);
    if(bound && bound!==geneId && /^(NCBIGene|ENSEMBL|HGNC):/.test(bound)) aliases.set(bound,geneId);
  }
  const seen=new Set<string>();
  for(const [link,provider,endpoint] of input) {
    const p=link.properties, rawSubject=canonicalId(p.subjectId), rawObject=canonicalId(p.objectId);
    if(!rawSubject||!rawObject||!link.predicate||link.predicate.length>180) {
      bundle.quarantined.push({provider,sourceId:link.id,reason:"Missing or invalid endpoint identifier / predicate; direction cannot be persisted safely."});continue;
    }
    const entity=(id:string,name:string,categories:unknown):Entity=>({id:aliases.get(id)||id,name:name.slice(0,600),category:category(id,categories)});
    const subject=entity(rawSubject,link.subject,p.subjectCategories),object=entity(rawObject,link.object,p.objectCategories);
    const publications=[...new Set(link.publications.map(canonicalId).filter((x):x is string=>!!x&&/^(PMID|DOI):/.test(x)))].sort();
    const qualifiers=Array.isArray(p.qualifiers)?p.qualifiers:[];
    const direction=qualifiers.find(q=>q && typeof q==="object" && String(q.qualifier_type_id).endsWith("direction_qualifier"))?.qualifier_value;
    const sources=[...new Set(link.sources)].sort();
    // An assertion's identity is semantic and provenance-based, never a provider's response row number.
    const key={provider,subject:subject.id,object:object.id,predicate:link.predicate,sources,publications,
      qualifiers,negated:p.negated===true,species:p.species??p.taxon??null,tissue:p.tissue??null,population:p.population??null,
      sourceId:provider==="PanKgraph"?p.sourceRecordId??null:null};
    const id="assertion:"+await digest(key); if(seen.has(id))continue;seen.add(id);
    const license=field(p,"license","licence");
    const reusable=!!license && /^(cc[ -]by(?:[ -]\d(?:\.\d)?)?|cc0|public domain)$/i.test(license.trim());
    const urls=[...new Set(link.urls.map(safeUrl).filter((x):x is string=>!!x))];
    const sourceId=typeof p.sourceRecordId==="string"?p.sourceRecordId:provider==="Translator"?link.id:id;
    const a:Assertion={id,subject,object,predicate:link.predicate,provider,sourceId,sourceUrl:urls[0]||endpoint,
      retrievedAt:run.queries.find(q=>q.provider.startsWith(provider==="Translator"?"NCATS":"PanKgraph pathways"))?.retrievedAt||run.date,
      classification:link.kind==="Computational inference"?"computational_inference":link.kind==="Graph association"||p.knowledgeLevel==="statistical_association"?"reported_association":"provider_assertion",
      stance:p.negated===true?"negated":"reported",review:"unreviewed",publications,sources,urls,
      provenance:(Array.isArray(p.sourceChain)?p.sourceChain:[]).filter(s=>s&&typeof s.resource_id==="string").map(s=>({resourceId:s.resource_id,role:typeof s.resource_role==="string"?s.resource_role:null,upstream:strings(s.upstream_resource_ids)})),
      context:{species:field(p,"species","taxon"),tissue:field(p,"tissue"),population:field(p,"population"),direction:typeof direction==="string"?direction:field(p,"direction"),statistics:p.statistics??p.p_value??null,
        limitations:["Provider assertion; study design, causality and clinical relevance require source review.",...(!reusable?["Reuse terms not established: original attributes are not stored; references and factual relationship metadata only."]:[])]},
      original:reusable?p:null,originalHash:await digest(p),retention:reusable?"licensed_metadata":"references_only",license};
    bundle.assertions.push(a);
  }
  bundle.aliases=[...aliases].map(([id,canonical])=>({id,canonical}));
  return bundle;
}
