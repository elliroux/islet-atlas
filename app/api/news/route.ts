import { readNews } from "../../../research/news-store";
export const dynamic = "force-dynamic";
export async function GET() {
  const result = await readNews();
  return Response.json(result, { headers: { "Cache-Control": result.available ? "public, max-age=300" : "no-store" } });
}
