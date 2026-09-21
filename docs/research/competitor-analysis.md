# Task 1(c) — Competitor / Alternatives Mini-Analysis

**Project:** A student-facing tool that (1) renders job-market demand as a stock-market-style interface, and (2) matches students to industry professionals for coffee chats.
**SDG:** Goal 4 — Quality Education, specifically **Target 4.4** ("substantially increase the number of youth and adults who have relevant skills... for employment, decent jobs and entrepreneurship"). Secondary relevance to SDG 8.6.


---

## 1. Criteria for comparison, and why

Each criterion is derived directly from one of the two sub-problems in our problem statement.

| # | Criterion | Why it matters to our problem |
|---|---|---|
| C1 | **Skill-level signal** | Students act on skills ("should I learn Rust?"), not on occupation titles. A tool that only ranks job titles is not actionable at the level a student can control. |
| C2 | **Continuous / trackable over time** | Our core metaphor is a *position tracked over time*. A once-a-year ranked list cannot support watchlists, movement, or alerts. |
| C3 | **AU + entry-level specificity** | Global or senior-level data misleads a Sydney third-year. Graduate demand moves differently from overall demand. |
| C4 | **Personalised to the student's own skill position** | "AI Engineer is #1" is useless without "…and you already have 3 of the 5 listed skills". |
| C5 | **Path to entry (actionability)** | Knowing a skill is rising does not tell you how to acquire it or how people actually break in. |
| C6 | **Access to a real human** | Tacit, current, industry-specific knowledge is not published anywhere; it only transfers in conversation. |
| C7 | **Match driven by market signal** | Whether the *who you talk to* is determined by *what is moving in the market* — the link between our two features. |
| C8 | **Self-serve access** | Whether a student can use it alone, without an administrator launching a program, an employer paying, or an appointment being booked. |
| C9 | **Cost / gate to the student** | Free vs paid vs institution-gated determines who is excluded. |

---

## 2. The alternatives

Each is described using the same four-part template: **Form → What it does → Which of our functions it substitutes → Where it stops.**

### 2.1 LinkedIn "Jobs on the Rise" (and LinkedIn as a platform)

**Form.** Not a product surface — an **annual editorial listicle** published as a LinkedIn News article and a Talent Solutions report page. The AU 2026 edition ranks the 15 fastest-growing job titles in Australia. Derived from LinkedIn's Economic Graph (member-reported titles and profile transitions, plus job postings).

**What it does.** For each ranked role it publishes a compact fact card: top skills, top hiring locations, median years of experience, share of remote/hybrid postings, and top hiring industries.

**Substitutes.** The *directional* half of our trend feature — "what is growing". The broader LinkedIn platform also substitutes the job-search and outreach half of our coffee chat feature.

**Where it stops.**
- **Annual snapshot, single data point.** One growth rank per year. No time series, no watchlist, no alerts; content is up to 12 months stale.
- **Title-level, not skill-level** (fails C1). A student cannot act on "AI Engineer is #1".
- **Growth ≠ volume.** A fast-growing role with a tiny base looks identical to a large one. No absolute demand shown.
- **Coverage bias.** Built on self-reported LinkedIn profiles, which over-represent white-collar professionals who actively maintain profiles.
- **Read-only.** No drill-down, no comparison, no personalisation (fails C4).
- **Outreach on LinkedIn does not work for students** — cold messages to strangers are largely ignored. This is the exact failure that Aphinity's marketing positions against.

> **Hard constraint for our design:** LinkedIn's API does not expose this data, its Terms of Service prohibit automated collection regardless of whether the data is public, and enforcement is active (LinkedIn v. Proxycurl/Nubela, N.D. Cal. 2025, settled with a permanent injunction). **We cannot build on LinkedIn data.** This is a system requirement, not an implementation detail, and should be stated as such in the report.

### 2.2 Aphinity

**Form.** A matching *service* that lives inside **Slack, Discord, or email** rather than a destination app. Administrator-configured programs; claims setup in ~10 minutes with no IT involvement.

