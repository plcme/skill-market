# PRD — Skill market × Practitioner matching (Brewdex)

| Item | Details |
|---|---|
| Status | Draft v0.1 — awaiting product owner confirmation |
| Product name | **Brewdex** (confirmed 2026-10-23). Use configuration constant `APP_NAME` throughout code; repository codename `skill-market`; domain `brewdex.app` purchased |
| Target market | Australia only (user decision, 2026-10-21: defer NZ and other countries because of compliance and data costs); global growth later |
| Document language | English, including terminology, field names, and variable names |
| Evidence | Competitor analysis, interview and questionnaire analysis, requirements traceability, and data-source research under `docs/research/` |

> **Evidence first**: where ideas in the original working document conflict with user research, research takes precedence (for example, research explicitly rejects rankings and deficit framing such as "your position is weak"). Items marked **[Assumption]** lack user evidence and must be validated after launch.

---

## 1. Background and problem

Australian university students must decide "what to learn" when choosing majors, units, projects, internships, and graduate programs. Information is scattered across job ads, government labour data, career centres, and personal networks. Students face three gaps:

1. **Signals are unclear and irrelevant**: public labour data serves policymakers, without filters for students' majors, years, locations, or work rights. Missing definitions and denominators invite misinterpretation (4/4 interviewees questioned metric definitions).
2. **Demand ≠ decision**: students do not learn a skill simply because it is "rising"; interests, available time, and transferability also matter (4/4 emphasised personal relevance; 3/4 explicitly would not act on demand alone).
3. **The right person is hard to find and approach**: students value practitioners' concrete experience most (4/4), but cold outreach has substantial friction: not knowing whom to approach, fearing seeming transactional, and giving up after being ignored (3/4).

In the questionnaire, 5/6 respondents felt their degree had not prepared them for employment. The gap is **depth, practical context, and prioritisation**, rather than a complete absence of technical knowledge.

**Competitive landscape**: data tools (JSA, ITJobsWatch, LinkedIn Jobs on the Rise) provide signals without people; networking tools (Aphinity, ADPList, career centres) provide people without signals. **No product matches students to practitioners based on market signals** (see `docs/research/competitor-analysis.md` §§3–4).

## 2. Positioning

**One sentence**: turn Australian labour-market demand into a trackable market board where students watch relevant skills and roles, then find an employed practitioner with the skill for a 20-minute coffee chat when a signal warrants exploration.

**Core proposition: the two features form one experience.** Matching reasons originate in market signals ("You watch Rust; it has grown substantially over 12 months in Sydney entry-level roles; this practitioner entered the industry using Rust two years ago"). Signals suggest what to ask; people explain how to interpret them.

**Commercial stance**: any party may pay (students, practitioners, universities, employers, or other organisations), but **revenue never influences the market board**. No payer can buy, adjust, or influence metrics, signals, sorting, or matching reasons. This avoids recruitment agencies' incentive mismatch of filtering out inexperienced candidates (§12.1).

**Metaphor policy**: stock-market metaphors (watchlist, trends, ticker cards) are lightweight interface language to aid understanding. Do not introduce portfolio returns, rankings, or "position strength" concepts that could harm or mislead. Offer a plain-text mode without metaphors (**[Assumption]**: validate whether needed).

## 3. Users and personas

### 3.1 User segments

| Segment | Users | Served by MVP? |
|---|---|---|
| Primary | Current undergraduate/postgraduate students, including international students | ✅ |
| Primary (supply) | Employed practitioners, especially within three years of entering the industry | ✅ |
| Secondary | Recent/previous graduates and career changers | ✅ Same student flow, without dedicated optimisation |
| Secondary | High-school students | ❌ No users under 18 (safety and compliance) |
| Tertiary | University career centres (distribution and practitioner supply), data providers such as JSA | Operational partners, not product users |
| Deferred | Employers / HR / recruiters | ❌ Not MVP platform users; potential payers (§12.1) |

### 3.2 Personas (research-based composites)

