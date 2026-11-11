declare namespace Cloudflare {
  interface Env {
    ATLAS_RESEARCH_UPDATES?: "enabled";
    ATLAS_AUTH_MODE?: "public" | "access";
    ATLAS_ACCESS_ISSUER?: string;
    ATLAS_ACCESS_AUDIENCE?: string;
    ATLAS_ACCESS_AI_OWNER_EMAIL?: string;
    OPENAI_API_KEY?: string;
    ATLAS_AI_OWNER_ID?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
