import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import type { Investigation } from "../../../research/types";
export const dynamic="force-dynamic";
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return respond({error:"Sign in to sync your notebook."},401);
 const result=await env.DB!.prepare("SELECT document FROM investigations WHERE owner=? ORDER BY updated DESC").bind(user.userId).all<{document:string}>();
 return respond(result.results.map(r=>JSON.parse(r.document)));
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:"Sign in to sync your notebook."},401);
 if(req.headers.get("Origin")!==new URL(req.url).origin)return respond({error:"Origin mismatch."},403);
 const raw=await req.text();if(raw.length>450000)return respond({error:"Notebook entry is too large. Export a copy."},413);
 let d:Investigation;try{d=JSON.parse(raw)}catch{return respond({error:"Invalid JSON."},400)}
 if(!d || !/^[a-z0-9-]{1,64}$/i.test(d.id)||!Array.isArray(d.nodes)||!d.original||d.original.length>1500||!Number.isInteger(d.revision)||d.revision<1)return respond({error:"Invalid investigation."},400);
 const result=await env.DB!.prepare("INSERT INTO investigations(owner,id,revision,updated,document) VALUES (?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET revision=excluded.revision,updated=excluded.updated,document=excluded.document WHERE excluded.revision=investigations.revision+1").bind(user.userId,d.id,d.revision,d.updated,raw).run();
 if(!result.meta.changes){
   const row=await env.DB!.prepare("SELECT document FROM investigations WHERE owner=? AND id=?").bind(user.userId,d.id).first<{document:string}>();
   if(row?.document!==raw)return respond({error:"Another copy changed. Your local investigation is available to export."},409);
 }
 return respond({revision:d.revision});
}