**What it does.** AI matching on major/minor, career goals, industry interest, location, shared interests, graduation cohort, and skill level. Introductions are delivered on a configured cadence (weekly / biweekly / monthly) with auto-generated conversation starters. Alumni explicitly set availability, so students only match with people who have opted in. Participation is tracked for the administrator. Claims 3× higher alumni engagement than traditional outreach.

**Substitutes.** Almost exactly our coffee-chat feature.

**Where it stops.**
- **Top-down, not self-serve** (fails C8). Requires an institution to buy it and an admin to run a program. A student cannot start a chat on their own initiative.
- **Matches on static profile attributes** (major, industry, interests) — never on what is currently moving in the labour market (fails C7). There is no market signal anywhere in the loop.
- **Cadence-driven, not need-driven.** "Here is your monthly introduction" does not serve "I am choosing between two electives this week".
- **No artefact.** The conversation happens in a DM or email thread and the insight dies there. Nothing is captured, nothing aggregates, nothing benefits the next student.
- **Generic conversation starters** — derived from shared interests, not from a concrete decision the student is facing.

### 2.3 University Careers Centre / Sydney CareerHub

**Form.** An institutional service plus a job board. CareerHub is the sector-standard platform used across Australian universities; Sydney's instance lists casual, part-time, internship and graduate roles. Wrapped around it: 1:1 consults (resume, cover letter, selection criteria, LinkedIn profile), workshops, employer events, and structured programs (Univative, Graduate Edge).

**Substitutes.** The "how do I get in" half — advice, a curated jobs pool, employer events; and via mentoring programs and careers fairs, a partial substitute for coffee chats.

**Where it stops.**
- **Chronically under-used.** US benchmarks: ~84% of students know career services exist but only ~39% have ever used them; ~31% have never interacted with the centre at all; Gallup finds only about **1 in 6** graduates rate career services as "very helpful". *(These are US figures — verifying the equivalent locally is itself a research question, see §6.)*
- **Appointment-based and capacity-bound.** Booking friction and business hours do not match the moment of need (week 8, 11pm, before an elective deadline).
- **Advice is generic and lagging.** Advisors are careers professionals, not practitioners; they cannot describe what a Sydney data-platform team is actually screening for in 2026.
- **A job board is not market intelligence** (fails C1, C2). CareerHub lists openings; it does not aggregate, trend, or compare them.
- **Bounded population** — enrolled students plus a short post-graduation window.

### 2.4 Employment intermediaries: graduate job boards and recruitment agencies

**Form.** Two related but distinct things.
- *Graduate-specialist boards*: **SEEK Grad** (formerly GradConnection) and **Prosple**. Free to students, employer-paid; industry-filtered email alerts, company profiles, employer Q&A sessions, and searchable student profiles so employers can invite applications.
- *Recruitment agencies* (Hays, Robert Half, Randstad): employer-paid, commission on placement.

**Substitutes.** The *transaction* — finding and applying to real openings — plus a thin layer of insider information (employer Q&A, agency consultant advice).

**Where it stops.**
- **Structural incentive misalignment.** The employer is the customer; the student is the inventory. Agencies are paid on placement, so they optimise for placeable candidates — i.e. people who already have experience. Employers consistently prefer graduates with prior work experience, and graduate hiring appetite has been contracting. **Agencies therefore under-serve exactly our user by design.**
- **International students are further disadvantaged**, as employers are often unfamiliar with visa conditions and decline to engage.
- **Openings, not direction.** A listing tells you what exists today; it never tells you that a skill has been climbing steadily for eighteen months.
- **The application black hole.** No feedback on rejection means no learning loop — the student cannot tell whether the problem was the skill, the resume, or the market.
- **Advice arrives too late** — only once you are already a candidate for a specific role.

### 2.5 Labour-market intelligence tools (the real competitor for Feature 1)

