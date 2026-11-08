/** Shared contract. Unknown context stays null; source assertions never become hypotheses in place. */
export type Entity = { id: string; name: string; category: string };
export type Assertion = {
  id: string; subject: Entity; object: Entity; predicate: string;
  provider: string; sourceId: string; sourceUrl: string; retrievedAt: string;
  classification: "reported_association" | "provider_assertion" | "computational_inference";
  stance: "reported" | "negated"; review: "unreviewed" | "reviewed" | "rejected";
  publications: string[]; sources: string[]; urls: string[]; provenance: {resourceId:string;role:string|null;upstream:string[]}[];
  context: { species: string | null; tissue: string | null; population: string | null;
    direction: string | null; statistics: unknown; limitations: string[] };
  original: Record<string, unknown> | null; originalHash: string;
  retention: "references_only" | "licensed_metadata"; license: string | null;
};
export type EvidenceDocument = {id:string;provider:string;url:string;title:string;kind:string;year:string;
  status?:string;whyStopped?:string;population?:string;publicationTypes?:string[];linkedPublications?:string[];hasResults?:boolean};
export type EvidenceBundle = {runId:string;gene:string;geneId:string|null;date:string;assertions:Assertion[];
  documents:EvidenceDocument[];aliases:{id:string;canonical:string}[];
  quarantined:{provider:string;sourceId:string;reason:string}[];queries:unknown[]};
export type SavedAssertion = Assertion & {version:string};
export type Discovery = {
  id:string;hypothesis:string;designation:"candidate hypothesis"|"speculative connection";
  entities:Entity[];relationships:string[];supporting:SavedAssertion[];contradictory:SavedAssertion[];
  gaps:string[];uncertainty:string;alreadyReported:string;questions:string[];
  priority:{total:number;factors:{name:string;points:number}[];meaning:string};
};
export type EvidenceView = {gene:string;assertions:SavedAssertion[];documents:EvidenceDocument[];
  discoveries:Discovery[];collectionRecords:{id:string;title:string;url:string;kind:string}[];coverage:{assertions:number;documents:number;lastRetrieved:string|null;bounded:boolean};
  limitations:string[]};
