"use client";

import { useId, useState } from "react";
import "./trajectory-explorer.css";

type SignalId = "ifn" | "mono" | "nk";
type DiseaseWindow = "before" | "stage2" | "after";
type EvidenceView = "evidence" | "influence" | "study";

type Selection = {
  signal: SignalId;
  stage: DiseaseWindow;
  view: EvidenceView;
};

const SOURCES = {
  baby: {
    label: "BABYDIET · 2014",
    href: "https://pubmed.ncbi.nlm.nih.gov/24561305/",
  },
  teddy: {
    label: "TEDDY and DIPP · 2021",
    href: "https://pubmed.ncbi.nlm.nih.gov/33790023/",
  },
  infection: {
    label: "TEDDY infection response · 2023",
    href: "https://pubmed.ncbi.nlm.nih.gov/37993433/",
  },
  trigr: {
    label: "TRIGR · 2026",
    href: "https://pubmed.ncbi.nlm.nih.gov/41741442/",
  },
  label: {
    label: "FDA label · June 2026",
    href: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761183s010lbls014lbl.pdf",
  },
  bandit: {
    label: "BANDIT follow-up · 2026",
    href: "https://pubmed.ncbi.nlm.nih.gov/42627334/",
  },
} as const;

type SourceId = keyof typeof SOURCES;

type Signal = {
  label: string;
  description: string;
  title: string;
  type: string;
  observed: string;
  limit: string;
  hypothesis: string;
  sources: readonly SourceId[];
  timing: string;
  replication: string;
  mechanism: string;
  safety: string;
  windows: Record<DiseaseWindow, string>;
  study: string;
  comparison: string;
  falsifier: string;
};

const SIGNAL_ORDER: readonly SignalId[] = ["ifn", "mono", "nk"];

const SIGNALS: Record<SignalId, Signal> = {
  ifn: {
    label: "Interferon response",
    description: "Antiviral gene activity",
    title: "Type I interferon response",
    type: "Blood transcriptomics · human longitudinal studies",
    observed:
      "BABYDIET reported a transient, infection-associated RNA signature before first autoantibodies.",
    limit:
      "TEDDY found no progression-rate association in 2021; an infection-aligned 2023 analysis found stronger antiviral responses in controls. The signatures and windows differ.",
    hypothesis:
      "Proposed: does unusually slow resolution after an infection distinguish future seroconverters from matched non-converters?",
    sources: ["baby", "teddy", "infection"],
    timing: "Observed before antibodies",
    replication: "Endpoint-dependent findings",
    mechanism: "Causal role unresolved",
    safety: "Pre-antibody benefit and safety unestablished",
    windows: {
      before:
        "Timing fits this question. Reliable person-level prediction remains to be tested.",
      stage2:
        "Earlier occurrence does not establish prediction of stage 2 progression.",
      after:
        "A pre-antibody signature cannot establish a treatment target after diagnosis.",
    },
    study:
      "Does recovery duration add information beyond age, inherited risk, and infection history?",
    comparison:
      "Risk and latest-RNA model versus that same model plus predefined response and recovery features.",
    falsifier:
      "Trajectory features add no information beyond the latest RNA measurement, or fail to reproduce in an independent cohort.",
  },
  mono: {
    label: "Monocyte state",
    description: "Cell mix and regulation",
    title: "Monocyte state and regulation",
    type: "Immune-cell populations · RNA and open chromatin",
    observed:
      "TRIGR reported monocyte-lineage differences before autoantibodies across RNA and chromatin measurements.",
    limit:
      "Support across assays in the same participants is not independent-cohort replication.",
    hypothesis:
      "Proposed: distinguish more monocytes from altered regulation within monocytes, then test the reproducible component.",
    sources: ["trigr"],
    timing: "Observed before antibodies",
    replication: "Independent cohort still needed",
    mechanism: "Cell-state mechanism is a candidate",
    safety: "No matched intervention shown here",
    windows: {
      before:
        "Early timing fits. Disease-onset time and first detectable antibodies remain different events.",
      stage2:
        "Early monocyte findings do not automatically transfer to stage 2.",
      after: "An early-life difference may have a different role after diagnosis.",
    },
    study:
      "Do within-monocyte changes precede persistent autoantibodies independently of cell abundance?",
    comparison:
      "Within-cell expression and accessibility versus cell proportions, with age-matched longitudinal controls.",
    falsifier:
      "The association is explained by developmental age, cell mixture, or assay batch and does not reproduce.",
  },
  nk: {
    label: "NK cell program",
    description: "Autoantibody subgroups",
    title: "Natural killer cell program",
    type: "Blood RNA signatures · antibody-defined subgroups",
    observed:
      "TEDDY and DIPP linked an NK-associated program with progression in autoantibody-defined groups.",
    limit:
      "Validation of a selected signature does not validate every linked pathway or establish a causal role.",
    hypothesis:
      "Proposed: determine when this program adds predictive information. Future antibody subtype cannot be used as a pre-antibody predictor.",
    sources: ["teddy"],
    timing: "Timing depends on subgroup",
    replication: "Selected signal tested in DIPP",
    mechanism: "Causality remains unresolved",
    safety: "NK modulation not established here",
    windows: {
      before:
        "Keep pre-seroconversion analyses separate from later progression analyses.",
      stage2:
        "Progression relevance needs validation in the exact stage 2 population.",
      after:
        "Progression association does not establish benefit from modulating NK cells after diagnosis.",
    },
    study:
      "Does a frozen NK-associated signature improve prediction beyond information available at each visit?",
    comparison:
      "Clinical and antibody-history model versus the same model plus the predefined RNA signature.",
    falsifier:
      "Benefit vanishes in participant-level external validation or only appears when future antibody information is used.",
  },
};