**Form.** Government and commercial dashboards and reports.
- **Jobs and Skills Australia** — NERO (nowcast of employment, 355 occupations × 88 regions, updated monthly, downloadable, **CC BY 4.0**), the annual Skills Priority List, the Jobs and Skills Atlas, and Occupation & Industry Profiles.
- **SEEK Employment Report / Dashboard** and **Indeed Hiring Lab AU** — monthly job-ad volume indices for Australia.
- **ITJobsWatch (UK)** — the closest existing analogue to our concept: per-skill pages showing % of all job ads, median salary with 10th–90th percentiles, national rank and year-on-year rank change, three-year trend charts, regional breakdown, and a **co-occurring skills** panel. Effectively "skill as ticker".
- **Eurostat Top & Trending Skills**; **US Job Market Visualizer** (BLS treemap, 342 occupations).

**Substitutes.** The data layer of our trend feature — and in ITJobsWatch's case, a substantial part of the interaction model.

**Where it stops.**
- **Built for the wrong user.** The audience is policy makers, economists and recruiters. The vocabulary is ANZSCO codes, participation rates and shortage ratings. A third-year student cannot translate *"Software and Applications Programmers — shortage: Yes"* into *"learn React or learn Rust"* (fails C4, C5).
- **Exploration tools with no memory of you.** No watchlist, no alerts, no personal skill gap.
- **ITJobsWatch is UK-only** and stops at the data — it never tells you how to acquire a skill or who to talk to.
- **Lag.** The Skills Priority List is annual; NERO is monthly but occupation-level, not skill-level.
- **None of them connect a signal to a person.** This is our entire thesis.

### 2.6 Coffee-chat and mentoring platforms

**Form.** Self-serve marketplaces and workspace bots.
- **ADPList** — free 1:1 mentoring marketplace; mentors publish calendars, mentees book slots directly.
- **Lunchclub** — AI "superconnector" making weekly 1:1 professional introductions; invite-only.
- **Donut / RandomCoffee / Alfy** — random pairing bots inside an existing Slack or Discord workspace.
- **MentorCruise / Chronus / Together** — paid or enterprise mentoring programs.

**Substitutes.** Our coffee-chat feature, more directly than Aphinity in the self-serve case.

**Where it stops.**
- **Reliability is a known, unsolved problem.** Last-minute cancellations and no-shows are frequent enough on ADPList that the platform enforces an explicit policy: two no-shows within 30 days suspends a member; four triggers a break for a mentor.
- **Free supply is scarce and uneven** in popular domains; mentor quality varies.
- **Random pairing decays.** Reported pattern across Slack coffee tools: participants begin skipping pairings and chats become "pleasant but forgettable" — novelty wears off without structure.
- **Requires a pre-existing closed community** (Donut/RandomCoffee) or dense local network (Lunchclub); value collapses in thin markets.
- **No market signal.** Matching is on mentor topic tags, never on what is moving in the labour market.

### 2.7 Informal substitutes

**Form.** Reddit (r/cscareerquestionsOCE, r/AusFinance), Discord servers, WeChat groups, university societies, careers fairs, and — most commonly — friends and senior students.

**Substitutes.** The insider-information function *entirely*, and frequently more honestly than any official channel.

**Where it stops.** Unverifiable, anecdotal, survivorship-biased, hostile to newcomers, and impossible to aggregate. But this is where students *actually go*, which makes "what do you currently do instead?" a mandatory question in our user investigation.

---

## 3. Comparison table

**Legend:** ● full · ◐ partial · ○ none

