# Data-source research: where job-ad data comes from

> 2026-09-27, main session. Four questions: sources without LinkedIn/SEEK, SME gaps, measuring/displaying bias, and negotiable licences.
> **[Verified]** is supported by the links below; **[To verify]** needs human confirmation before launch. This is not legal advice.

## 0. Findings

1. **Blocking: Adzuna's free API cannot support our core metrics.** Free uses are displaying ads, Jobsworth salary estimates, and personal research; other commercial uses get 14 trial days. Ongoing delivery in raw or aggregate form, including counts/average salaries, is **explicitly prohibited without written consent [Verified]**. Free quota is 250/day, 2,500/month [Verified], below architecture §6.7's assumed 400/day.
   → The Adzuna-first skill plan in §§6.2/6.7 **cannot launch without written permission**. Change M1 prerequisites (§6).
2. **Alternative: public ATS job APIs.** Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Workday etc. offer unauthenticated public job endpoints intended for external retrieval/reposting [public endpoints verified; terms pending]. First-party jobs disappear when removed, avoiding stale ads. LinkUp built a business exclusively on employer sites.
3. **Official totals as benchmark.** Monthly JSA IVI covers SEEK, CareerOne, Workforce Australia, since 2006, ANZSCO4 × state/SA4 [Verified]. It provides a lawful SEEK-derived signal, but only occupational.
4. **SME gaps are material.** In 2023–24, firms with 0–19 employees accounted for ~39% of private employment (>5 million), 62% in construction [Verified, ASBFEO/ABS]. Many lack ATS and advertise only on SEEK/Indeed. ATS systematically undercounts SME-heavy skills/sectors such as Xero, MYOB, construction, retail, care.
5. **Coverage must be first-class**: monthly occupation × state coverage governs notes/signal suppression (§4), consistent with PRD §10.1 rather than pretending completeness.

## 1. Source inventory

| Layer | Source | Content/granularity | Licence/terms | Use | Rating |
|---|---|---|---|---|---|
| Official | **JSA IVI** | New ads, ANZSCO4 × state/SA4, monthly since 2006, three boards above | JSA publications generally CC BY 4.0; **dataset licence pending**, official retrieval timed out | Role `ad_count`/history, coverage denominator, occupation reweighting | ✅ Role primary |
| Official | **Total New Vacancies** | Quarterly all-new-job estimate combining IVI and REOS, including offline jobs [Verified] | Same, pending | Context on online ads' fraction of recruitment | ✅ Calibration |
| Official | **ASC / National Skills Taxonomy** | ASC: 10 competencies; 1,925 specialist tasks in 279 clusters/29 families; 88 tools [Verified NSC]. New JSA taxonomy in discussion-draft stage [Verified] | CC BY 4.0 pending | Skill definitions, dictionary, component priors, GLOSSARY §5 | ✅ Taxonomy |
| Public index | **Indeed Hiring Lab**, GitHub | Total postings, remote/AI shares, salary growth; multi-country, remote explicitly includes AU [Verified] | **CC BY 4.0 with attribution [Verified]** | SME-heavy platform trend reference/remote calibration | ✅ Reference |
| First-party | **Public ATS APIs**, Greenhouse/Lever/Ashby/Workable/SmartRecruiters/Recruitee/Workday | Job title/location/department/body/link, some salaries | Public/no auth verified; **vendor commercial terms pending** | Skill counts, entry/rights/remote/liveness | ✅ Skill primary after terms |
| First-party | **PageUp**, common in AU universities/government/large firms; SuccessFactors | Employer careers pages | Public API pending | University/government coverage | ❓ Investigate |
| Government boards | APSJobs/state boards | Public-sector jobs | Terms/sources pending | Public employment ~17%, to verify | ❓ Investigate |
| Licensed | **Adzuna** | Aggregate ads, paid Intelligence portal/custom aggregates/structured data/API, eight years, **minimum 12-month licence [Verified]**; supplies Workforce Australia/UK statistics [Verified] | Free commercial aggregates prohibited [Verified] | Breadth/salaries if licensed | 🔶 Negotiate |
| Licensed | **Employment Hero** | AU SME HR/payroll/recruitment/board; SME index uses 300K businesses' payroll [Verified] | No public data licence | **Best SME-gap candidate** | 🔶 After user scale |
| Licensed | JobAdder/recruiters, career-centre systems such as CareerHub | Recruiter/campus jobs | Negotiate | Recruiter/campus gaps | 🔶 Later |
| Prohibited | LinkedIn/SEEK/Indeed scraping | — | Terms prohibit; CLAUDE constraints | Exclude | ⛔ |

