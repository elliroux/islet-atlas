/** Bound streamed request bytes before allocating/parsing. Null means the body exceeds the limit. */
export async function limitedText(req:Request,maxBytes:number):Promise<string|null> {
  const length=Number(req.headers.get("Content-Length"));
  if(Number.isFinite(length)&&length>maxBytes)return null;
  const reader=req.body?.getReader();if(!reader)return "";
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)return null;chunks.push(value)}}
  finally{await reader.cancel().catch(()=>{})}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  return new TextDecoder().decode(bytes);
}
