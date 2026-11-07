export type RecordEntry = {id:string; title:string; year:string|number; authors:string; family:string; kind:string; access:string; url:string; locator:string};
export type Finding = {id:string; title:string; summary:string; record:string; area:string; stage:string; mechanism:string; evidence:string; population:string; factor:string; comparator:string; endpoint:string; followup:string; effect:string; uncertainty:string; harms:string; limitation:string; role:string; locator:string; url:string};
export type Family = {id:string; name:string; outcome:string; status:string; subsequent:string; refs:string[]; replication:string};
export type Search = {query:string; scope:string; reason:string};
export type Corpus = {records:RecordEntry[];findings:Finding[];families:Family[];searches:Search[]};
export type Lead = {id:string;title:string;kind:string;priority:string;strength:string;sourceIds:string[];observation:string;inference:string;challenge:string;test:string;weaken:string;search:string;question:string};
export type Branch = {question:string; observation:string; sources:string[]; dismissed?:boolean; original?:string; pursued?:string; edits?:{date:string;before:string;after:string}[]};
export type Answer = {question:string; answer:string; sources:string[]; reasoning:string; branches:Branch[]; date:string; search:string; engine:string; citations:{id:string;title:string;url:string;locator:string;family:string}[]};
export type Hit = {title:string;url:string;source:string;year:string};
export type SearchRun = {date:string;query:string;hits:Hit[];scope:string;errors:string[]};
export type Node = {id:string; parent?:string; response:Answer; searches:SearchRun[]; evidenceSnapshot?:StudyItem[]};
export type Investigation = {id:string; original:string; created:string; updated:string; revision:number; traces?:import("./trace").Trace[]; studies?:StudyItem[]; conclusion?:string; nodes:Node[]};

export type EvidenceCard = {
 id:string; title:string; url:string; year:string|number; family:string; stage:string;
 design:string; endpoint:string; result:string; limit:string; locator:string; access:string;
};
export type StudyItem = EvidenceCard & {
 status:"Registry fields"|"Atlas finding"|"Source-checked starter"|"AI-extracted"|"Metadata only";
 added:string; reason:string; excluded?:boolean; checked?:string; excerpt?:string;
 extractedFrom?:string; originalResult?:string; edits?:{date:string;previous:string}[];
};