## 2. Why avoid LinkedIn / SEEK

- **Actual hiQ outcome [Verified]**: success on public-page CFAA arguments did not establish unrestricted lawful scraping. December 2022 consent judgment included USD500K against hiQ for agreement breaches/fake accounts on login-required pages; delete all LinkedIn data, no unlicensed use/distribution/sale. A counterexample, not a blanket scraping precedent.
- **Australian privacy [Verified]**: OAIC and 11 authorities' August 2023 statement, including letters to LinkedIn, emphasised that **public personal information remains protected**; October 2024 follow-up. Strip recruiter names/contact details before storage regardless of source (APP 3).
- **Commercial risk**: public commercial products are easy to identify/evidence; blocking can break supply at any time, undermining our credibility.

## 3. Competitor sources: why they can sell data

| Company | Sources | Customers | Lesson |
|---|---|---|---|
| **LinkUp** | Daily 75–80K employer sites, history since 2007, openings/closures [Verified] | Systematic hedge funds, asset managers, private equity, alternative data [Verified]; S&P job index partnership | Employer-only data can be valuable, with no duplicates/stale jobs |
| **Lightcast** | 220K+ global employer/board/aggregator/government sites; deduplication removes up to ~80% [Verified] | Universities/governments/HR | Scale plus legal support; **some JSA analyses use Lightcast**, search evidence, scope pending |
| **Adzuna Intelligence** | Its own aggregate ads | UK statistics, Workforce Australia, businesses | Our proposed free use is its paid product, explaining commercial aggregate restrictions |

**Are we giving valuable data away?** They sell granular records, history, APIs, customised reports, often tens of thousands annually; we offer student-facing aggregates. Derived licensed aggregates are not automatically resellable. Our distinctive data links signals to people: what students watch, practitioner advice, changed directions. Under the neutrality firewall, future universities may receive anonymous aggregate insights, never sold personal data.

## 4. Measuring/displaying coverage bias

**4.1 Sources of bias**

| Better covered | Poorly covered |
|---|---|
| ATS medium/large technology, banks, consulting, universities, graduate programs | SMEs (39% private jobs, 62% construction), recruiters, SEEK-only jobs |

Bias **varies** by industry and economic cycle (SMEs may cut hiring first after rate rises). Shares/changes do not eliminate missing-data bias.

**4.2 Coverage metric, proposed M1 requirement**

- `coverage_ratio(anzsco4, state, month)` = our deduplicated new ads / IVI new ads in that cell.
- IVI itself covers three boards, not all jobs; overlapping but different populations make this **approximate relative coverage**, not an exact sampling rate. TNV contextualises online recruitment coverage.
- **Reweighting**: post-stratify skill `share_of_ads` by IVI occupation/state shares to correct large-employer/tech overrepresentation. **Unfixable**: within-occupation SME/large-firm skill differences (Xero versus SAP accountants) are unobserved.

**4.3 Display, PRD §10.1**

| Coverage | Display |
|---|---|
| ≥ 40%, calibrate on real data | Normal |
| 15–40% | Beside value: "We see about X% of ads for this occupation; small businesses may be under-counted." |
| < 15% or insufficient sample | Suppress changes/signals; "Not enough coverage yet" |

Skill coverage weights its main occupations. Industry pages show overall industry coverage.

**4.4 Product scope**