const DISEASE_WINDOWS: readonly {
  id: DiseaseWindow;
  label: string;
  question: string;
}[] = [
  {
    id: "before",
    label: "Before autoantibodies",
    question: "What changes before detectable autoimmunity?",
  },
  {
    id: "stage2",
    label: "Stage 2 progression",
    question: "What predicts progression from stage 2?",
  },
  {
    id: "after",
    label: "After diagnosis",
    question: "What can preserve function after diagnosis?",
  },
];

const DISEASE_PHASES = [
  { id: "before", label: "Before antibodies" },
  { id: "stage1", label: "Single or multiple antibodies" },
  { id: "stage2", label: "Stage 2" },
  { id: "after", label: "Stage 3" },
] as const;

const EVIDENCE_VIEWS: readonly {
  id: EvidenceView;
  label: string;
  announcement: string;
}[] = [
  {
    id: "evidence",
    label: "Evidence chain",
    announcement: "Evidence chain",
  },
  {
    id: "influence",
    label: "Can we influence it?",
    announcement: "Intervention evidence",
  },
  { id: "study", label: "Next study", announcement: "Proposed next study" },
];

type InterventionContext = {
  heading: string;
  body: string;
  limit: string;
  sources: readonly SourceId[];
};

const INTERVENTIONS: Record<DiseaseWindow, InterventionContext> = {
  before: {
    heading: "No matched prevention result in this example set",
    body: "Later-stage treatment findings can suggest experiments. They do not establish benefit before autoantibodies.",
    limit:
      "A drug affecting a related pathway is not yet a supported treatment connection.",
    sources: ["label", "bandit"],
  },
  stage2: {
    heading: "Stage-matched example: teplizumab",
    body: "FDA labeling includes delaying stage 3 in eligible people with stage 2 T1D.",
    limit:
      "This is stage-level evidence, not proof that the selected RNA signal predicts treatment benefit. Eligibility and harms remain part of the result.",
    sources: ["label"],
  },
  after: {
    heading: "After diagnosis: durability changes the interpretation",
    body: "BANDIT follow-up found that baricitinib benefits waned after treatment stopped.",
    limit:
      "A molecular effect, a clinical benefit, and a lasting benefit are separate outcomes. This does not establish pre-antibody prevention.",
    sources: ["bandit"],
  },
};

type ProposedStudy = {
  question: string;
  comparison: string;
  outcome: string;
  falsifier: string;
};