**Persona A — The underprepared skill-gap explorer**
Feels unprepared for employment and can identify some skill gaps, but cannot prioritise them. Needs direction rather than a gap list; deficit framing is discouraging. Wants control over automatically inferred skills.
Related stories: US1, US2, US7.

**Persona B — The evidence-and-advice seeker**
Consults university resources and experienced people, but needs sources, freshness, and metric definitions before trusting information. Wants specific practitioner experience, yet worries about approaching strangers and receiving no response.
Related stories: US3, US4, US5, US6, US7.

**Persona C — The willing but time-constrained practitioner [Assumption]**
Entered the industry 1–3 years ago, remembers the uncertainty, and is willing to help students for one or two 20-minute sessions a month, provided they know why they were approached, the student is prepared, and declining is effortless. **There are currently zero supply-side interviews; the entire persona requires validation.**

### 3.3 User stories

| ID | Persona | Story |
|---|---|---|
| US1 | A | As a student who feels underprepared, I want to compare a target role's required skills with mine so I know what to develop next |
| US2 | A | As a student who may be discouraged by skill gaps, I want guidance framed as direction and progress so I can take a manageable next step |
| US3 | B | As a student evaluating career information, I want its source and freshness so I can assess its trustworthiness |
| US4 | B | As a student viewing labour-market trends, I want plain-language definitions and supporting detail for each metric so I understand it before acting |
| US5 | B | As a student exploring career direction, I want concrete practitioner advice to connect market information with real work |
| US6 | B | As a student hesitant to contact practitioners, I want question suggestions and clear alternatives if there is no reply, reducing uncertainty |
| US7 | A, B | As a student receiving inferred skills, I want to inspect, edit, or remove them so my profile reflects my own understanding of myself |
| US8 | C | As a practitioner, I want to know why a student approached me and the time required, with one-click acceptance/rescheduling/declining, so helping has minimal overhead **[Assumption]** |

## 4. Goals and success metrics

### 4.1 Product goals (three months after MVP launch)

1. Students can understand a relevant market signal without signing in.
2. Students can complete a practitioner coffee chat starting from a signal.
3. Validate supply feasibility: practitioners join and attend as agreed.

### 4.2 Metrics

| Type | Metric | Target (initial; recalibrate after launch) |
|---|---|---|
| North Star | Students completing the signal → request → completed coffee chat loop each week | Positive week-on-week growth from week 8 |
| Comprehension | Correct answers to single-choice interpretation questions for each displayed metric in usability tests | ≥ 80% (R1 evaluation criterion) |
| Activation | Visitors completing Tier 0 onboarding and seeing a personalised board | ≥ 40% |
| Retention | W4 return rate for students with a watchlist | ≥ 25% |
| Matching | Requests accepted within 72 hours | ≥ 50% |
| Reliability | Both-party attendance at confirmed coffee chats | ≥ 85% |
| Debrief | Completed chats with an L0 vote | ≥ 60% |
| Supply | Practitioners with open slots in the launch niche | ≥ 30 |
| Emotional safety | Usability participants describing the UI as discouraging or like a ranking | 0 |

## 5. Scope

### 5.1 MVP (first public release)

- Instruments: **skills + roles**, with reciprocal navigation
- Data: AU market, skills/roles in the launch niche (§12.2)
- Anonymous browsing of the board, ticker cards, and metric definitions
- Compound location + work mode + work rights filters
- Email + Google registration/sign-in
- Progressive onboarding (Tiers 0–1), inferred and editable skill profiles
- Watchlist (held / watching), with filters as part of each entry
- Gap diagnosis (target role versus own skills), two-instrument comparison
- Practitioner registration, work-email verification, skills/topics, and availability
- Signal-driven matching and the full chat-request lifecycle (timeouts, declines, rescheduling, no-shows)
- L0 debrief votes and practitioner L2 attendance confirmation
- Email notifications (requests, confirmations, reminders, timeouts)
- Privacy controls, account deletion, and data export
- Reporting/blocking and basic administration

### 5.2 Post-MVP

