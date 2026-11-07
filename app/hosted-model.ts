import { env } from "cloudflare:workers";
import { getChatGPTUser } from "./chatgpt-auth";

export async function hostedModelKey() {
  if (!env.OPENAI_API_KEY || !env.ATLAS_AI_OWNER_ID) return undefined;
  const user = await getChatGPTUser();
  return user?.userId === env.ATLAS_AI_OWNER_ID ? env.OPENAI_API_KEY : undefined;
}