| Criterion | **Ours** | LinkedIn JotR | Aphinity | CareerHub / Careers Centre | Grad boards & agencies | LMI tools (JSA, ITJobsWatch) | ADPList / Donut | Informal (Reddit, seniors) |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| C1 Skill-level demand signal | ● | ○ | ○ | ○ | ○ | ◐ | ○ | ◐ |
| C2 Continuous / trackable over time | ● | ○ | ○ | ○ | ○ | ◐ | ○ | ○ |
| C3 AU + entry-level specific | ● | ◐ | ○ | ● | ● | ◐ | ○ | ◐ |
| C4 Personalised to student's skill position | ● | ○ | ◐ | ◐ | ○ | ○ | ○ | ◐ |
| C5 Path to entry (actionability) | ◐ | ○ | ◐ | ● | ◐ | ○ | ● | ● |
| C6 Access to a real human | ● | ◐ | ● | ● | ◐ | ○ | ● | ● |
| C7 Match driven by market signal | ● | — | ○ | ○ | ○ | — | ○ | ○ |
| C8 Self-serve (no admin / employer / appointment) | ● | ● | ○ | ○ | ● | ● | ● | ● |
| C9 Free to the student | ● | ● | ● | ● | ● | ● | ◐ | ● |

The table makes the structural pattern visible: **every alternative solves one half of the problem well and the other half not at all.** The data tools (C1–C2) have no humans (C6); the people tools (C6) have no market signal (C1–C2, C7). No cell in row C7 is filled by anyone but us.

---

## 4. Gap analysis

### 4.1 What we have that they don't

1. **A personal position in the market, tracked over time.** ITJobsWatch has the underlying metrics; nobody attaches them to *you*. The watchlist/portfolio framing — skills you hold vs skills you are watching, and how each has moved since you started tracking it — does not exist anywhere we found.
2. **A closed loop between signal and people (C7).** Aphinity matches on static profile attributes; ADPList matches on mentor topic tags; the LMI tools match on nothing. **Nobody matches a student to a professional on the basis of what is currently moving in the market and what the student is exposed to.** This is the load-bearing novelty of the project and the reason the two features are one product rather than two.
3. **A familiar mental model applied to an unfamiliar domain.** Volatility, concentration risk, diversification, and entry timing are concepts most students already hold. No existing tool has attempted to make labour-market data legible through them.
4. **Student-first, entry-level framing.** Every data tool reviewed is built for policy makers or recruiters; every people tool is built for institutions or working professionals. The undergraduate is nobody's primary user.
5. **Genuinely self-serve.** No administrator launching a program (unlike Aphinity), no employer paying (unlike agencies), no appointment to book (unlike the Careers Centre).

### 4.2 What they have that we don't

1. **Data at scale.** LinkedIn has the Economic Graph; SEEK and Indeed have national ad volumes. We have none, and must build on lagging open data.
2. **A supply of actual humans.** Aphinity and CareerHub inherit institutional alumni pipelines; ADPList has a global mentor base. We start at zero — the classic two-sided cold-start problem, and our single largest feasibility risk.
3. **Real vacancies and a path to apply.** LinkedIn, SEEK and CareerHub close the loop into an actual job. We stop at insight and conversation.
4. **Institutional trust, duty of care, and safeguarding.** The university has consent processes, privacy governance and a complaints pathway for student–alumni contact. A student project has none, and unverified stranger matching carries real safety risk.
5. **Human expertise.** Advisors who read your resume; agency consultants who advocate for you to a hiring manager.
6. **Distribution.** They are already in students' inboxes, Slack workspaces and university communications. We would have to earn attention from scratch.
7. **Verified identity.** LinkedIn and CareerHub know who is real.

---

## 5. Lessons from their mistakes, and what we can reuse

### 5.1 Mistakes to design around