- Industry / employer / credential instruments (reserve support in the data model)
- Markets outside Australia (NZ and international): deferred by user decision on 2026-10-21; reassess compliance and data sources separately before reopening
- Resume import (Tier 2), progressive completion (Tier 3)
- Weekly/monthly digests and watchlist alerts
- L1 structured takeaways and L3 semi-public summaries
- Aggregate sentiment ("11 of 14 people who discussed Rust became more interested in learning it")
- Seasonal defaults for application periods
- LinkedIn sign-in
- Institutional partnerships with university career centres

### 5.3 Explicit exclusions (Won't)

- Paid features and payment integration (any payer permitted, §12.1; no MVP charging)
- Employer job posting or access to students
- Job applications or resume submission
- Student rankings, percentiles, or a single employability-readiness score (violates R7)
- Scraping platforms that prohibit it, such as LinkedIn and SEEK
- In-platform instant messaging (coffee chats are asynchronous bookings, not IM)
- Users under 18

## 6. Core concepts and terminology

| Term | Identifier | Definition |
|---|---|---|
| Instrument | instrument | Trackable entity. `instrument_type` ∈ skill / role in MVP; reserve industry / employer / credential |
| Skill | skill | E.g. Rust, SQL, Communication; analogous to an individual stock |
| Role | role | E.g. Data Engineer; a weighted basket of skills, analogous to an ETF/index. Role → component skills and weights; skill → roles requiring it |
| Metric | metric (called a "perspective" in the UI and Y axis in the original document) | A measure such as `share_of_ads` or `growth_12m`. Every metric needs a definition, unit, denominator, source, and time window |
| Filter rule | `filter_rule` | One work mode `work_mode` + a set of locations; multiple rules form a union. Also includes seniority and `work_rights` conditions |
| Signal | signal | Significant change for an instrument under a filter (e.g. 12-month growth exceeding a threshold), potentially triggering alerts and matching |
| Ticker card | `ticker_card` | Smallest information unit for an instrument; row / card / full-page sizes |
| Watchlist | watchlist | Instruments a student tracks. Entry = instrument + filters. Status held (skills I have) or watching |
| Skill profile | `skill_profile` | Student skill set; each has source ∈ `self_reported` / inferred / confirmed; inferences carry confidence |
| Practitioner | practitioner | Identity-verified employed person who opts in |
| Chat request | `chat_request` | Student's request for a 20-minute conversation, carrying signal context and a decision question |
| Match reason | `match_reason` | Explanation of why a person is suggested, based on interpretable factors such as signal, skill, and industry-entry date |
| Debrief vote | `debrief_vote` (L0) | One click after a chat: more interested / less interested / unchanged |
| Reliability | reliability | Attendance-based record. **For scheduling and internal risk controls only; never display student scores to students** |

## 7. Functional requirements

Priority: **M** = Must (required for MVP), **S** = Should (aim for MVP; may defer), **C** = Could (Post-MVP).
"Research" refers to R1–R8 in `docs/research/requirements-traceability.csv` and SR1–SR6 in the report.

### 7.1 Market data and metrics

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-D1 | Collect periodically from authorised sources and calculate instrument metric time series across filter dimensions | M | — | Scheduled pipeline runs; every point traces to its source, collection time, and raw record count |
| FR-D2 | Every displayed metric includes a plain-language definition, unit, denominator/base, time window, geography, seniority, source, and last update | M | R1, SR2, SR3 | All fields one click away beside any metric; no unexplained percentages |
| FR-D3 | Show absolute counts with rates (e.g. "+38% (120 → 166 jobs)") to distinguish growth from share | M | R1, 4/4 interviews | ≥ 80% interpretation accuracy in usability tests |
| FR-D4 | Below a configurable sample threshold, show "Insufficient sample; trend unreliable", suggest broader filters, and omit trend lines | M | — | Configurable threshold; no trend line below it |
| FR-D5 | Visually distinguish official statistics / aggregated job ads / practitioner experience | M | SR2 | Consistent marker for each source type |
| FR-D6 | Standard skill/role classifications (ANZSCO role backbone), with alias normalisation such as "JS" → JavaScript | M | — | Alias searches find canonical instruments |
| FR-D7 | Model all five `instrument_type` values; expose only skill and role in MVP | M | Original D5 | Adding a type requires no schema change |