function proposedStudy(signal: Signal, stage: DiseaseWindow): ProposedStudy {
  if (stage === "stage2") {
    return {
      question:
        "Does this signal improve prediction of stage 3 among people already confirmed to have stage 2?",
      comparison:
        "Established clinical and antibody information versus the same information plus a frozen molecular signature.",
      outcome:
        "Progression from confirmed stage 2 to stage 3, with a prespecified prediction horizon.",
      falsifier:
        "The signal adds no useful prediction beyond existing information in an independent, stage-matched cohort.",
    };
  }

  if (stage === "after") {
    return {
      question:
        "Does changing this signal accompany or mediate a meaningful benefit after diagnosis?",
      comparison:
        "A controlled intervention study with prespecified molecular, clinical, safety, and post-treatment outcomes.",
      outcome:
        "Preservation of stimulated C-peptide and clinical outcomes, including persistence after treatment ends.",
      falsifier:
        "Changing the signal fails to improve clinical outcomes, or the harms outweigh the demonstrated benefit.",
    };
  }

  return {
    question: signal.study,
    comparison: signal.comparison,
    outcome:
      "First persistent confirmed islet autoantibody; first multiple-autoantibody event analyzed separately.",
    falsifier: signal.falsifier,
  };
}

function SourceLinks({
  sources,
  label,
}: {
  sources: readonly SourceId[];
  label: string;
}) {
  return (
    <ul className="ia-sources" aria-label={label}>
      {sources.map((sourceId) => {
        const source = SOURCES[sourceId];

        return (
          <li key={sourceId}>
            <a href={source.href} target="_blank" rel="noopener noreferrer">
              {source.label}
              <span className="ia-new-tab" aria-hidden="true">
                {" "}↗
              </span>
              <span className="ia-sr"> (opens in a new tab)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default function TrajectoryExplorer() {
  const instanceId = useId();
  const [selection, setSelection] = useState<Selection>({
    signal: "ifn",
    stage: "before",
    view: "evidence",
  });

  const signal = SIGNALS[selection.signal];
  const selectedWindow = DISEASE_WINDOWS.find(
    (window) => window.id === selection.stage,
  )!;
  const selectedView = EVIDENCE_VIEWS.find(
    (view) => view.id === selection.view,
  )!;
  const intervention = INTERVENTIONS[selection.stage];
  const study = proposedStudy(signal, selection.stage);
  const panelId = (view: EvidenceView) => `${instanceId}-${view}-panel`;
  const matrix = [
    ["Temporal evidence", signal.timing],
    ["Independent validation", signal.replication],
    ["Causal mechanism", signal.mechanism],
    [
      "Human benefit in this window",
      selection.stage === "before"
        ? signal.safety
        : "Assess each intervention separately",
    ],
  ];

  return (
    <section
      className="trajectory-explorer"
      aria-labelledby={`${instanceId}-question`}
    >
      <div className="ia-shell">
        <p className="ia-concept">Interactive concept</p>
        <p className="ia-kicker">From early change to a testable mechanism</p>
        <h2 id={`${instanceId}-question`}>{selectedWindow.question}</h2>
        <p className="ia-intro">
          Follow the timing, the biological explanation, and the evidence for
          influencing it.
        </p>

        <div className="ia-controls">
          <div>
            <span className="ia-label">Question window</span>
            <div
              className="ia-stage-group"
              role="group"
              aria-label="Question window"
            >
              {DISEASE_WINDOWS.map((window) => (
                <button
                  key={window.id}
                  className="ia-stage"
                  type="button"
                  aria-pressed={selection.stage === window.id}
                  data-stage={window.id}
                  onClick={() =>
                    setSelection((current) => ({
                      ...current,
                      stage: window.id,
                    }))
                  }
                >
                  {window.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ia-workspace">
          <div className="ia-sidebar">
            <span className="ia-label">Published signal examples</span>
            <div
              className="ia-signal-list"
              role="group"
              aria-label="Biological signals"
            >
              {SIGNAL_ORDER.map((signalId) => (
                <button
                  key={signalId}
                  className="ia-signal"
                  type="button"
                  data-signal={signalId}
                  aria-pressed={selection.signal === signalId}
                  onClick={() =>
                    setSelection((current) => ({
                      ...current,
                      signal: signalId,
                    }))
                  }
                >
                  <strong>{SIGNALS[signalId].label}</strong>
                  <span>{SIGNALS[signalId].description}</span>
                </button>
              ))}
              <p className="ia-sidebar-note">
                Literature examples only. Personal trajectories require
                participant-level data.
              </p>
            </div>
          </div>

          <section
            className="ia-detail"
            aria-labelledby={`${instanceId}-signal-title`}
          >
            <div className="ia-detail-head">
              <p className="ia-source-type">{signal.type}</p>
              <div className="ia-head-row">
                <h3 id={`${instanceId}-signal-title`}>{signal.title}</h3>
                <span className="ia-pill">
                  {selection.stage === "before"
                    ? "Primary question"
                    : "Related question"}
                </span>
              </div>
            </div>

            <ol
              className="ia-lane"
              aria-label="Disease windows, schematic and not to time scale"
            >
              {DISEASE_PHASES.map((phase) => {
                const isActive = phase.id === selection.stage;

                return (
                  <li
                    key={phase.id}
                    className={`ia-phase${isActive ? " is-active" : ""}`}
                    data-phase={phase.id}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <b>{phase.label}</b>
                    <em>{isActive ? "Selected window" : ""}</em>
                  </li>
                );
              })}
            </ol>

            <div
              className="ia-tabs"
              role="group"
              aria-label="Evidence view"
            >
              {EVIDENCE_VIEWS.map((view) => (
                <button
                  key={view.id}
                  className="ia-tab"
                  type="button"
                  data-view={view.id}
                  aria-pressed={selection.view === view.id}
                  aria-controls={panelId(view.id)}
                  onClick={() =>
                    setSelection((current) => ({
                      ...current,
                      view: view.id,
                    }))
                  }
                >
                  {view.label}
                </button>
              ))}
            </div>

            <div
              className="ia-panel"
              id={panelId("evidence")}
              hidden={selection.view !== "evidence"}
            >
              <dl className="ia-observations">
                <div className="ia-observation">
                  <dt>Observed</dt>
                  <dd>{signal.observed}</dd>
                </div>
                <div className="ia-observation">
                  <dt>Limiting evidence</dt>
                  <dd>{signal.limit}</dd>
                </div>
                <div className="ia-observation">
                  <dt>Window match</dt>
                  <dd>{signal.windows[selection.stage]}</dd>
                </div>
              </dl>
              <div className="ia-open-question">
                <h4>Connection to test</h4>
                <p>{signal.hypothesis}</p>
              </div>
              <SourceLinks
                sources={signal.sources}
                label="Sources for the selected signal"
              />
            </div>

            <div
              className="ia-panel"
              id={panelId("influence")}
              hidden={selection.view !== "influence"}
            >
              <div className="ia-matrix">
                {matrix.map(([label, value]) => (
                  <div className="ia-matrix-row" key={label}>
                    <span>{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
              <div className="ia-treatment">
                <h4>{intervention.heading}</h4>
                <p>{intervention.body}</p>
                <p className="ia-small">{intervention.limit}</p>
                <SourceLinks
                  sources={intervention.sources}
                  label="Sources for this disease window"
                />
              </div>
            </div>

            <div
              className="ia-panel"
              id={panelId("study")}
              hidden={selection.view !== "study"}
            >
              <div className="ia-study">
                <div>
                  <span>Proposed question</span>
                  <strong>{study.question}</strong>
                </div>
                <div>
                  <span>Comparison</span>
                  <p>{study.comparison}</p>
                </div>
                <div>
                  <span>Outcome</span>
                  <p>{study.outcome}</p>
                </div>
                <div>
                  <span>What would weaken the idea?</span>
                  <p>{study.falsifier}</p>
                </div>
                <div>
                  <span>Needed to run</span>
                  <p>
                    Linked samples, ages, event intervals, assay metadata, and
                    permission for participant-level analysis.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="ia-research-note">
          <span>Source-based findings · Proposed connections are labeled</span>
          <span>Research design · No individual risk estimate</span>
        </div>
        <div className="ia-sr" role="status" aria-live="polite" aria-atomic="true">
          {`${signal.title}. ${selectedWindow.label}. ${selectedView.announcement}.`}
        </div>
      </div>
    </section>
  );
}
