const paper = "https://publications.wehi.edu.au/document/867";
const trialnet = "https://repository.niddk.nih.gov/study/80";
const rows = [
  {group:"TrialNet · development", criteria:"Relatives with multiple antibodies, tested near first detection.", n:1208, years:1.8, auc:"0.748 (0.712–0.785)", page:7, catalog:trialnet},
  {group:"TrialNet · validation", criteria:"Separate relatives with multiple antibodies who met the validation criteria.", n:864, years:2.4, auc:"0.745 (0.712–0.779)", page:7, catalog:trialnet},
  {group:"TEDDY", criteria:"Children followed from birth for inherited risk, with multiple antibodies and a two-hour sample.", n:209, years:2.1, auc:"0.865 (0.792–0.938)", page:9, catalog:"https://repository.niddk.nih.gov/study/24"},
  {group:"Fr1da", criteria:"Children identified through general-population screening in Bavaria, with multiple antibodies.", n:80, years:3.1, auc:"0.742 (0.596–0.889)", page:9, catalog:"https://clinicaltrials.gov/study/NCT04039945"},
  {group:"DPT-1", criteria:"Relatives enrolled in prevention trials who screened positive for islet cell antibodies.", n:601, years:3.1, auc:"0.694 (0.649–0.738)", page:9, catalog:"https://repository.niddk.nih.gov/study/36"},
  {group:"TrialNet · single antibody", criteria:"Relatives with one antibody at testing. Some later contributed to the multiple-antibody groups.", n:612, years:2.2, auc:"0.701 (0.594–0.808)", page:9, catalog:trialnet},
];

export default function CohortComparison() {
  return <details className="cohort-comparison" open>
    <summary>Compare cohorts</summary>
    <p>How well did the same two-hour model distinguish people who went on to a stage 3 diagnosis? The researchers combined glucose and C-peptide from an oral glucose tolerance test with age, sex, BMI, HbA1c and IA-2 antibody status.</p>
    <div className="cohort-scroll" role="region" aria-label="Cohort comparison table" tabIndex={0}><table>
      <caption>Published M120 results by analysis group</caption>
      <thead><tr><th scope="col">Group and selection</th><th scope="col">People</th><th scope="col">Median follow-up</th><th scope="col">AUC (95% interval)</th></tr></thead>
      <tbody>{rows.map(row=><tr key={row.group}><th scope="row"><a href={row.catalog} target="_blank" rel="noreferrer">{row.group}</a><small>{row.criteria}</small></th><td>{row.n.toLocaleString("en-US")}</td><td>{row.years} years</td><td><a href={paper+"#page="+row.page} target="_blank" rel="noreferrer">{row.auc}</a></td></tr>)}</tbody>
    </table></div>
    <p>AUC measures how well a score separates outcomes. A value of 0.5 indicates chance-level ranking and 1.0 indicates perfect ranking. The intervals show uncertainty. Differences in age, recruitment and follow-up complicate comparisons between groups.</p>
    <p><b>Shared participants.</b> Of the 612 people in the single-antibody group, 72 later contributed to model development and 17 to TrialNet validation. All six rows come from one publication. <a href={paper+"#page=7"} target="_blank" rel="noreferrer">See the overlap analysis ↗</a></p>
    <p><b>Where performance fell.</b> In DPT-1 the full five-sample risk score had an AUC of 0.800, compared with 0.694 for M120. TEDDY collected only the two-hour sample, limiting comparisons with other sampling times. <a href={paper+"#page=9"} target="_blank" rel="noreferrer">Table 3 ↗</a></p>
    <small>Public aggregate results from Bediaga et al. Follow-up starts at the first glucose tolerance test. Group names open study records. AUC values open the source tables. Participant data require separate access.</small>
  </details>;
}