**MVP metric set (instrument × metric validity)**: allow only valid combinations. Each instrument type has one default, 4–6 common metrics, and an Advanced drawer.

| Metric | skill | role | MVP common | Notes |
|---|:--:|:--:|:--:|---|
| `ad_count` Job ads | ✅ | ✅ | ✅ | |
| `share_of_ads` Share of all ads | ✅ Default | ✅ | ✅ | |
| `growth_12m` 12-month change | ✅ | ✅ Default | ✅ | Include absolute counts |
| `entry_level_share` Entry-level share | ✅ | ✅ | ✅ | Differentiating metric |
| `no_pr_required_share` Ads not requiring PR/citizenship | ✅ | ✅ | ✅ | Essential for international students; extracted from ad text, with method and error disclosed |
| `employer_concentration` Employer concentration | ✅ | ✅ | ✅ | "How many different employers are hiring" |
| `salary_median` Median salary | ✅ | ✅ | ✅ | Include skills (user decision, 2026-10-17): median disclosed salary among ads mentioning the skill |
| `salary_p10_p90` Salary range | ❌ | ✅ | Advanced | |
| `skill_premium` Skill premium | ✅ | ❌ | Advanced | Enable only with sufficient data |
| `remote_share` Remote/hybrid share | ✅ | ✅ | Advanced | |
| `contract_share` Contract share | ✅ | ✅ | Advanced | |
| `skills_per_ad` Skills per job ad | ❌ | ✅ | Advanced | |
| volatility Volatility | ✅ | ✅ | Advanced | |
| seasonality Seasonality | ✅ | ✅ | C | Requires ≥ 2 years of data |

### 7.2 Board and ticker cards

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-M1 | Anonymous users can browse the board, search instruments, and view full ticker pages | M | Original 2d: value before information | All public data pages accessible without an account |
| FR-M2 | Three ticker sizes: row (name, current value, change, sparkline); card (adds entry-level share, location, key fundamentals); full page (history, metric selection, co-occurring skills, salary percentiles, chat entry) | M | — | Shared component system across sizes |
| FR-M3 | Role pages show component skills and weights; skill pages show roles requiring them; co-occurring skills are linked | M | — | Skill ↔ role navigation within two hops |
| FR-M4 | Metric selector offers only valid combinations (§7.1 matrix) | M | — | Invalid combinations unavailable |
| FR-M5 | Compare two instruments side by side (e.g. skills linked to electives or roles linked to career paths), including relevance, transferability, and learning effort | M | R3, US1 | Students can explain evidence and tradeoffs |
| FR-M6 | Support a 30-second watchlist overview and 15-minute exploration (compare, filter, drill down), mobile first | M | Original 2c | Core flows work at 375px |

### 7.3 Filters

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-F1 | Rule-based filtering: work mode (onsite/hybrid/remote) + locations per rule; multiple rules form a union | M | Original 3.3 | Can express "Sydney/Melbourne onsite ∪ AU/NZ remote" |
| FR-F2 | Start with one rule; progressively disclose compound filtering | M | — | New users initially see a single rule |
| FR-F3 | Read filters back in natural language ("Currently showing onsite roles in Sydney or Melbourne, plus remote roles across AU/NZ") | M | — | Every filter state has a textual readback |
| FR-F4 | Location hierarchy: region → city → state → country; any level selectable | M | — | |
| FR-F5 | Seniority (entry-level / graduate / all) and work rights (no PR/citizenship requirement) sit alongside geography | M | R2 | |
| FR-F6 | Save filters within watchlist entries ("Rust, entry-level, Sydney onsite or AU remote" is the tracked object) | M | Original 3.3(5) | Watchlist model includes filters |

### 7.4 Watchlist and alerts

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-W1 | Signed-in users add instrument + filter to a watchlist as held or watching | M | — | |
| FR-W2 | Show change since adding an entry | M | — | |
| FR-W3 | Highlight triggered signals and provide a chat entry | M | R6 | |
| FR-W4 | Weekly/monthly email digest (optional) and signal alerts | S | — | Users can change frequency or unsubscribe in settings |

