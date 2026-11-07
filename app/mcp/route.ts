import {data,findings,familyOf} from "../../research/data";
import {retrieve} from "../../research/engine";
import {leads} from "../../research/leads";
export const dynamic="force-dynamic";
const tools=[["search_findings","Search the reviewed T1D corpus for a question.","question"],["inspect_finding","Retrieve the precise source locator, effect, uncertainty, family and linked records.","id"],["inspect_lead","Retrieve an expert-review hypothesis with its challenges, decisive test and sources.","id"]];
export async function POST(req:Request){
 const m=await req.json() as {id?:string|number;method:string;params?:{name?:string;arguments?:Record<string,string>}};let result;
 if(m.method==="server/discover")result={supportedVersions:["2026-07-28"],capabilities:{tools:{}}};
 else if(m.method==="tools/list")result={tools:tools.map(([name,description,key])=>({name,description,inputSchema:{type:"object",properties:{[key]:{type:"string"}},required:[key]}}))};
 else if(m.method==="tools/call"){
 const args=m.params?.arguments||{};let value:unknown;
 if(m.params?.name==="search_findings")value=retrieve((args.question||"").slice(0,1500)).map(f=>({id:f.id,title:f.title,source:f.url,locator:f.locator,family:familyOf(f).name}));
 if(m.params?.name==="inspect_finding"){const f=findings.get(args.id);if(f){const family=familyOf(f);value={finding:f,family,records:data.records.filter(r=>family.refs.includes(r.id))}}}
 if(m.params?.name==="inspect_lead")value=leads.find(l=>l.id===args.id);
 result={content:[{type:"text",text:JSON.stringify(value||{message:"No matching entry."})}],isError:!value};
 }else return Response.json({jsonrpc:"2.0",id:m.id,error:{code:-32601,message:"Unknown method"}});
 return Response.json({jsonrpc:"2.0",id:m.id,result})
}
