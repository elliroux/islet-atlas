declare namespace Cloudflare {
  interface Env {
    ATLAS_AUTH_MODE?: "public";
    OPENAI_API_KEY?: string;
    ATLAS_AI_OWNER_ID?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