### 7.5 Onboarding and skill profiles

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-O1 | Tier 0 (~10 seconds): university + degree + year → inferred skill profile → immediate personalised board | M | R8 | At most three fields |
| FR-O2 | Tier 1 (~60 seconds): select completed units from a prefilled list to add skills | M | — | Launch university's unit catalogue available |
| FR-O3 | Any tier can be skipped or stopped midway | M | R8 | |
| FR-O4 | Label inferred skills as suggestions with confidence; confirm/remove in one action | M | R8, SR4, US7 | Participants correct an inference in one step |
| FR-O5 | Frame profiles as confirmed skills / suggested exploration / next steps; no percentiles, rankings, or readiness scores | M | R7, SR4, US2 | No usability participant interprets it as ranking |
| FR-O6 | New users with few skills see a starting point and feasible next step, not a blank page or gap list | M | Interviews E01/E02 | Dedicated empty states |
| FR-O7 | Tier 2 resume import requires manual confirmation; never apply silently. Strip names, addresses, phone numbers, and visa status automatically | C | Original 2d(4) | |

### 7.6 Gap diagnosis

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-G1 | Compare a selected role's component skills with the student's profile and suggest a few feasible priorities | M | SR1, US1 | Highlight at most three priorities |
| FR-G2 | Explain each recommendation's relevance, entry-level suitability, transferability, and learning effort | M | R3 | |
| FR-G3 | Suggest traceable ways to acquire skills (units, projects, credentials) | S | — | |

### 7.7 Practitioner supply

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-P1 | Practitioners opt in and verify employment through a **work-email domain** | M | Competitor §4.2(4), safety | Unverified practitioners cannot be matched |
| FR-P2 | Record skills, industry-entry year, current role/industry, topics, and monthly chat cap | M | R4 | |
| FR-P3 | Publish bookable slots (not open DMs), with time-zone support | M | ADPList lessons | |
| FR-P4 | Requests show student year/major, triggering signal, specific decision question, and duration | M | US8 | |
| FR-P5 | One-click accept / reschedule / decline; no reason required for declining | M | US8 | |
| FR-P6 | Pause requests at any time | M | — | |

### 7.8 Matching and coffee-chat requests

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-C1 | Start a chat from a ticker card or watchlist signal, carrying the selected signal and filters | M | R6 | |
| FR-C2 | Match on skill held + industry-entry time + open slots + monthly capacity; return at most three candidates | M | R4, C7 | |
| FR-C3 | Show each candidate's match reason, topics, available times, and entry path | M | R4 | |
| FR-C4 | Generate three editable conversation starters from the signal and student's decision question | M | R4, SR6 | |
| FR-C5 | Student chooses a slot and enters a decision question before requesting | M | R6, SR5 | |
| FR-C6 | Empty-match fallback: adjacent skills / waitlist / asynchronous Q&A (C) | M | Original T4 | No blank dead ends |
| FR-C7 | Timeout (default 72 hours) automatically releases requests and quietly suggests the next person; never show rejection labels or reply rates to students | M | R5, SR6 | |
| FR-C8 | Declines immediately offer alternatives, without judgemental copy | M | R5 | |
| FR-C9 | Confirmation sends reminders with calendar files and preparation templates; meeting link supplied by practitioner or generated by system **[Pending; §14]** | M | — | |
| FR-C10 | No-show rules active at launch: both parties confirm attendance; repeated practitioner absences pause matching; rules visible to both sides | M | ADPList lessons | |
| FR-C11 | Students control visibility field by field; practitioners see only permitted fields | M | R8 | |

### 7.9 Debrief

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-R1 | L0: one-click more interested / less interested / unchanged vote, plus an optional one-line note, saved in personal instrument history | M | Original D2 | Complete in one click |
| FR-R2 | L2: practitioner confirms chatted / did not chat in one click for attendance records | M | — | |
| FR-R3 | L1: pre-chat starters become optional one-line fill-in prompts afterwards | S | — | |
| FR-R4 | Aggregate sentiment: "M of N people who discussed this skill became more interested"; hide below the N threshold | C | — | |
| FR-R5 | L3: with both parties' consent, publish a semi-public summary under the instrument | C | — | |