| Alternative | The trap they fell into | What it implies for us |
|---|---|---|
| LinkedIn Jobs on the Rise | Annual, title-level, read-only editorial content — impressive but unactionable | Ship *continuous* skill-level data, or the stock metaphor is decoration |
| LinkedIn (data access) | Locked the data down and litigates against scrapers | Design the data layer on open, licensed sources from day one — not as a fallback |
| Aphinity | Admin-gated and cadence-driven; conversation insight dies in a DM | Let students initiate on need; capture the outcome of a chat as a first-class object |
| Careers Centre | High awareness, low usage (~39% ever use it), low perceived helpfulness | Being official does not solve distribution. Investigate *when* students seek help, not just *what* they need |
| Recruitment agencies | Paid by employers, so they optimise away from inexperienced candidates | Never take money from the employer side, or we inherit the same misalignment |
| Job boards | Application black hole, no feedback | Build the feedback loop in — it is the thing everyone else has left out |
| ADPList | No-shows frequent enough to require a punitive policy | Adopt explicit reliability rules and availability-gating *from launch*, not after failure |
| Donut / RandomCoffee | Random + unstructured → participation decays, chats "pleasant but forgettable" | Structure is the differentiator. Our market signal *is* the structure |
| Lunchclub | Value collapses in thin networks | Launch in a deliberately narrow segment (one faculty, one industry) rather than broadly |

### 5.2 Assets we can adopt directly (rather than invent)

| Source | Asset | How we use it |
|---|---|---|
| **Jobs and Skills Australia** | NERO (monthly, 355 occupations × 88 regions) + Skills Priority List, **CC BY 4.0** | The prototype's demand backbone — free, Australian, legally clean |
| SEEK Employment Report / Indeed Hiring Lab | New job-ad volume as the accepted proxy for labour demand | Methodological precedent that justifies our core metric — we do not have to defend it from scratch |
| ANZSCO / SEEK classification | Standard AU occupation and industry taxonomy | Our "ticker" vocabulary, and joinable across every data source above |
| **ITJobsWatch** | Metric schema: % of ads, salary percentiles, rank + YoY rank change, co-occurring skills | Adopt wholesale as our ticker card. Its co-occurring-skills panel is effectively "related tickers" — and the mechanism that turns a trend into a learning path |
| LinkedIn Jobs on the Rise | Its published field set (top skills, median years experience, remote share, top industries) | The content schema for our "fundamentals" panel — the fields, not the data |
| **Aphinity** | Availability-gating; configurable cadence; conversation starters; delivery via email/Slack rather than a new app | Core coffee-chat mechanics, but with starters generated from the market signal rather than shared interests |
| **ADPList** | Explicit no-show policy; mentor-published calendars instead of open DMs | Reliability design, adopted before we have the problem |
| Donut (negative lesson) | Structure beats serendipity | Justifies anchoring every chat to a specific tracked skill |
| USYD Careers Centre | Existing alumni and employer relationships; consent and duty-of-care framework | Our most plausible distribution channel and mentor supply — position as a layer on top, not a rival |
| Published usage statistics | Careers-service awareness/usage gap | Evidence base for the problem statement, and a hypothesis to test locally |

---

## 6. From gaps to research questions

Each question below is generated by a specific gap identified above; the mapping is what makes this analysis load-bearing rather than decorative.

| # | Research question | Generated by |
|---|---|---|
| RQ1 | What do students actually do today to decide which skills are worth investing in, and what makes a source feel trustworthy or useless to them? | §2.5, §2.7 — official data is unreadable, so students default to unverifiable informal sources |
| RQ2 | Can students correctly interpret labour-market signals presented through a financial metaphor, and where does the metaphor mislead them? | §4.1(3) — nobody has attempted this, so the comprehension risk is unmeasured |
| RQ3 | What would make a student *act* on a signal — change an elective, start a project — rather than merely read it? | §2.1, §2.5 — every existing signal is read-only and stops short of action |
| RQ4 | Under what conditions will alumni and industry professionals accept a 20-minute request from a student they do not know? | §4.2(2) — the cold-start problem; informed by Aphinity's availability-gating and ADPList's no-show rates |
| RQ5 | What makes a coffee chat feel valuable rather than "pleasant but forgettable", and how much structure do students want imposed? | §2.6 — the documented decay of unstructured random matching |
| RQ6 | Do students perceive the trend view and the coffee chat as one workflow, or as two unrelated tools? | §4.1(2) — directly tests whether our central integration claim holds |
| RQ7 | Does the local (USYD) careers-service usage pattern match the published overseas figures? | §2.3 — our problem statement currently rests on US data |

---