- USYD Engineering/IT software/data has the best ATS coverage; MVP unaffected.
- New non-tech construction/retail/care fixtures likely have low coverage at launch. Launch with disclosure or wait for SME sources such as Employment Hero: **user decision required**.

## 5. Collection guidance for M1

- **Employer registry**: `employers(name, abn?, ats, board_token, anzsic, size_band, verified_at)`. Manually seed ASX200, Big Four, banks, universities, government, AU tech; record ATS/public endpoint.
- **One request per employer per day**: all active jobs; new appearance = new, disappearance = closed, providing live data. Negligible server load; honour robots/rates, identifiable User-Agent.
- **Deduplicate** across ATS/channels by `(employer, normalized_title, location, description hash)`.
- **Privacy**: remove names/email/phone before storage; retain derived fields, following architecture 30-day raw-text policy.
- **Replaceability**: retain `AdsSource`; licensed Adzuna becomes another adapter.

## 6. Proposed decisions for PROGRESS

1. **M1 primary = public ATS + JSA IVI**, Adzuna only after licensing. Rewrite architecture §§6.2/6.7 and M1: registry/adapters/coverage; estimate may increase.
2. **First-class `coverage_ratio`** in registry with §4.3 display.
3. **Manual prelaunch checks**: IVI/ASC licences; Greenhouse/Lever/Ashby/Workable/SmartRecruiters/Workday commercial aggregation terms; PageUp API; APSJobs/state terms.
4. **Outreach sent personally by user**:
   - Now: ask Adzuna for written startup/education aggregate-count permission; offer attribution/Jobs by Adzuna referral links (listing ads is already an allowed free use).
   - After scale: Employment Hero, SEEK, career centres.
5. **Non-tech rollout**: disclosures now or defer until SME partnerships.

## Sources

- Adzuna API Terms of Service — https://developer.adzuna.com/docs/terms_of_service
- Adzuna Intelligence (paid data licensing)— https://www.adzuna.co.uk/adzuna-intelligence/; G-Cloud service description — https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/499953347032977
- JSA Internet Vacancy Index and methodology — https://www.jobsandskills.gov.au/data/internet-vacancy-index, https://www.jobsandskills.gov.au/data/internet-vacancy-index/methodology
- JSA Total New Vacancies — https://www.jobsandskills.gov.au/news/new-measure-job-vacancies-launched-today
- JSA National Skills Taxonomy — https://www.jobsandskills.gov.au/data/national-skills-taxonomy
- ASC structure (NSC)— https://www.nationalskillscommission.gov.au/reports/australian-skills-classification-10/part-3-methodology/32-structure-classification-and-its-coverage
- ASBFEO (citing ABS Australian Industry 2023–24)— https://www.asbfeo.gov.au/small-business-data-portal/contribution-australian-employment
- Indeed Hiring Lab data (CC BY 4.0)— https://github.com/hiring-lab, https://www.hiringlab.org/indeed-data-faq-2/
- Greenhouse Job Board API — https://developers.greenhouse.io/job-board
- Public ATS API comparison — https://dev.to/primeflowio/how-to-pull-every-open-job-from-greenhouse-lever-ashby-and-smartrecruiters-with-public-apis-and-55l5
- LinkUp — https://www.linkup.com/products/raw, https://www.linkup.com/industry-solutions/capital-markets
- Lightcast methodology — https://kb.lightcast.io/en/articles/7124763-data-collection-and-processing-methodology, https://kb.lightcast.io/en/articles/6957661-how-does-lightcast-handle-duplicate-postings
- hiQ v. LinkedIn settlement — https://natlawreview.com/article/hiq-and-linkedin-reach-proposed-settlement-landmark-scraping-case, https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn
- OAIC joint scraping statements — https://www.oaic.gov.au/news/media-centre/global-expectations-of-social-media-platforms-and-other-sites-to-safeguard-against-unlawful-data-scraping, https://www.oaic.gov.au/news/media-centre/global-privacy-authorities-issue-follow-up-joint-statement-on-data-scraping
- Employment Hero SME Index — https://employmenthero.com/sme-index/