### 7.10 Accounts, privacy, and safety

| ID | Requirement | Priority | Research | Acceptance |
|---|---|---|---|---|
| FR-A1 | Email (magic link or password) and Google sign-in | M | — | |
| FR-A2 | Confirm age 18+ at registration | M | — | |
| FR-A3 | Minimise required fields; sensitive fields (visa status, grades, rejection experiences) are optional with benefits explained | M | R8, P02 | |
| FR-A4 | Field-level visibility (self only / matched practitioner) | M | R8 | |
| FR-A5 | Account deletion with all personal data, plus personal data export | M | Privacy Act | Physical deletion within 30 days |
| FR-A6 | Privacy policy and terms pages; explain purpose before collecting personal information | M | APP 1, APP 5 | |
| FR-A7 | Bidirectional reporting and blocking for students and practitioners | M | Stranger-matching safety | |
| FR-A8 | Primarily English UI **[Assumption]**, with architecture supporting later languages | M | — | Centralised copy, not hardcoded in components |

### 7.11 Operations and administration

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| FR-X1 | Admin review/handling of reports and user suspension | M | |
| FR-X2 | Practitioner review queue when email verification fails | M | |
| FR-X3 | Data-pipeline status and last update | M | Notify admins of pipeline failures |
| FR-X4 | Core funnel and North Star dashboard | S | |
| FR-X5 | Skill alias and classification maintenance | S | |

## 8. Key journeys

### 8.1 Main flow: signal → coffee chat → debrief

1. A student sees a watchlist signal: "Rust, Sydney entry-level, 12 months +38% (120 → 166 jobs)".
2. Open the full ticker page: co-occurring skills, entry-level share, regional distribution, sources, and definitions.
3. Select "Talk to someone who uses Rust".
4. Receive at most three candidates with match reasons and three conversation starters.
5. Choose a person and slot, enter a decision (e.g. "COMP3xxx or INFO3xxx next semester?"), and request.
6. The practitioner sees context and accepts / reschedules / declines.
7. Both receive confirmation email and calendar invitations; reminders include preparation templates.
8. Afterwards, the student casts an L0 vote; the practitioner confirms attendance (L2).
9. Save the result in the student's history for that skill.

### 8.2 Required failure paths

| Situation | Response |
|---|---|
| No matches (cold start) | Adjacent skills → waitlist (email when someone joins) → Post-MVP asynchronous Q&A |
| Declined | Show alternatives immediately; do not imply a problem with the student |
| No reply | Release after 72 hours and quietly suggest the next person; no indefinite uncertainty |
| No-show | Both parties confirm; record absence in internal reliability; disclose rules beforehand |
| Insufficient sample | Omit trends and suggest broader filters |
| Stale data | Show last update; label potentially stale data after a threshold |

## 9. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Board/ticker LCP < 2.5s on mobile 4G; public pages cacheable |
| NFR-2 | Mobile first | All core flows work at 375px |
| NFR-3 | Accessibility | WCAG 2.2 AA; chart text alternatives and data-table views; colour never the sole indicator of direction |
| NFR-4 | Privacy | Privacy Act 1988 and APPs; Australian personal-data storage; minimisation and purpose limitation |
| NFR-5 | Security | Database RLS; secrets excluded from the repository and frontend; input validation, rate limits, dependency scans |
| NFR-6 | Freshness | Explicit update frequency per source and last update per metric |
| NFR-7 | Availability | Target 99.5% monthly availability, within hosting SLAs |
| NFR-8 | Observability | Error monitoring, structured logs, core event tracking without sensitive fields |
| NFR-9 | Cost | Free tiers throughout MVP; domain is the only expected paid item |
| NFR-10 | Maintainability | Type safety; automated metric/matching/timeout tests; CI must pass before merge |
| NFR-11 | Portability | Avoid proprietary hosting dependencies (Vercel Hobby prohibits commercial use; migration may be needed) |

## 10. UX principles

Research takes precedence over visual preferences:

