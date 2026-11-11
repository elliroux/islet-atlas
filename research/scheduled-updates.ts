import type { CollectionId } from "./foundation";

type BatchResult = { count?: number; complete?: boolean; busy?: boolean };
const batches: [CollectionId, number][] = [
  ["atlas", 1], ["recent", 10], ["publications", 50], ["trials", 20], ["fulltext", 10],
];

export function researchUpdateDue(scheduledTime: number) {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour: "numeric", hourCycle: "h23",
  }).format(new Date(scheduledTime)));
  return [3, 9, 15, 21].includes(hour);
}

export async function runResearchUpdates(update: (source: CollectionId) => Promise<BatchResult>) {
  const errors: string[] = [];
  for (const [source, limit] of batches) {
    let processed = 0;
    try {
      for (let batch = 0; batch < limit; batch++) {
        const result = await update(source);
        processed += result.count ?? 0;
        if (result.complete || result.busy) break;
      }
      console.log(JSON.stringify({ event: "research-update", source, processed }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      errors.push(source + ": " + message);
      console.error(JSON.stringify({ event: "research-update-failed", source, message }));
    }
  }
  if (errors.length) throw new Error(errors.join("; "));
}
