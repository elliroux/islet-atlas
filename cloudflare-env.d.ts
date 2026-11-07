declare namespace Cloudflare {
  interface Env {
    OPENAI_API_KEY?: string;
    ATLAS_AI_OWNER_ID?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
