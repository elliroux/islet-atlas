import {env} from "cloudflare:workers";
import {browseCatalog} from "../../../research/catalog/catalog";
export const dynamic="force-dynamic";
export async function GET(req:Request) {
  const p=new URL(req.url).searchParams,after=p.get("after")||"",q=(p.get("q")||"").trim().toUpperCase();
  if((after&&!/^[A-Z][A-Z0-9-]{0,24}\|ENSEMBL:ENSG\d+$/.test(after))||!/^([A-Z][A-Z0-9-]{0,24})?$/.test(q))return Response.json({error:"Invalid catalog filter."},{status:400});
  try {if(!env.DB)throw Error();return Response.json(await browseCatalog(env.DB,after,q,env.ATLAS_BACKGROUND_INGESTION==="enabled"),{headers:{"Cache-Control":"no-store"}})}
  catch{return Response.json({error:"Gene catalog is unavailable. Its database migration or initial import may be pending."},{status:503})}
}