## 7. Notes for the team

- **Word budget.** This section is worth 10/100 and the whole report is capped at 4,000 words. The report body should carry roughly **600–900 words plus the §3 table**; move the per-alternative detail into an appendix and reference it explicitly (examiners will not read an unreferenced appendix — the brief says so directly).
- **Framing risk.** The brief states that no extra marks are awarded for combining features. §4.1(2) is the argument that we have one product, not two — make it prominent in the Introduction.
- **Honest limitation to state.** The stock metaphor can mislead: jobs are not fungible, there is no liquidity, and a market frame may encourage short-termism over deep skill-building. Naming this ourselves is stronger than having an examiner name it, and it feeds RQ2.
- **Verify before final submission.** (a) The careers-service usage figures are US-sourced — either flag them as such or replace with AU data; (b) confirm the current NERO and Skills Priority List release dates and licence terms; (c) re-check the specific graduate-hiring-appetite figures against the primary Indeed Hiring Lab / SEEK release rather than secondary reporting.

---

## References

- LinkedIn News Australia. *LinkedIn Jobs on the Rise 2026: The 15 fastest-growing jobs in Australia.* https://www.linkedin.com/pulse/linkedin-jobs-rise-2026-15-fastest-growing-australia-w5xee/
- LinkedIn Talent Solutions. *Jobs on the Rise Reports.* https://business.linkedin.com/talent-solutions/emerging-jobs-report
- Aphinity. *Student-Alumni Networking & Mentoring Software for Universities.* https://www.aphinity.ai/use-cases/universities
- University of Sydney. *Careers Centre.* https://www.sydney.edu.au/careers/ ; *Career advice and events for students.* https://www.sydney.edu.au/careers/students.html
- CareerHub. *University of Sydney.* https://careerhub.com.au/institutions/sydney/
- SEEK Grad (formerly GradConnection). *About us.* https://au.gradconnection.com/about-us/
- Prosple Australia. https://au.prosple.com/
- SEEK Employer. *SEEK Employment Dashboard.* https://au.employer.seek.com/market-insights/article/seek-employment-dashboard-february-2026
- Indeed Hiring Lab Australia. *Australian Graduate Recruitment: Understanding a Shifting Recruitment Landscape.* https://www.hiringlab.org/au/blog/2024/04/23/australian-graduate-recruitment/
- Jobs and Skills Australia. *Data.* https://www.jobsandskills.gov.au/data ; *NERO.* https://www.jobsandskills.gov.au/data/nero ; *NERO Dashboard.* https://www.jobsandskills.gov.au/data/nero/nero-dashboard
- IT Jobs Watch. *Python — UK job market trends.* https://www.itjobswatch.co.uk/jobs/uk/python.do
- Eurostat. *Top & trending skills: your new go-to visualisation tool.* https://ec.europa.eu/eurostat/web/products-eurostat-news/w/wdn-20231214-1
- Karpathy, A. *US Job Market Visualizer.* https://karpathy.ai/jobs/
- ADPList Help Centre. *My mentor didn't show up! What should I do?* https://intercom.help/adplist-community/en/articles/8484122
- Donut. *Virtual Coffee Program.* https://www.donut.com/templates/virtual-coffee-program/
- National Society of Leadership and Success. *Students Know Career Services Exist. Few Use Them. Here's Why.* https://www.nsls.org/blog/students-know-career-services-exist.-few-use-them.-heres-why
- Gallup. *One in Six U.S. Grads Say Career Services Was Very Helpful.* https://news.gallup.com/poll/199307/one-six-grads-say-career-services-helpful.aspx
- Inside Higher Ed. *Survey: What college students want from career services.* https://www.insidehighered.com/news/student-success/life-after-college/2023/11/30/survey-what-college-students-want-career
- Metaverse Law. *hiQ v. LinkedIn: User Agreements in the Age of Data Scraping.* https://www.metaverselaw.com/hiq-v-linkedin-user-agreements-in-the-age-of-data-scraping/
