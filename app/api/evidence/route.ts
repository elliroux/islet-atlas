import { env } from "cloudflare:workers";
import { z } from "zod";
import { evidenceCoverage, savedEvidence } from "../../../research/evidence/store";
export const dynamic="force-dynamic";
const filter=z.object({gene:z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9-]{0,24}$/),
  provider:z.enum(["PanKgraph","Translator"]).optional(),
  classification:z.enum(["reported_association","provider_assertion","computational_inference"]).optional(),
  review:z.enum(["unreviewed","reviewed"]).optional()});
export async function GET(req:Request) {
  const params=new URL(req.url).searchParams;
  try {
    if(!env.DB)throw Error("No database");
    if(params.get("coverage")==="1")return Response.json(await evidenceCoverage(env.DB),{headers:{"Cache-Control":"no-store"}});
    const input=filter.safeParse(Object.fromEntries(params));
    if(!input.success)return Response.json({error:"Invalid gene or evidence filters."},{status:400});
    return Response.json(await savedEvidence(env.DB,input.data.gene,input.data),{headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Saved evidence is unavailable. The evidence migration may not yet be applied."},{status:503}); }
}
