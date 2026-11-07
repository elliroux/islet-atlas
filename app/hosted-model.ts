import { env } from "cloudflare:workers";
import { getChatGPTUser } from "./chatgpt-auth";

export async function hostedModelKey() {
  if (!env.OPENAI_API_KEY) return undefined;
  const user = await getChatGPTUser();
  if (!user) return undefined;
  if (env.ATLAS_AUTH_MODE === "access") {
    const owner = env.ATLAS_ACCESS_AI_OWNER_EMAIL?.trim().toLowerCase();
    return owner && user.email.toLowerCase() === owner ? env.OPENAI_API_KEY : undefined;
  }
  return user.userId === env.ATLAS_AI_OWNER_ID ? env.OPENAI_API_KEY : undefined;
}
