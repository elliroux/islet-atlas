declare namespace Cloudflare {
  interface Env {
    ATLAS_AUTH_MODE?: "public" | "access";
    ATLAS_ACCESS_ISSUER?: string;
    ATLAS_ACCESS_AUDIENCE?: string;
    ATLAS_ACCESS_AI_OWNER_EMAIL?: string;
    OPENAI_API_KEY?: string;
    ATLAS_AI_OWNER_ID?: string;
    DB?: D1Database;
    ATLAS_BACKGROUND_INGESTION?: "enabled" | "disabled";
    BUCKET?: R2Bucket;
  }
}