1. **Every number explains itself**: definition, denominator, source, and time window available beside it in one click (R1).
2. **Value before information**: real board access without sign-in.
3. **Direction, not deficit**: starting point + next step; never rankings, percentiles, or readiness scores (R7).
4. **Inferences are suggestions**: label system guesses and allow one-step correction (R8).
5. **Demand is one input**: recommendations also explain relevance and effort; growth never implies an obligation to learn (R3).
6. **Safe outreach**: opted-in practitioners only; handle declines and silence privately, always offering a next step (R4, R5).
7. **Light metaphors**: watchlists, trends, and ticker cards are acceptable; "your portfolio is falling" is not.
8. **Asynchronous by default**: pending requests should feel reassuring, not anxiety-inducing.
9. **Less is more**: expose a few common metrics per type and place others under Advanced, avoiding metric worship.

## 11. Data requirements and sources

| Source | Content | Licence | Use | Risk |
|---|---|---|---|---|
| JSA — Internet Vacancy Index / NERO | Monthly occupation (ANZSCO) × region job demand | CC BY 4.0 (recheck) | Role-demand backbone; **official aggregate benchmark** for coverage and skill-data reweighting | **Occupation-level, not skill-level** |
| JSA — Skills Priority List | Occupational shortage ratings | CC BY 4.0 (recheck) | Role fundamentals, later; excluded initially | Annual updates |
| ABS | Labour statistics, ANZSCO classification | CC BY 4.0 (recheck) | Classification and macro context | |
| Public ATS job APIs: initially Greenhouse, Lever, Ashby only | Full active job ads published by employers | Public APIs without explicit licences; obtain written vendor responses before commercialisation | **Skill-level** counts and text-derived entry-level, work-rights, remote metrics | Bias toward medium/large ATS employers, fewer SMEs (disclose coverage); history accumulates from collection start |
| Launch university unit catalogue | Unit codes and descriptions | Check terms | Tier 1 onboarding and skill inference | |
| Platform-owned data | Debrief votes and matching outcomes | Owned | Sentiment and matching improvement | Requires sufficient samples |

**Key data risk**: public data is predominantly occupational. **Skill-level time series likely require building snapshots from launch onward**, such as daily ad counts by skill keywords. The architecture must:

- Collect and archive snapshots from day one, initially using occupational data and short skill histories.
- Disclose extraction methods and known errors for entry-level, no-PR, remote, and all other text-derived metrics.
- Provide replaceable source adapters rather than dependence on one source.
- Treat coverage as a first-class metric: compare occupation × state against IVI; disclose low coverage or suppress signals.

**Initial sources (user decision, 2026-10-23)**: Greenhouse, Lever, and Ashby public APIs for skills; JSA IVI for roles and calibration. Adzuna's free API prohibits commercial aggregate statistics and is excluded. Workday has no public API. Do not scrape LinkedIn, SEEK, or Indeed. Negotiate paid partnerships after acquiring customers.

**Cadence**: settle metrics daily; check active employers for new jobs hourly during the day to feed the ticker and "new today". Show update times on every data surface. Evidence: `docs/research/data-sources.md`.

## 12. Business and operations

### 12.1 Business model

- **Any party may pay**: students, practitioners, universities, employers, or other organisations.
- Potential revenue **[Pending]**: career-centre partnerships, practitioner upgrades, paid student content/services (courses, deeper coaching), institutional aggregate data/reports.
- **Neutrality firewall** (applies to all revenue):
  - Revenue cannot influence the board: no payer can buy or alter metrics, signals, sorting, or match reasons.
  - Disclose financial relationships with a skill, role, or course on relevant pages.
  - Never sell privacy: no payment relationship grants third-party access to student personal data; external data is aggregate and non-identifying only.
- No MVP charging or payment integration.

### 12.2 Launch strategy (cold start)

Learn from Lunchclub's value collapse in sparse networks:

- **One university, one faculty, one industry initially**: **[Assumption]** University of Sydney Engineering and IT × software/data.
- Limit the skill/role catalogue to that niche so every instrument has enough data.
- Recruit practitioners primarily from alumni within three years of graduation, via career centres and student societies.
- Open student bookings only when practitioner supply reaches §4.2's target; offer the board alone beforehand.

