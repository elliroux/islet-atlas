import {limitedText} from "../../../../lib/http-body";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getAccessUser } from "../../../access-auth";
export const dynamic="force-dynamic";
const schema=z.object({assertion:z.string().regex(/^assertion:[a-f0-9]{64}$/),version:z.string().regex(/^version:[a-f0-9]{64}$/),decision:z.enum(["reviewed","rejected","unreviewed"]),note:z.string().trim().min(20).max(2000)});
export async function POST(req:Request) {
  // Independent signed Access identity only. Never trust client-provided legacy user headers.
  const user=env.ATLAS_AUTH_MODE==="access"?await getAccessUser(req.headers):null;
  if(!user || !env.ATLAS_ACCESS_AI_OWNER_EMAIL || user.email.toLowerCase()!==env.ATLAS_ACCESS_AI_OWNER_EMAIL.toLowerCase())return Response.json({error:"Maintainer sign-in required."},{status:403});
  if(req.headers.get("Origin")!==new URL(req.url).origin)return Response.json({error:"Origin mismatch"},{status:403});
  const raw=await limitedText(req,3500);if(raw===null)return Response.json({error:"Review too large"},{status:413});
  let body:unknown;try{body=JSON.parse(raw)}catch{return Response.json({error:"Invalid JSON"},{status:400})}
  const input=schema.safeParse(body);
  if(!input.success)return Response.json({error:"Include an assertion, exact version, decision and source-review note."},{status:400});
  if(!env.DB)return Response.json({error:"Database unavailable"},{status:503});
  const {assertion,version,decision,note}=input.data;
  try {
  const result=await env.DB.batch([
    env.DB.prepare("INSERT INTO evidence_reviews SELECT ?,id,current_version,?,?,?,? FROM evidence_assertions WHERE id=? AND current_version=?")
      .bind(crypto.randomUUID(),user.userId,decision,note,new Date().toISOString(),assertion,version),
    env.DB.prepare("UPDATE evidence_assertions SET review=? WHERE id=? AND current_version=?").bind(decision,assertion,version)
  ]);
  return Response.json(result[0].meta.changes?{review:decision,notice:"Reviewed means inspected source attribution, not established causality or clinical efficacy."}:{error:"Evidence changed; reload and review the current version."},{status:result[0].meta.changes?200:409,headers:{"Cache-Control":"no-store"}});
  } catch {return Response.json({error:"Review could not be saved. Retry after reloading the evidence."},{status:503});}
}
