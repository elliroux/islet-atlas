import type { ConnectedRun } from "../connectors/types";
import { digest, normalizeRun, stableJson } from "./normalize";
import { discoverEvidence } from "./discovery";
import type { EvidenceBundle, EvidenceDocument, EvidenceView, SavedAssertion } from "./types";

/** Parameterized set inserts keep a bounded investigation within one D1 transaction and few queries. */
export async function persistBundle(db:D1Database, bundle:EvidenceBundle) {
  if(bundle.assertions.length>224 || bundle.documents.length>20) throw Error("Evidence batch limit exceeded");
  const assertions=await Promise.all(bundle.assertions.map(async a=>{
    const {retrievedAt,...content}=a;
    return {...a,version:"version:"+await digest(content)};
  }));
  const documents=await Promise.all(bundle.documents.map(async d=>({id:d.id,document:d,version:"document:"+await digest(d)})));
  const entities=[...new Map(assertions.flatMap(a=>[a.subject,a.object]).map(e=>[e.id,e])).values()];
  if(bundle.geneId && !entities.some(e=>e.id===bundle.geneId))entities.push({id:bundle.geneId,name:bundle.gene,category:"gene"});
  const aliases=bundle.aliases.filter(a=>entities.some(e=>e.id===a.canonical));
  const encoded=stableJson({assertions,documents,entities,aliases,queries:bundle.queries});
  if(new TextEncoder().encode(encoded).length>750_000) throw Error("Evidence metadata exceeds storage limit");
  const a=JSON.stringify(assertions),d=JSON.stringify(documents),date=bundle.date;
  const statements=[
    db.prepare("INSERT OR IGNORE INTO evidence_entities(id,name,category) SELECT json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.category') FROM json_each(?)").bind(JSON.stringify(entities)),
    // Conflicting equivalence claims fail the transaction, rather than silently relabeling an entity.
    db.prepare(`INSERT INTO evidence_aliases(id,entity_id,basis)
      SELECT json_extract(value,'$.id'),json_extract(value,'$.canonical'),'TRAPI query binding' FROM json_each(?) WHERE 1
      ON CONFLICT(id) DO UPDATE SET entity_id=CASE WHEN evidence_aliases.entity_id=excluded.entity_id THEN excluded.entity_id ELSE NULL END`).bind(JSON.stringify(aliases)),
    db.prepare("INSERT OR IGNORE INTO evidence_runs VALUES (?,?,?,?,?,?,?)").bind(bundle.runId,bundle.gene,bundle.geneId,date,JSON.stringify(bundle.queries),JSON.stringify(bundle.quarantined),assertions.length),
    db.prepare(`INSERT INTO evidence_assertions(id,subject_id,object_id,predicate,provider,current_version,retrieved_at)
      SELECT json_extract(value,'$.id'),json_extract(value,'$.subject.id'),json_extract(value,'$.object.id'),json_extract(value,'$.predicate'),json_extract(value,'$.provider'),json_extract(value,'$.version'),json_extract(value,'$.retrievedAt') FROM json_each(?) WHERE 1
      ON CONFLICT(id) DO UPDATE SET current_version=excluded.current_version,retrieved_at=excluded.retrieved_at,
        review=CASE WHEN evidence_assertions.current_version=excluded.current_version THEN evidence_assertions.review ELSE 'unreviewed' END
      WHERE excluded.retrieved_at>=evidence_assertions.retrieved_at`).bind(a),
    db.prepare("INSERT OR IGNORE INTO evidence_assertion_versions SELECT json_extract(value,'$.version'),json_extract(value,'$.id'),value,? FROM json_each(?)").bind(date,a),
    db.prepare("INSERT OR IGNORE INTO evidence_run_assertions SELECT ?,json_extract(value,'$.id'),json_extract(value,'$.version') FROM json_each(?)").bind(bundle.runId,a),
    db.prepare(`INSERT INTO evidence_documents SELECT json_extract(value,'$.id'),json_extract(value,'$.document'),? FROM json_each(?) WHERE 1
      ON CONFLICT(id) DO UPDATE SET document=excluded.document,retrieved_at=excluded.retrieved_at WHERE excluded.retrieved_at>=evidence_documents.retrieved_at`).bind(date,d),
    db.prepare("INSERT OR IGNORE INTO evidence_document_versions SELECT json_extract(value,'$.version'),json_extract(value,'$.id'),json_extract(value,'$.document'),? FROM json_each(?)").bind(date,d),
    db.prepare("INSERT OR IGNORE INTO evidence_run_documents SELECT ?,json_extract(value,'$.id') FROM json_each(?)").bind(bundle.runId,d),
    db.prepare("INSERT OR IGNORE INTO evidence_citations(assertion_id,source_id) SELECT json_extract(a.value,'$.id'),p.value FROM json_each(?) a,json_each(json_extract(a.value,'$.publications')) p").bind(a),
    db.prepare("INSERT OR IGNORE INTO evidence_document_links(document_id,related_id) SELECT json_extract(d.value,'$.id'),p.value FROM json_each(?) d,json_each(json_extract(d.value,'$.document.linkedPublications')) p").bind(d),
  ];
  await db.batch(statements);
  return {status:"saved" as const,assertions:assertions.length,quarantined:bundle.quarantined.length,notice:"Saved source-linked metadata to the shared research collection. Assertions remain unreviewed; ambiguous identifiers were quarantined."};
}
export async function persistRun(db:D1Database, run:ConnectedRun) { return persistBundle(db,await normalizeRun(run)); }