## 13. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| No practitioners at launch | Core loop cannot work | Narrow niche; build student interest through the board first; gate bookings on supply |
| Insufficient or commercially unusable skill data | Core differentiation fails | Day-one snapshots; occupation fallback; source adapters |
| Students think in roles rather than skills (U1) | Wrong instrument granularity | Offer both; adjust defaults using usage data |
| Misleading or harmful metaphors | Trust and emotional safety | §10 principles, comprehension tests, disable metaphors |
| Stranger-matching safety | Legal and reputational harm | Work-email verification, 18+, reporting/blocking, conduct rules, third-party meetings |
| No debrief usage | No sentiment data | One-click L0; treat as enrichment rather than a core dependency |
| Free-tier limits (commercial restrictions, idle pauses, email quotas) | Launch blocked | Portable architecture; assess upgrade points before launch |
| Small research sample (6 questionnaire, 4 interviews, 0 practitioners) | Biased requirements | Validate all assumptions after launch; analytics and usability tests |

## 14. Open questions

| # | Question | Impact | Suggested default |
|---|---|---|---|
| Q1 | Product name | Domain, branding | **Decided 2026-10-23**: Brewdex; `brewdex.app` purchased; use `APP_NAME` |
| Q2 | Practitioner-supplied Zoom/Meet/Teams link or system-generated link such as Jitsi? | FR-C9 | Practitioner supplies the link; no hosted video |
| Q3 | English only or bilingual Chinese/English? | FR-A8 | Launch in English; support i18n architecturally |
| Q4 | Launch university, faculty, industry | Data scope, unit catalogue | University of Sydney Engineering and IT × software/data |
| Q5 | Work-email verification only, or manual review with LinkedIn link? | FR-P1 | Work email, manual fallback |
| Q6 | Job-ad sources | §11 | **Decided 2026-10-23**: Greenhouse / Lever / Ashby public APIs + JSA IVI calibration; written responses before commercialisation |
| Q7 | Metaphor-free mode needed? | §10 | Add a setting first; observe usage |
| Q8 | Request timeout | FR-C7 | Configurable 72 hours |

## Appendix A: Requirements traceability

| Research requirement | Summary | Functional requirements |
|---|---|---|
| R1 / SR2 / SR3 | Transparent, interpretable metrics | FR-D2, FR-D3, FR-D5 |
| R2 | Filter by major/seniority/location/eligibility | FR-F1 – FR-F6 |
| R3 | Relevance, effort, comparison | FR-M5, FR-G2 |
| R4 | Opted-in practitioners, match reasons, topics, starters | FR-P1 – FR-P3, FR-C2 – FR-C4 |
| R5 / SR6 | Private timeout/decline handling with alternatives | FR-C6 – FR-C8 |
| R6 / SR5 | Signal-to-request with decision context | FR-C1, FR-C5, FR-W3 |
| R7 / SR4 | Progress framing, no rankings | FR-O5, FR-O6 |
| R8 / SR4 | Minimal fields, editable inferences, field visibility | FR-O3, FR-O4, FR-A3, FR-A4, FR-C11 |
| SR1 | Gap diagnosis and next steps | FR-G1 |

## Appendix B: Research index

Research was the basis for this PRD and remains a read-only snapshot. Update the PRD when conclusions change, not research files.

| File | Content |
|---|---|
| `docs/research/competitor-analysis.md` | Competitor comparison, gaps, reusable assets, research questions |
| `docs/research/interview-findings.md` | Interview coding, six key findings, design implications |
| `docs/research/cross-validation.md` | Questionnaire/interview triangulation |
| `docs/research/cross-validation-matrix.csv` | Construct-level cross-validation matrix |
| `docs/research/requirements-traceability.csv` | R1–R8 traceability and evaluation criteria |
| `docs/research/data-sources.md` | ATS public APIs, JSA IVI calibration, coverage bias, and reasons for excluding Adzuna / LinkedIn / SEEK |
