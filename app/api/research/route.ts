import {collections,coverage,importBatch,recordDetail,searchRecords,type CollectionId} from "../../../research/foundation";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 try{
  const p=new URL(req.url).searchParams;
  if(p.has("id"))return Response.json(await recordDetail((p.get("id")||"").slice(0,100)),{headers:{"Cache-Control":"no-store"}});
  if(p.has("q"))return Response.json(await searchRecords((p.get("q")||"").slice(0,300),30,Math.max(0,Math.min(1000000,Number(p.get("offset"))||0)),["Publication","Trial","Reviewed finding"].includes(p.get("kind")||"")?p.get("kind")!:""),{headers:{"Cache-Control":"no-store"}});
  return Response.json(await coverage(),{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Research collection unavailable. Retry shortly."},{status:503})}
}
export async function POST(req:Request){
 // This public operation can only retrieve the fixed public sources below.
 // Visitors cannot supply records, URLs, queries, SQL or reset a checkpoint.
 if(req.headers.get("Origin")!==new URL(req.url).origin)return Response.json({error:"Origin mismatch"},{status:403});
 const raw=await req.text();if(raw.length>300)return Response.json({error:"Request too large"},{status:413});
 let body;try{body=JSON.parse(raw)}catch{return Response.json({error:"Invalid JSON"},{status:400})}
 if(!collections.some(c=>c.id===body?.source))return Response.json({error:"Unknown collection"},{status:400});
 try{return Response.json(await importBatch(body.source as CollectionId),{headers:{"Cache-Control":"no-store"}})}
 catch(e){return Response.json({error:e instanceof Error?e.message:"Import failed. The saved checkpoint is available to retry."},{status:502})}
}