export async function savedEvidence(db:D1Database,gene:string,filters:{provider?:string;classification?:string;review?:string}={}):Promise<EvidenceView> {
  // One bounded neighborhood, stable ordering; old runs retain membership as evidence accumulates.
  const where=["r.gene=?"],params:string[]=[gene];
  if(filters.provider){where.push("a.provider=?");params.push(filters.provider)}
  if(filters.review){where.push("a.review=?");params.push(filters.review)}else where.push("a.review<>'rejected'");
  if(filters.classification){where.push("json_extract(v.document,'$.classification')=?");params.push(filters.classification)}
  const [rows,docs,summary]=await Promise.all([
    db.prepare(`SELECT DISTINCT v.document,a.review,a.current_version AS version,a.retrieved_at FROM evidence_runs r
      JOIN evidence_run_assertions ra ON ra.run_id=r.id JOIN evidence_assertions a ON a.id=ra.assertion_id
      JOIN evidence_assertion_versions v ON v.id=a.current_version WHERE ${where.join(" AND ")}
      ORDER BY a.id LIMIT 225`).bind(...params).all<{document:string;review:SavedAssertion["review"];version:string;retrieved_at:string}>(),
    db.prepare(`SELECT DISTINCT d.document FROM evidence_runs r JOIN evidence_run_documents rd ON rd.run_id=r.id
      JOIN evidence_documents d ON d.id=rd.document_id WHERE r.gene=? ORDER BY d.id LIMIT 101`).bind(gene).all<{document:string}>(),
    db.prepare("SELECT MAX(retrieved_at) AS lastRetrieved FROM evidence_runs WHERE gene=?").bind(gene).first<{lastRetrieved:string|null}>()
  ]);
  const assertions=rows.results.slice(0,224).map(r=>({...JSON.parse(r.document),review:r.review,version:r.version,retrievedAt:r.retrieved_at})) as SavedAssertion[];
  const documents=docs.results.slice(0,100).map(r=>JSON.parse(r.document)) as EvidenceDocument[];
  const locators=[...new Set([...assertions.flatMap(a=>a.publications),...documents.map(d=>d.id)])].slice(0,500);
  const recordIds=locators.map(id=>id.startsWith("PMID:")?"pubmed-"+id.slice(5):id.startsWith("ClinicalTrials:")?"trial-"+id.slice(15):"").filter(Boolean);
  const linked=recordIds.length?await db.prepare("SELECT id,title,url,kind FROM research_records WHERE id IN (SELECT value FROM json_each(?)) ORDER BY id LIMIT 100")
    .bind(JSON.stringify(recordIds)).all<{id:string;title:string;url:string;kind:string}>():{results:[]};
  return {gene,assertions,documents,collectionRecords:linked.results,discoveries:discoverEvidence(gene,assertions,documents),
    coverage:{assertions:assertions.length,documents:documents.length,lastRetrieved:summary?.lastRetrieved||null,bounded:rows.results.length>224||docs.results.length>100},
    limitations:["Saved, bounded source metadata; collection coverage is incomplete.","Literature matches are context, not automatically supporting or contradictory evidence.","Unknown population, tissue and species are not inferred. Filters apply to stored assertion metadata, not individual participants.","Different providers and papers may reuse the same study or cohort. No independent replication count is claimed."]};
}
export async function evidenceCoverage(db:D1Database) {
  const [sources,recent,quarantined]=await Promise.all([
    db.prepare(`SELECT a.provider,count(*) AS assertions,min(a.retrieved_at) AS firstRetrieved,max(a.retrieved_at) AS lastRetrieved,
      sum(a.review='unreviewed') AS unreviewed FROM evidence_assertions a GROUP BY a.provider`).all(),
    db.prepare("SELECT id,gene,retrieved_at,assertion_count,query_log FROM evidence_runs ORDER BY retrieved_at DESC LIMIT 12").all(),
    db.prepare("SELECT sum(json_array_length(quarantined)) AS count FROM evidence_runs").first()
  ]);
  return {sources:sources.results,recent:recent.results,quarantined,coverage:"Bounded gene investigations only; retrieval dates are not publication coverage dates."};
}
