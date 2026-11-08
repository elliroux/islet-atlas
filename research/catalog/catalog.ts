import {pankQuery, PANKGRAPH} from "../connectors/pankgraph";
import type {Fetcher} from "../connectors/types";
import {investigateConnections} from "../connectors/investigation";
import {persistRun} from "../evidence/store";
import {stableJson} from "../evidence/normalize";

export const PAGE_SIZE=50;
const DAY=86400000;
export function catalogQuery(after="") {
  if(after && !/^ENSG\d+$/.test(after))throw Error("Invalid catalog cursor");
  return `MATCH (g:gene)-[r]-(d {id:"MONDO_0005147"}) WHERE g.id > "${after}" RETURN g.id AS id, g.name AS symbol, collect(DISTINCT type(r)) AS predicates, collect(DISTINCT r.data_source) AS sources ORDER BY id LIMIT ${PAGE_SIZE}`;
}
export type CatalogMember={id:string;symbol:string;predicates:string[];sources:string[]};
export async function catalogPage(after:string,fetcher:Fetcher=fetch):Promise<CatalogMember[]> {
  const rows=await pankQuery(catalogQuery(after),fetcher);
  if(rows.length>PAGE_SIZE)throw Error("Catalog page exceeds limit");
  let previous=after;
  return rows.map(row=>{
    if(!/^ENSG\d+$/.test(row.id)||row.id<=previous||typeof row.symbol!=="string"||!/^[A-Z][A-Z0-9-]{0,24}$/.test(row.symbol))throw Error("Invalid or unordered catalog identifier; checkpoint retained");
    previous=row.id;
    const strings=(x:unknown):string[]=>{if(!Array.isArray(x)||x.length>100||x.some(v=>typeof v!=="string"||v.length>600))throw Error("Invalid catalog attribution");return [...new Set(x)].sort()};
    return {id:row.id,symbol:row.symbol,predicates:strings(row.predicates),sources:strings(row.sources)};
  });
}
// One keyset page + one due gene per invocation; the global lease spans all providers.
// No public request starts this job. Only the opt-in Worker scheduled handler calls it.
export async function catalogTick(db:D1Database,fetcher:Fetcher=fetch,now=Date.now()) {
  const token=crypto.randomUUID(),date=new Date(now).toISOString();
  await db.prepare("INSERT OR IGNORE INTO gene_catalog_jobs(id) VALUES ('pankgraph')").run();
  const claim=await db.prepare("UPDATE gene_catalog_jobs SET lease=?,lease_until=? WHERE id='pankgraph' AND lease_until<?").bind(token,now+10*60000,now).run();
  if(!claim.meta.changes)return {status:"busy"};
  let imported=0,enriched:string|null=null;
  try {
    const job=await db.prepare("SELECT * FROM gene_catalog_jobs WHERE id='pankgraph'").first<any>();
    if(job.next_scan<=now)try {
      const rows=await catalogPage(job.cursor,fetcher);
      const docs=await Promise.all(rows.map(async row=>{
        const document=stableJson({...row,provider:"PanKgraph",disease:"MONDO:0005147",endpoint:PANKGRAPH,query:catalogQuery(job.cursor),classification:"source-reported link; not a causal claim"});
        const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(document)))).map(v=>v.toString(16).padStart(2,"0")).join("");
        return {id:"ENSEMBL:"+row.id,symbol:row.symbol,document,hash};
      }));
      // Atomic membership + history + cursor. Existing evidence/queue state is never reset.
      await db.batch([
        db.prepare(`INSERT INTO gene_catalog(id,symbol,document,first_seen,last_seen)
          SELECT json_extract(value,'$.id'),json_extract(value,'$.symbol'),json_extract(value,'$.document'),?,? FROM json_each(?) WHERE 1
          ON CONFLICT(id) DO UPDATE SET symbol=excluded.symbol,document=excluded.document,last_seen=excluded.last_seen`).bind(date,date,JSON.stringify(docs)),
        db.prepare(`INSERT OR IGNORE INTO gene_catalog_versions(id,gene_id,document,retrieved_at)
          SELECT json_extract(value,'$.hash'),json_extract(value,'$.id'),json_extract(value,'$.document'),? FROM json_each(?)`).bind(date,JSON.stringify(docs)),
        db.prepare(`UPDATE gene_catalog_jobs SET cursor=?,scan_started=CASE WHEN cursor='' THEN ? ELSE scan_started END,
          last_page=?,last_complete=CASE WHEN ? THEN ? ELSE last_complete END,next_scan=?,error=NULL WHERE id='pankgraph' AND lease=?`)
          .bind(rows.length<PAGE_SIZE?"":rows.at(-1)!.id,date,date,rows.length<PAGE_SIZE?1:0,date,rows.length<PAGE_SIZE?now+7*DAY:0,token)
      ]);
      imported=rows.length;
    } catch {
      await db.prepare("UPDATE gene_catalog_jobs SET error=?,next_scan=? WHERE id='pankgraph' AND lease=?").bind("Catalog provider/validation/storage failure; checkpoint retained.",now+3600000,token).run();
    }
    const gene=await db.prepare("SELECT id,symbol FROM gene_catalog WHERE next_attempt<=? ORDER BY next_attempt,id LIMIT 1").bind(now).first<{id:string;symbol:string}>();
    if(gene) {
      try {
        const run=await investigateConnections(gene.symbol,undefined,fetcher);
        if(run.geneId!==gene.id)throw Error("Identifier resolution changed; review required");
        await persistRun(db,run);
        const complete=run.queries.every(q=>q.status==="complete"||q.status==="empty");
        await db.prepare(`UPDATE gene_catalog SET last_attempt=?,last_success=CASE WHEN ? THEN ? ELSE last_success END,
          next_attempt=?,status=?,detail=? WHERE id=?`).bind(date,complete?1:0,date,now+(complete?30*DAY:6*3600000),complete?"updated":"partial",JSON.stringify(run.queries.map(q=>({provider:q.provider,status:q.status,count:q.count,retrievedAt:q.retrievedAt}))),gene.id).run();
        enriched=gene.symbol;
      } catch {
        await db.prepare("UPDATE gene_catalog SET last_attempt=?,next_attempt=?,status='failed',detail=? WHERE id=?").bind(date,now+6*3600000,JSON.stringify([{status:"failed",note:"Identifier, provider or persistence failure; previous evidence retained."}]),gene.id).run();
      }
    }
    return {status:"complete",imported,enriched};
  } finally {
    await db.prepare("UPDATE gene_catalog_jobs SET lease=NULL,lease_until=0 WHERE id='pankgraph' AND lease=?").bind(token).run();
  }
}
export async function browseCatalog(db:D1Database,after="",query="",enabled=false) {
  const rows=await db.prepare(`SELECT * FROM gene_catalog WHERE symbol LIKE ? ESCAPE '\\' AND (symbol > ? OR (symbol=? AND id>?)) ORDER BY symbol,id LIMIT 41`)
    .bind(query.replace(/[\\%_]/g,"\\$&")+"%",after.split("|")[0],after.split("|")[0],after.split("|")[1]||"").all<any>();
  const count=await db.prepare("SELECT count(*) AS genes, sum(status='updated') AS updated,sum(status='partial') AS partial,sum(status='failed') AS failed FROM gene_catalog").first<{genes:number;updated:number|null;partial:number|null;failed:number|null}>();
  const sources=await db.prepare(`SELECT s.value AS source,count(DISTINCT g.id) AS genes FROM gene_catalog g,json_each(g.document,'$.sources') s GROUP BY s.value ORDER BY s.value`).all();
  const job=await db.prepare("SELECT scan_started,last_page,last_complete,error,cursor FROM gene_catalog_jobs WHERE id='pankgraph'").first<any>();
  const visible=rows.results.slice(0,40),last=visible.at(-1);
  return {genes:visible.map(r=>({...r,document:JSON.parse(r.document),detail:JSON.parse(r.detail)})),next:rows.results.length>40?last.symbol+"|"+last.id:null,
    coverage:{genes:count?.genes??0,updated:count?.updated??0,partial:count?.partial??0,failed:count?.failed??0,provider:"PanKgraph",sources:sources.results,lastPage:job?.last_page??null,lastComplete:job?.last_complete??null,scanStarted:job?.scan_started??null,scanInProgress:!!job?.cursor,error:job?.error??null,backgroundEnabled:enabled},
    limitations:["This catalog covers direct gene–T1D links returned by PanKgraph (MONDO:0005147); it is not a complete list of all T1D genes.","Predicted effector genes and colocalization signals are candidate associations, not demonstrated causal genes. Catalog entries are unreviewed.","Other genetic catalogs, variant/allele-level associations and HLA haplotypes are not yet enumerated. No absence or completeness inference is warranted.","Entries no longer returned by a later scan are retained with their last-seen date. A completed scan is not a consistent upstream snapshot.","Evidence enrichment is bounded: up to 80 graph relationships, 12 drug candidates, 10 publications and 10 trials per gene. Empty results are not evidence of absence."]};
}
export type CatalogView=Awaited<ReturnType<typeof browseCatalog>>;
