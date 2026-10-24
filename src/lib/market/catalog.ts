import type { ActiveInstrumentType, IndustryComponent, Instrument, LearningEffort, RoleComponent, SkillLayer, Transferability } from './types';
import { createSearch } from '@/lib/search/matcher';

// Illustrative catalogue for the launch vertical (software / data, PRD §12.2).
// Profile numbers are synthetic parameters for the fixture engine, not real data.

export interface SkillProfile {
  /** Share of all ads that mention the skill at the start of the 2-year window. */
  share: number;
  /** Trend over a year (0.2 = +20%/yr). */
  growth: number;
  /** Extra movement concentrated in the last 8 weeks (drives rise/fall signals). */
  kick: number;
  /** Graduate + other entry-level share of this instrument's ads. */
  entry: number;
  /** Change in entry share (percentage points) over the 2-year window. */
  entryDrift: number;
  /** Share of ads that do not state a PR/citizenship requirement. */
  openRights: number;
  /** Multiplier on remote / hybrid work. */
  remoteTilt: number;
  contract: number;
  /** Jump in entry-level share (percentage points) over the last 8 weeks. */
  entryKick?: number;
}

interface Seed {
  slug: string;
  name: string;
  symbol: string;
  category: string;
  aliases: string[];
  blurb: string;
  effort: LearningEffort;
  transfer: Transferability;
  anzsco?: string | null;
  anzsic?: string | null;
  p: SkillProfile;
  premium?: number;
  salary?: { median: number; spread: number; skillsPerAd: number };
}

const P = (share: number, growth: number, kick: number, entry: number, entryDrift = 0, openRights = 0.62, remoteTilt = 1, contract = 0.22): SkillProfile =>
  ({ share, growth, kick, entry, entryDrift, openRights, remoteTilt, contract });

const SKILLS: Seed[] = [
  { slug: 'python', name: 'Python', symbol: 'PY', category: 'Languages', aliases: ['py', 'python3'], blurb: 'General-purpose language used across data, automation and back-end services.', effort: 'months', transfer: 'broad', p: P(0.14, 0.12, 0.03, 0.19, 0.02), premium: 0.04 },
  { slug: 'sql', name: 'SQL', symbol: 'SQL', category: 'Data', aliases: ['structured query language', 't-sql', 'tsql'], blurb: 'Querying and shaping data in relational databases.', effort: 'weeks', transfer: 'broad', p: P(0.16, 0.06, 0.01, 0.23, 0.01), premium: 0.01 },
  { slug: 'javascript', name: 'JavaScript', symbol: 'JS', category: 'Web & product', aliases: ['js', 'ecmascript', 'es6'], blurb: 'The language of the browser; also common on servers through Node.js.', effort: 'months', transfer: 'broad', p: P(0.15, 0.02, -0.01, 0.2, -0.01) , premium: 0 },
  { slug: 'typescript', name: 'TypeScript', symbol: 'TS', category: 'Web & product', aliases: ['ts'], blurb: 'JavaScript with types; the default for many product teams.', effort: 'weeks', transfer: 'moderate', p: P(0.1, 0.24, 0.07, 0.17, 0.03), premium: 0.05 },
  { slug: 'react', name: 'React', symbol: 'RCT', category: 'Web & product', aliases: ['reactjs', 'react.js'], blurb: 'Component library for building web interfaces.', effort: 'weeks', transfer: 'moderate', p: P(0.1, 0.08, 0.02, 0.21, 0.01), premium: 0.02 },
  { slug: 'nodejs', name: 'Node.js', symbol: 'NODE', category: 'Web & product', aliases: ['node', 'nodejs', 'node js'], blurb: 'Runs JavaScript on servers for APIs and tooling.', effort: 'weeks', transfer: 'moderate', p: P(0.07, 0.05, 0, 0.16), premium: 0.02 },
  { slug: 'java', name: 'Java', symbol: 'JAVA', category: 'Languages', aliases: ['jvm', 'java se'], blurb: 'Long-standing enterprise language in banks, government and telcos.', effort: 'months', transfer: 'moderate', p: P(0.09, -0.04, -0.02, 0.15, -0.01, 0.52, 0.8), premium: 0.01 },
  { slug: 'csharp', name: 'C#', symbol: 'C#', category: 'Languages', aliases: ['c sharp', 'csharp', '.net', 'dotnet'], blurb: 'Microsoft-stack language for business systems and games.', effort: 'months', transfer: 'moderate', p: P(0.08, -0.02, -0.01, 0.16, 0, 0.55, 0.85), premium: 0 },
  { slug: 'go', name: 'Go', symbol: 'GO', category: 'Languages', aliases: ['golang'], blurb: 'Simple, fast language popular for cloud infrastructure services.', effort: 'weeks', transfer: 'narrow', p: P(0.025, 0.18, 0.04, 0.09, 0.01, 0.66, 1.4), premium: 0.09 },
  { slug: 'rust', name: 'Rust', symbol: 'RS', category: 'Languages', aliases: ['rustlang', 'rust-lang'], blurb: 'Memory-safe systems language used in infrastructure, fintech and tooling.', effort: 'year_plus', transfer: 'narrow', p: P(0.009, 0.3, 0.4, 0.16, 0.05, 0.7, 1.5), premium: 0.11 },
  { slug: 'cpp', name: 'C++', symbol: 'C++', category: 'Languages', aliases: ['cpp', 'c plus plus'], blurb: 'Performance-critical software: trading, games, embedded and defence.', effort: 'year_plus', transfer: 'narrow', p: P(0.03, -0.05, -0.02, 0.12, 0, 0.38, 0.7), premium: 0.06 },
  { slug: 'aws', name: 'AWS', symbol: 'AWS', category: 'Cloud & infrastructure', aliases: ['amazon web services', 'ec2', 's3'], blurb: 'Amazon’s cloud platform; the most-requested cloud in AU ads.', effort: 'months', transfer: 'moderate', p: P(0.13, 0.09, 0.02, 0.11, 0.01, 0.6, 1.2), premium: 0.06 },
  { slug: 'azure', name: 'Azure', symbol: 'AZ', category: 'Cloud & infrastructure', aliases: ['microsoft azure'], blurb: 'Microsoft’s cloud, common in government and large enterprises.', effort: 'months', transfer: 'moderate', p: P(0.11, 0.1, 0.01, 0.12, 0.01, 0.47, 1.0), premium: 0.05 },
  { slug: 'gcp', name: 'Google Cloud', symbol: 'GCP', category: 'Cloud & infrastructure', aliases: ['gcp', 'google cloud platform', 'bigquery'], blurb: 'Google’s cloud, strong in data and analytics teams.', effort: 'months', transfer: 'moderate', p: P(0.035, 0.06, 0, 0.1, 0, 0.64, 1.2), premium: 0.05 },
  { slug: 'docker', name: 'Docker', symbol: 'DKR', category: 'Cloud & infrastructure', aliases: ['containers', 'containerisation'], blurb: 'Packages software into portable containers.', effort: 'weeks', transfer: 'broad', p: P(0.07, 0.04, 0.01, 0.12), premium: 0.03 },
  { slug: 'kubernetes', name: 'Kubernetes', symbol: 'K8S', category: 'Cloud & infrastructure', aliases: ['k8s', 'kube'], blurb: 'Runs and scales containers across clusters.', effort: 'months', transfer: 'narrow', p: P(0.06, 0.1, 0.02, 0.07, 0, 0.6, 1.3), premium: 0.08 },
  { slug: 'terraform', name: 'Terraform', symbol: 'TF', category: 'Cloud & infrastructure', aliases: ['iac', 'infrastructure as code', 'hcl'], blurb: 'Describes cloud infrastructure as reviewable code.', effort: 'weeks', transfer: 'moderate', p: P(0.045, 0.22, 0.42, 0.08, 0.01, 0.6, 1.3), premium: 0.07 },
  { slug: 'linux', name: 'Linux', symbol: 'LNX', category: 'Cloud & infrastructure', aliases: ['unix', 'bash', 'shell scripting'], blurb: 'The operating system under most servers and cloud workloads.', effort: 'months', transfer: 'broad', p: P(0.07, -0.01, 0, 0.14, 0, 0.5), premium: 0.02 },
  { slug: 'git', name: 'Git', symbol: 'GIT', category: 'Ways of working', aliases: ['github', 'gitlab', 'version control'], blurb: 'Version control for code and collaboration.', effort: 'weeks', transfer: 'broad', p: P(0.08, 0.02, 0, 0.24), premium: 0 },
  { slug: 'cicd', name: 'CI/CD', symbol: 'CICD', category: 'Cloud & infrastructure', aliases: ['ci/cd', 'continuous integration', 'continuous delivery', 'github actions'], blurb: 'Automated testing and deployment pipelines.', effort: 'weeks', transfer: 'moderate', p: P(0.07, 0.07, 0.01, 0.11, 0, 0.6, 1.2), premium: 0.03 },
  { slug: 'postgresql', name: 'PostgreSQL', symbol: 'PG', category: 'Data', aliases: ['postgres', 'psql'], blurb: 'Open-source relational database used by start-ups and scale-ups.', effort: 'weeks', transfer: 'moderate', p: P(0.04, 0.11, 0.02, 0.15), premium: 0.03 },
  { slug: 'powerbi', name: 'Power BI', symbol: 'PBI', category: 'Data', aliases: ['powerbi', 'power bi', 'dax'], blurb: 'Microsoft dashboarding and reporting tool.', effort: 'weeks', transfer: 'moderate', p: P(0.06, 0.14, 0.03, 0.27, 0.02, 0.5, 0.8), premium: -0.02 },
  { slug: 'tableau', name: 'Tableau', symbol: 'TBL', category: 'Data', aliases: ['tableau desktop'], blurb: 'Visual analytics and dashboards.', effort: 'weeks', transfer: 'moderate', p: P(0.03, -0.08, -0.03, 0.22, 0, 0.55, 0.9), premium: -0.01 },
  { slug: 'excel', name: 'Excel', symbol: 'XLS', category: 'Data', aliases: ['microsoft excel', 'spreadsheets', 'vba'], blurb: 'Spreadsheets for analysis, modelling and reporting.', effort: 'weeks', transfer: 'broad', p: P(0.09, -0.06, -0.01, 0.34, 0, 0.48, 0.6), premium: -0.05 },
  { slug: 'data-analysis', name: 'Data analysis', symbol: 'DA', category: 'Data', aliases: ['data analytics', 'analytics', 'analysing data'], blurb: 'Turning raw data into answers a team can act on.', effort: 'months', transfer: 'broad', p: { ...P(0.08, 0.07, 0.02, 0.29, 0.02), entryKick: 0.14 }, premium: 0 },
  { slug: 'machine-learning', name: 'Machine learning', symbol: 'ML', category: 'Data', aliases: ['ml', 'predictive modelling', 'scikit-learn'], blurb: 'Building models that learn patterns from data.', effort: 'year_plus', transfer: 'moderate', p: P(0.045, 0.2, 0.05, 0.1, 0.01, 0.66, 1.2), premium: 0.08 },
  { slug: 'pytorch', name: 'PyTorch', symbol: 'PT', category: 'Data', aliases: ['torch'], blurb: 'Deep-learning framework used in research and production ML.', effort: 'months', transfer: 'narrow', p: P(0.012, 0.28, 0.06, 0.09, 0.01, 0.7, 1.3), premium: 0.1 },
  { slug: 'spark', name: 'Apache Spark', symbol: 'SPK', category: 'Data', aliases: ['spark', 'pyspark', 'databricks'], blurb: 'Distributed processing for large datasets.', effort: 'months', transfer: 'narrow', p: P(0.02, 0.03, 0, 0.07), premium: 0.07 },
  { slug: 'dbt', name: 'dbt', symbol: 'DBT', category: 'Data', aliases: ['data build tool', 'dbt core'], blurb: 'SQL-based transformations with tests and version control.', effort: 'weeks', transfer: 'narrow', p: P(0.008, 0.4, 0.55, 0.12, 0.04, 0.68, 1.4), premium: 0.06 },
  { slug: 'airflow', name: 'Airflow', symbol: 'AIR', category: 'Data', aliases: ['apache airflow', 'orchestration'], blurb: 'Schedules and monitors data pipelines.', effort: 'weeks', transfer: 'narrow', p: P(0.012, 0.12, 0.02, 0.07), premium: 0.05 },
  { slug: 'statistics', name: 'Statistics', symbol: 'STAT', category: 'Data', aliases: ['stats', 'statistical modelling', 'r'], blurb: 'Reasoning about uncertainty, experiments and inference.', effort: 'year_plus', transfer: 'broad', p: P(0.03, 0.01, 0, 0.21), premium: 0.03 },
  { slug: 'llm', name: 'LLM engineering', symbol: 'LLM', category: 'Data', aliases: ['large language models', 'genai', 'generative ai', 'llms', 'rag'], blurb: 'Building products on large language models: prompts, retrieval, evaluation.', effort: 'months', transfer: 'moderate', p: P(0.009, 0.55, 0.5, 0.08, 0.02, 0.7, 1.4), premium: 0.12 },
  { slug: 'cybersecurity', name: 'Cyber security', symbol: 'SEC', category: 'Security', aliases: ['cybersecurity', 'infosec', 'information security', 'soc'], blurb: 'Protecting systems and data from attack.', effort: 'year_plus', transfer: 'moderate', p: { ...P(0.06, 0.16, 0.03, 0.12, 0.02, 0.34, 0.8), entryKick: 0.15 }, premium: 0.06 },
  { slug: 'networking', name: 'Networking', symbol: 'NET', category: 'Security', aliases: ['tcp/ip', 'ccna', 'network engineering'], blurb: 'How machines connect: routing, switching, firewalls.', effort: 'months', transfer: 'moderate', p: P(0.04, -0.03, -0.01, 0.17, 0, 0.44, 0.6), premium: 0 },
  { slug: 'figma', name: 'Figma', symbol: 'FIG', category: 'Web & product', aliases: ['figma design'], blurb: 'Collaborative interface design and prototyping.', effort: 'weeks', transfer: 'moderate', p: P(0.02, 0.09, 0.01, 0.2), premium: 0 },
  { slug: 'ux-research', name: 'UX research', symbol: 'UXR', category: 'Web & product', aliases: ['user research', 'usability testing'], blurb: 'Learning what people need through interviews and testing.', effort: 'months', transfer: 'broad', p: P(0.012, -0.1, -0.52, 0.15, -0.02), premium: -0.02 },
  { slug: 'agile', name: 'Agile', symbol: 'AGL', category: 'Ways of working', aliases: ['scrum', 'kanban', 'agile methodology'], blurb: 'Iterative ways of planning and shipping work.', effort: 'weeks', transfer: 'broad', p: P(0.12, -0.05, -0.01, 0.16), premium: 0 },
  { slug: 'stakeholder-management', name: 'Stakeholder management', symbol: 'STK', category: 'Ways of working', aliases: ['stakeholder engagement', 'client management'], blurb: 'Working with the people who shape and depend on a project.', effort: 'year_plus', transfer: 'broad', p: P(0.14, 0.03, 0, 0.09), premium: 0.02 },
  { slug: 'project-management', name: 'Project management', symbol: 'PM', category: 'Ways of working', aliases: ['pmp', 'prince2', 'delivery management'], blurb: 'Planning scope, time and people to deliver outcomes.', effort: 'year_plus', transfer: 'broad', p: P(0.06, -0.02, 0, 0.08, 0, 0.5, 0.8), premium: 0.02 },
  { slug: 'testing', name: 'Software testing', symbol: 'QA', category: 'Web & product', aliases: ['qa', 'test automation', 'quality assurance', 'selenium'], blurb: 'Checking software works — by hand and through automation.', effort: 'weeks', transfer: 'moderate', p: P(0.05, -0.07, -0.03, 0.22, 0, 0.55, 0.9), premium: -0.03 },
  // Concrete tools and techniques outside software (fixture set for the industry view).
  { slug: 'xero', name: 'Xero', symbol: 'XRO', category: 'Accounting & finance', aliases: ['xero accounting'], blurb: 'Cloud accounting software used by many Australian small businesses and their accountants.', effort: 'weeks', transfer: 'moderate', p: P(0.022, 0.09, 0.02, 0.3, 0.01, 0.6, 0.9, 0.18), premium: 0.01 },
  { slug: 'myob', name: 'MYOB', symbol: 'MYOB', category: 'Accounting & finance', aliases: ['myob accountright'], blurb: 'Australian accounting and payroll software.', effort: 'weeks', transfer: 'narrow', p: P(0.012, -0.08, -0.02, 0.3, 0, 0.58, 0.8, 0.18), premium: -0.01 },
  { slug: 'financial-modelling', name: 'Financial modelling', symbol: 'FMOD', category: 'Accounting & finance', aliases: ['financial modeling', 'valuation modelling', 'dcf'], blurb: 'Building spreadsheet models of cash flows, forecasts and valuations.', effort: 'months', transfer: 'moderate', p: P(0.04, 0.05, 0.01, 0.16, 0, 0.55, 0.8, 0.2), premium: 0.05 },
  { slug: 'sap', name: 'SAP', symbol: 'SAP', category: 'Enterprise systems', aliases: ['sap erp', 's/4hana', 'sap s4'], blurb: 'Enterprise resource planning software for finance, supply chain and maintenance.', effort: 'months', transfer: 'moderate', p: P(0.04, 0.02, 0, 0.1, 0, 0.5, 0.8, 0.32), premium: 0.04 },
  { slug: 'autocad', name: 'AutoCAD', symbol: 'ACAD', category: 'Design & engineering', aliases: ['cad', 'autocad civil 3d', 'drafting'], blurb: 'Computer-aided drafting for plans, sections and engineering drawings.', effort: 'months', transfer: 'moderate', p: P(0.05, -0.02, -0.01, 0.2, 0, 0.5, 0.6, 0.2), premium: 0.01 },
  { slug: 'revit', name: 'Revit', symbol: 'RVT', category: 'Design & engineering', aliases: ['bim', 'building information modelling'], blurb: 'Building information modelling software for architecture and building services.', effort: 'months', transfer: 'narrow', p: P(0.024, 0.11, 0.03, 0.18, 0.01, 0.52, 0.7, 0.2), premium: 0.04 },
  { slug: 'gis', name: 'GIS', symbol: 'GIS', category: 'Design & engineering', aliases: ['arcgis', 'qgis', 'geographic information systems', 'spatial analysis'], blurb: 'Mapping and analysing spatial data with tools such as ArcGIS and QGIS.', effort: 'months', transfer: 'moderate', p: P(0.022, 0.06, 0.01, 0.2, 0, 0.45, 0.8, 0.22), premium: 0.02 },
  { slug: 'estimating', name: 'Construction estimating', symbol: 'EST', category: 'Design & engineering', aliases: ['cost estimating', 'quantity take-off', 'takeoffs'], blurb: 'Pricing construction work from drawings: quantities, rates and tenders.', effort: 'months', transfer: 'narrow', p: P(0.022, -0.05, -0.08, 0.1, 0, 0.55, 0.5, 0.22), premium: 0.02 },
  { slug: 'clinical-assessment', name: 'Clinical assessment', symbol: 'CLIN', category: 'Health & care', aliases: ['patient assessment', 'clinical observations', 'triage'], blurb: 'Assessing patients’ condition, observations and needs to plan care.', effort: 'year_plus', transfer: 'moderate', p: P(0.075, 0.07, 0.05, 0.22, 0.01, 0.45, 0.3, 0.25), premium: 0 },
  { slug: 'medication-administration', name: 'Medication administration', symbol: 'MEDS', category: 'Health & care', aliases: ['medication management', 'administering medication'], blurb: 'Safely giving, recording and reviewing medicines under clinical protocols.', effort: 'months', transfer: 'moderate', p: P(0.062, 0.08, 0.06, 0.26, 0.01, 0.48, 0.2, 0.26), premium: 0 },
  { slug: 'wound-care', name: 'Wound care', symbol: 'WND', category: 'Health & care', aliases: ['wound management', 'wound dressing'], blurb: 'Assessing and dressing wounds and preventing infection.', effort: 'months', transfer: 'narrow', p: P(0.04, 0.05, 0.02, 0.24, 0, 0.46, 0.2, 0.24), premium: 0.01 },
  { slug: 'lesson-planning', name: 'Lesson planning', symbol: 'LSN', category: 'Education', aliases: ['unit planning', 'lesson plans'], blurb: 'Designing lessons and assessment that follow the curriculum.', effort: 'months', transfer: 'moderate', p: P(0.04, 0.03, 0.12, 0.32, 0.01, 0.42, 0.3, 0.4), premium: 0 },
  { slug: 'curriculum-design', name: 'Curriculum design', symbol: 'CURR', category: 'Education', aliases: ['australian curriculum', 'acara', 'instructional design'], blurb: 'Structuring courses and learning outcomes, including against the Australian Curriculum.', effort: 'months', transfer: 'moderate', p: P(0.022, 0.05, 0.08, 0.2, 0, 0.5, 0.6, 0.35), premium: 0.01 },
  { slug: 'lms', name: 'Learning management systems', symbol: 'LMS', category: 'Education', aliases: ['canvas', 'moodle', 'lms'], blurb: 'Running courses in platforms such as Canvas and Moodle.', effort: 'weeks', transfer: 'moderate', p: P(0.018, 0.09, 0.08, 0.24, 0, 0.55, 0.9, 0.3), premium: 0 },
  { slug: 'pos-systems', name: 'Point-of-sale systems', symbol: 'POS', category: 'Retail & operations', aliases: ['pos', 'point of sale', 'eftpos'], blurb: 'Operating point-of-sale systems for sales, refunds and end-of-day reconciliation.', effort: 'weeks', transfer: 'narrow', p: P(0.034, 0.02, 0.1, 0.5, 0, 0.7, 0.1, 0.35), premium: -0.02 },
  { slug: 'inventory-management', name: 'Inventory management', symbol: 'INV', category: 'Retail & operations', aliases: ['stock control', 'stocktake', 'inventory control'], blurb: 'Tracking, ordering and counting stock so shelves and warehouses stay supplied.', effort: 'weeks', transfer: 'moderate', p: P(0.042, 0.01, 0.04, 0.3, 0, 0.62, 0.2, 0.3), premium: 0 },
  { slug: 'visual-merchandising', name: 'Visual merchandising', symbol: 'VM', category: 'Retail & operations', aliases: ['merchandising', 'planograms'], blurb: 'Laying out stores and displays to planograms.', effort: 'weeks', transfer: 'narrow', p: P(0.018, -0.04, 0.12, 0.4, 0, 0.66, 0.1, 0.3), premium: -0.02 },
  { slug: 'policy-analysis', name: 'Policy analysis', symbol: 'POL', category: 'Government', aliases: ['policy development', 'briefing writing', 'ministerial briefs'], blurb: 'Researching options and writing briefs that inform government decisions.', effort: 'months', transfer: 'moderate', p: P(0.02, 0.04, 0.03, 0.2, 0, 0.18, 0.9, 0.3), premium: 0.01 },
  { slug: 'records-management', name: 'Records management', symbol: 'REC', category: 'Government', aliases: ['trim', 'content manager', 'recordkeeping'], blurb: 'Capturing and keeping official records in systems such as Content Manager (TRIM).', effort: 'weeks', transfer: 'moderate', p: P(0.014, -0.03, -0.01, 0.26, 0, 0.3, 0.8, 0.3), premium: -0.01 },
  { slug: 'mine-planning', name: 'Mine planning software', symbol: 'MINE', category: 'Resources', aliases: ['deswik', 'vulcan', 'surpac', 'mine scheduling'], blurb: 'Designing and scheduling mines in tools such as Deswik, Vulcan and Surpac.', effort: 'months', transfer: 'narrow', p: P(0.008, -0.06, -0.16, 0.14, 0, 0.5, 0.3, 0.3), premium: 0.06 },
  { slug: 'lean-six-sigma', name: 'Lean Six Sigma', symbol: 'LSS', category: 'Retail & operations', aliases: ['lean', 'six sigma', 'continuous improvement'], blurb: 'Methods for measuring and reducing waste and variation in processes.', effort: 'months', transfer: 'broad', p: P(0.018, -0.02, -0.03, 0.12, 0, 0.55, 0.4, 0.28), premium: 0.02 },
  { slug: 'plc-programming', name: 'PLC programming', symbol: 'PLC', category: 'Design & engineering', aliases: ['plc', 'scada', 'allen-bradley', 'siemens s7'], blurb: 'Programming the controllers that run machines and production lines.', effort: 'months', transfer: 'narrow', p: P(0.014, 0.04, -0.05, 0.12, 0, 0.5, 0.2, 0.3), premium: 0.05 },
  { slug: 'adobe-creative-cloud', name: 'Adobe Creative Cloud', symbol: 'ADBE', category: 'Media & design', aliases: ['photoshop', 'illustrator', 'indesign', 'premiere pro'], blurb: 'Photoshop, Illustrator, InDesign and Premiere for design and media production.', effort: 'months', transfer: 'moderate', p: P(0.015, -0.06, -0.14, 0.3, 0, 0.65, 1.0, 0.35), premium: -0.02 },
];

const ROLES: Seed[] = [
  { slug: 'software-engineer', name: 'Software Engineer', symbol: 'SWE', category: 'Engineering', aliases: ['software developer', 'swe', 'backend engineer', 'full stack engineer'], anzsco: '261313', blurb: 'Designs, builds and maintains software systems.', effort: 'year_plus', transfer: 'broad', p: P(0.16, 0.03, 0.01, 0.17, 0.01, 0.6, 1.1), salary: { median: 128000, spread: 0.32, skillsPerAd: 9 } },
  { slug: 'developer-programmer', name: 'Developer Programmer', symbol: 'DEV', category: 'Engineering', aliases: ['programmer', 'application developer'], anzsco: '261312', blurb: 'Writes and tests application code to a specification.', effort: 'year_plus', transfer: 'broad', p: P(0.08, -0.02, -0.01, 0.19, 0, 0.56, 0.9), salary: { median: 112000, spread: 0.3, skillsPerAd: 8 } },
  { slug: 'analyst-programmer', name: 'Analyst Programmer', symbol: 'AP', category: 'Engineering', aliases: ['systems programmer'], anzsco: '261311', blurb: 'Analyses requirements and builds or changes the code to meet them.', effort: 'year_plus', transfer: 'moderate', p: P(0.03, -0.06, -0.02, 0.18, 0, 0.5, 0.8), salary: { median: 105000, spread: 0.28, skillsPerAd: 8 } },
  { slug: 'web-developer', name: 'Web Developer', symbol: 'WEB', category: 'Engineering', aliases: ['front end developer', 'frontend developer', 'web dev'], anzsco: '261212', blurb: 'Builds websites and web applications.', effort: 'months', transfer: 'moderate', p: P(0.04, -0.04, -0.01, 0.27, 0, 0.64, 1.2), salary: { median: 98000, spread: 0.3, skillsPerAd: 8 } },
  { slug: 'data-analyst', name: 'Data Analyst', symbol: 'DAN', category: 'Data', aliases: ['business intelligence analyst', 'bi analyst', 'reporting analyst'], anzsco: '224114', blurb: 'Answers business questions with data, dashboards and analysis.', effort: 'months', transfer: 'broad', p: P(0.06, 0.08, 0.03, 0.28, 0.02, 0.55, 0.9), salary: { median: 98000, spread: 0.28, skillsPerAd: 7 } },
  { slug: 'data-scientist', name: 'Data Scientist', symbol: 'DSC', category: 'Data', aliases: ['applied scientist'], anzsco: '224115', blurb: 'Uses statistics and machine learning to model and predict.', effort: 'year_plus', transfer: 'moderate', p: P(0.025, 0.1, 0.02, 0.14, 0.01, 0.64, 1.1), salary: { median: 130000, spread: 0.3, skillsPerAd: 8 } },
  { slug: 'data-engineer', name: 'Data Engineer', symbol: 'DEN', category: 'Data', aliases: ['analytics engineer', 'etl developer'], anzsco: null, blurb: 'Builds the pipelines and warehouses that analysts and models depend on.', effort: 'year_plus', transfer: 'moderate', p: { ...P(0.03, 0.18, 0.06, 0.11, 0.02, 0.62, 1.2), entryKick: 0.14 }, salary: { median: 135000, spread: 0.28, skillsPerAd: 10 } },
  { slug: 'ml-engineer', name: 'Machine Learning Engineer', symbol: 'MLE', category: 'Data', aliases: ['ml engineer', 'ai engineer'], anzsco: null, blurb: 'Takes models from notebooks into reliable production systems.', effort: 'year_plus', transfer: 'narrow', p: P(0.01, 0.32, 0.1, 0.07, 0.01, 0.7, 1.3), salary: { median: 150000, spread: 0.3, skillsPerAd: 10 } },
  { slug: 'devops-engineer', name: 'DevOps Engineer', symbol: 'OPS', category: 'Infrastructure', aliases: ['site reliability engineer', 'sre', 'platform engineer'], anzsco: null, blurb: 'Automates build, deploy and operations for software teams.', effort: 'year_plus', transfer: 'moderate', p: P(0.035, 0.09, 0.02, 0.06, 0, 0.6, 1.3), salary: { median: 145000, spread: 0.26, skillsPerAd: 11 } },
  { slug: 'cloud-engineer', name: 'Cloud Engineer', symbol: 'CLD', category: 'Infrastructure', aliases: ['cloud architect', 'cloud administrator'], anzsco: null, blurb: 'Designs and runs infrastructure on public cloud platforms.', effort: 'year_plus', transfer: 'moderate', p: P(0.03, 0.15, 0.04, 0.07, 0.01, 0.55, 1.2), salary: { median: 140000, spread: 0.26, skillsPerAd: 10 } },
  { slug: 'cyber-security-analyst', name: 'Cyber Security Analyst', symbol: 'CSA', category: 'Security', aliases: ['security analyst', 'soc analyst', 'information security analyst'], anzsco: null, blurb: 'Monitors, investigates and responds to security threats.', effort: 'year_plus', transfer: 'moderate', p: P(0.03, 0.17, 0.03, 0.14, 0.02, 0.3, 0.8), salary: { median: 120000, spread: 0.3, skillsPerAd: 8 } },
  { slug: 'business-analyst', name: 'ICT Business Analyst', symbol: 'BA', category: 'Product & delivery', aliases: ['business analyst', 'ba'], anzsco: '261111', blurb: 'Translates business needs into requirements teams can build.', effort: 'months', transfer: 'broad', p: P(0.05, -0.01, 0, 0.13, 0, 0.5, 0.9), salary: { median: 118000, spread: 0.26, skillsPerAd: 7 } },
  { slug: 'product-manager', name: 'Product Manager', symbol: 'PDM', category: 'Product & delivery', aliases: ['product owner', 'pm'], anzsco: null, blurb: 'Decides what to build and why, with design and engineering.', effort: 'year_plus', transfer: 'broad', p: P(0.03, 0.02, 0, 0.06, 0, 0.62, 1.1), salary: { median: 150000, spread: 0.3, skillsPerAd: 7 } },
  { slug: 'ux-designer', name: 'UX Designer', symbol: 'UXD', category: 'Product & delivery', aliases: ['product designer', 'ui designer', 'ux/ui designer'], anzsco: null, blurb: 'Designs how products look, feel and work for people.', effort: 'months', transfer: 'moderate', p: P(0.018, -0.08, -0.12, 0.16, -0.01, 0.62, 1.2), salary: { median: 115000, spread: 0.28, skillsPerAd: 6 } },
  { slug: 'software-tester', name: 'Software Tester', symbol: 'TST', category: 'Engineering', aliases: ['qa engineer', 'test analyst', 'automation tester'], anzsco: '261314', blurb: 'Plans and runs tests so releases ship with confidence.', effort: 'months', transfer: 'moderate', p: P(0.025, -0.09, -0.04, 0.22, 0, 0.56, 0.9), salary: { median: 100000, spread: 0.26, skillsPerAd: 7 } },
  { slug: 'database-administrator', name: 'Database Administrator', symbol: 'DBA', category: 'Infrastructure', aliases: ['dba', 'database engineer'], anzsco: '262111', blurb: 'Keeps databases fast, backed up and secure.', effort: 'year_plus', transfer: 'narrow', p: P(0.012, -0.05, -0.02, 0.08, 0, 0.5, 0.9), salary: { median: 125000, spread: 0.24, skillsPerAd: 7 } },
  { slug: 'network-engineer', name: 'Network Engineer', symbol: 'NWE', category: 'Infrastructure', aliases: ['network administrator', 'systems engineer'], anzsco: '263111', blurb: 'Designs and maintains the networks organisations run on.', effort: 'year_plus', transfer: 'moderate', p: P(0.02, -0.02, -0.01, 0.12, 0, 0.42, 0.6), salary: { median: 112000, spread: 0.26, skillsPerAd: 7 } },
  { slug: 'ict-project-manager', name: 'ICT Project Manager', symbol: 'IPM', category: 'Product & delivery', aliases: ['it project manager', 'delivery manager'], anzsco: '135112', blurb: 'Runs technology projects from scope to delivery.', effort: 'year_plus', transfer: 'broad', p: P(0.03, -0.03, 0, 0.03, 0, 0.5, 0.8), salary: { median: 150000, spread: 0.25, skillsPerAd: 7 } },
  // Non-tech roles for the industry view (ANZSCO 6-digit codes).
  { slug: 'registered-nurse', name: 'Registered Nurse', symbol: 'RN', category: 'Health', aliases: ['rn', 'nurse', 'clinical nurse'], anzsco: '254418', blurb: 'Plans and delivers nursing care in hospitals and the community.', effort: 'year_plus', transfer: 'moderate', p: P(0.05, 0.06, 0.05, 0.24, 0.01, 0.46, 0.2, 0.26), salary: { median: 92000, spread: 0.2, skillsPerAd: 6 } },
  { slug: 'aged-care-worker', name: 'Aged or Disabled Carer', symbol: 'CARE', category: 'Health', aliases: ['aged care worker', 'disability support worker', 'support worker'], anzsco: '423111', blurb: 'Supports older people and people with disability with daily living.', effort: 'months', transfer: 'moderate', p: P(0.04, 0.1, 0.06, 0.45, 0.01, 0.6, 0.1, 0.3), salary: { median: 62000, spread: 0.18, skillsPerAd: 4 } },
  { slug: 'accountant', name: 'Accountant (General)', symbol: 'ACCT', category: 'Finance', aliases: ['accountant', 'tax accountant', 'management accountant'], anzsco: '221111', blurb: 'Prepares accounts, tax returns and financial reports.', effort: 'year_plus', transfer: 'broad', p: P(0.035, 0.02, 0.01, 0.22, 0, 0.5, 0.8, 0.18), salary: { median: 90000, spread: 0.28, skillsPerAd: 6 } },
  { slug: 'civil-engineer', name: 'Civil Engineer', symbol: 'CIV', category: 'Engineering & built environment', aliases: ['civil engineering', 'structural engineer'], anzsco: '233211', blurb: 'Designs and oversees roads, water, structures and other infrastructure.', effort: 'year_plus', transfer: 'moderate', p: P(0.022, 0.03, -0.02, 0.18, 0, 0.44, 0.5, 0.22), salary: { median: 118000, spread: 0.26, skillsPerAd: 6 } },
  { slug: 'architectural-draftsperson', name: 'Architectural Draftsperson', symbol: 'DRFT', category: 'Engineering & built environment', aliases: ['draftsperson', 'drafter', 'bim modeller'], anzsco: '312111', blurb: 'Prepares architectural drawings and building models.', effort: 'months', transfer: 'narrow', p: P(0.01, 0.04, 0.02, 0.24, 0, 0.55, 0.6, 0.22), salary: { median: 85000, spread: 0.22, skillsPerAd: 5 } },
  { slug: 'secondary-teacher', name: 'Secondary School Teacher', symbol: 'TCHR', category: 'Education', aliases: ['high school teacher', 'teacher'], anzsco: '241411', blurb: 'Teaches one or more subjects to students in years 7–12.', effort: 'year_plus', transfer: 'moderate', p: P(0.025, 0.02, 0.14, 0.3, 0.01, 0.4, 0.1, 0.38), salary: { median: 98000, spread: 0.16, skillsPerAd: 5 } },
  { slug: 'policy-analyst', name: 'Policy Analyst', symbol: 'PLCY', category: 'Government', aliases: ['policy officer', 'policy adviser'], anzsco: '224412', blurb: 'Researches issues and advises on government policy options.', effort: 'year_plus', transfer: 'broad', p: P(0.012, 0.03, 0.02, 0.2, 0, 0.16, 0.9, 0.3), salary: { median: 108000, spread: 0.22, skillsPerAd: 5 } },
  { slug: 'retail-manager', name: 'Retail Manager (General)', symbol: 'RTLM', category: 'Retail', aliases: ['store manager', 'retail store manager', 'assistant store manager'], anzsco: '142111', blurb: 'Runs a store: staff, stock, sales and customer service.', effort: 'months', transfer: 'broad', p: P(0.02, -0.01, 0.08, 0.2, 0, 0.66, 0.1, 0.12), salary: { median: 72000, spread: 0.2, skillsPerAd: 5 } },
  { slug: 'mining-engineer', name: 'Mining Engineer', symbol: 'MNE', category: 'Mining & resources', aliases: ['mine planning engineer', 'drill and blast engineer'], anzsco: '233611', blurb: 'Plans and optimises how ore is extracted safely and economically.', effort: 'year_plus', transfer: 'narrow', p: P(0.006, -0.05, -0.14, 0.16, 0, 0.5, 0.2, 0.28), salary: { median: 150000, spread: 0.24, skillsPerAd: 6 } },
];

export const ROLE_COMPONENTS: Record<string, RoleComponent[]> = Object.fromEntries(Object.entries({
  'software-engineer': { javascript: 0.55, python: 0.5, typescript: 0.45, git: 0.45, aws: 0.4, sql: 0.4, java: 0.35, cicd: 0.35, agile: 0.35, docker: 0.3, rust: 0.04, go: 0.08 },
  'developer-programmer': { javascript: 0.5, csharp: 0.45, java: 0.45, sql: 0.45, git: 0.4, agile: 0.3 },
  'analyst-programmer': { sql: 0.6, csharp: 0.4, java: 0.4, python: 0.3 },
  'web-developer': { javascript: 0.85, react: 0.7, typescript: 0.5, nodejs: 0.5, git: 0.45, figma: 0.2 },
  'data-analyst': { 'data-analysis': 0.85, sql: 0.8, excel: 0.6, powerbi: 0.5, python: 0.45, 'stakeholder-management': 0.45, statistics: 0.4, tableau: 0.3 },
  'data-scientist': { python: 0.85, 'machine-learning': 0.75, statistics: 0.7, sql: 0.6, pytorch: 0.3, spark: 0.25, llm: 0.15 },
  'data-engineer': { sql: 0.85, python: 0.7, aws: 0.5, spark: 0.45, airflow: 0.4, dbt: 0.35, azure: 0.35, docker: 0.3, terraform: 0.2, rust: 0.05 },
  'ml-engineer': { python: 0.9, 'machine-learning': 0.85, pytorch: 0.6, llm: 0.45, docker: 0.4, aws: 0.4, kubernetes: 0.3, rust: 0.06 },
  'devops-engineer': { cicd: 0.75, docker: 0.65, aws: 0.6, kubernetes: 0.6, linux: 0.6, terraform: 0.55, git: 0.5, azure: 0.4, python: 0.35, go: 0.2, rust: 0.05 },
  'cloud-engineer': { aws: 0.7, azure: 0.6, terraform: 0.5, linux: 0.5, kubernetes: 0.4, networking: 0.4, gcp: 0.3, go: 0.1 },
  'cyber-security-analyst': { cybersecurity: 0.95, networking: 0.55, linux: 0.45, azure: 0.3, python: 0.3 },
  'business-analyst': { 'stakeholder-management': 0.8, agile: 0.55, excel: 0.45, 'data-analysis': 0.4, sql: 0.35, 'project-management': 0.3 },
  'product-manager': { 'stakeholder-management': 0.75, agile: 0.6, 'data-analysis': 0.35, 'ux-research': 0.3, figma: 0.2 },
  'ux-designer': { figma: 0.85, 'ux-research': 0.75, agile: 0.35, javascript: 0.15 },
  'software-tester': { testing: 0.9, agile: 0.5, cicd: 0.4, javascript: 0.3, python: 0.3, sql: 0.3 },
  'database-administrator': { sql: 0.9, postgresql: 0.55, linux: 0.4, azure: 0.3, aws: 0.3 },
  'network-engineer': { networking: 0.9, linux: 0.5, cybersecurity: 0.4, azure: 0.25 },
  'ict-project-manager': { 'project-management': 0.9, 'stakeholder-management': 0.8, agile: 0.6 },
  'registered-nurse': { 'clinical-assessment': 0.82, 'medication-administration': 0.74, 'wound-care': 0.46 },
  'aged-care-worker': { 'medication-administration': 0.52, 'wound-care': 0.22, 'clinical-assessment': 0.18 },
  accountant: { xero: 0.48, excel: 0.62, myob: 0.3, 'financial-modelling': 0.24, sap: 0.1 },
  'civil-engineer': { autocad: 0.58, gis: 0.26, 'project-management': 0.4, estimating: 0.22, revit: 0.12 },
  'architectural-draftsperson': { revit: 0.76, autocad: 0.72, estimating: 0.08 },
  'secondary-teacher': { 'lesson-planning': 0.78, 'curriculum-design': 0.42, lms: 0.36 },
  'policy-analyst': { 'policy-analysis': 0.86, 'records-management': 0.2, 'data-analysis': 0.26, excel: 0.22 },
  'retail-manager': { 'inventory-management': 0.62, 'pos-systems': 0.44, 'visual-merchandising': 0.38, excel: 0.2 },
  'mining-engineer': { 'mine-planning': 0.7, autocad: 0.34, gis: 0.24, sap: 0.18, excel: 0.3 },
}).map(([role, comps]) => [role, Object.entries(comps).map(([skill_slug, weight]) => ({ skill_slug, weight })).sort((a, b) => b.weight - a.weight)]));

// Industries = ANZSIC 2006 Divisions (top level). `share` is the division's share
// of all ads; the ten below are the fixture set, the remaining divisions are
// not yet tracked. Sub-industries (parent_id) are reserved, not modelled.
const INDUSTRIES: Seed[] = [
  { slug: 'health-care', name: 'Health Care and Social Assistance', symbol: 'HLTH', category: 'ANZSIC Division Q', anzsic: 'Q', aliases: ['health', 'healthcare', 'social assistance', 'aged care', 'disability services'], blurb: 'Hospitals, medical and allied health, aged care, childcare and social assistance.', effort: 'year_plus', transfer: 'moderate', p: P(0.15, 0.07, 0.1, 0.26, 0.01, 0.5, 0.25, 0.26) },
  { slug: 'professional-services', name: 'Professional, Scientific and Technical Services', symbol: 'PROF', category: 'ANZSIC Division M', anzsic: 'M', aliases: ['professional services', 'consulting', 'engineering services', 'computer system design', 'legal and accounting'], blurb: 'Consulting, engineering, legal, accounting, research and computer system design.', effort: 'year_plus', transfer: 'broad', p: P(0.13, 0.03, 0.02, 0.18, 0, 0.56, 1.1, 0.24) },
  { slug: 'construction', name: 'Construction', symbol: 'CONS', category: 'ANZSIC Division E', anzsic: 'E', aliases: ['building', 'civil construction', 'trades'], blurb: 'Building and civil construction, and construction trade services.', effort: 'year_plus', transfer: 'moderate', p: P(0.08, -0.03, -0.12, 0.16, 0, 0.58, 0.3, 0.26) },
  { slug: 'retail-trade', name: 'Retail Trade', symbol: 'RETL', category: 'ANZSIC Division G', anzsic: 'G', aliases: ['retail', 'shops', 'supermarkets'], blurb: 'Supermarkets, department stores, specialised and online retailing.', effort: 'months', transfer: 'broad', p: P(0.08, -0.01, 0.16, 0.42, 0, 0.68, 0.15, 0.3) },
  { slug: 'education-training', name: 'Education and Training', symbol: 'EDUC', category: 'ANZSIC Division P', anzsic: 'P', aliases: ['education', 'schools', 'universities', 'tafe', 'teaching'], blurb: 'Schools, universities, vocational training and other education.', effort: 'year_plus', transfer: 'moderate', p: P(0.07, 0.03, 0.22, 0.28, 0.01, 0.45, 0.4, 0.38) },
  { slug: 'financial-services', name: 'Financial and Insurance Services', symbol: 'FINS', category: 'ANZSIC Division K', anzsic: 'K', aliases: ['finance', 'banking', 'insurance', 'superannuation', 'financial services'], blurb: 'Banks, insurers, superannuation funds and other financial services.', effort: 'year_plus', transfer: 'broad', p: P(0.07, 0.02, 0.04, 0.16, 0, 0.5, 1.0, 0.24) },
  { slug: 'manufacturing', name: 'Manufacturing', symbol: 'MANU', category: 'ANZSIC Division C', anzsic: 'C', aliases: ['factories', 'production', 'food manufacturing'], blurb: 'Food, machinery, metal, chemical and other manufacturing.', effort: 'year_plus', transfer: 'moderate', p: P(0.06, -0.04, -0.12, 0.2, 0, 0.6, 0.3, 0.28) },
  { slug: 'public-administration', name: 'Public Administration and Safety', symbol: 'PUBA', category: 'ANZSIC Division O', anzsic: 'O', aliases: ['government', 'public service', 'public sector', 'aps', 'defence'], blurb: 'Federal, state and local government administration, defence and public order.', effort: 'year_plus', transfer: 'broad', p: P(0.06, 0.04, 0.06, 0.2, 0, 0.2, 0.8, 0.3) },
  { slug: 'information-media-telecommunications', name: 'Information Media and Telecommunications', symbol: 'IMT', category: 'ANZSIC Division J', anzsic: 'J', aliases: ['media', 'telecommunications', 'telco', 'publishing', 'broadcasting'], blurb: 'Publishing, broadcasting, telecommunications and internet services.', effort: 'year_plus', transfer: 'moderate', p: P(0.035, -0.06, -0.22, 0.18, 0, 0.58, 1.1, 0.28) },
  { slug: 'mining', name: 'Mining', symbol: 'MINI', category: 'ANZSIC Division B', anzsic: 'B', aliases: ['resources', 'mining and resources', 'oil and gas'], blurb: 'Coal, metal ore and other mining, oil and gas extraction, and support services.', effort: 'year_plus', transfer: 'narrow', p: P(0.03, -0.02, -0.34, 0.14, 0, 0.5, 0.2, 0.3) },
];

/**
 * Industry → skills. Weight = share of the industry's ads that mention the
 * skill (0–1), the same shape as RoleComponent. Illustrative fixture values.
 */
export const INDUSTRY_COMPONENTS: Record<string, IndustryComponent[]> = Object.fromEntries(Object.entries({
  'health-care': { 'clinical-assessment': 0.52, 'medication-administration': 0.44, 'wound-care': 0.28, excel: 0.07, 'data-analysis': 0.04 },
  'professional-services': { excel: 0.3, 'project-management': 0.2, 'data-analysis': 0.2, sql: 0.19, python: 0.18, javascript: 0.15, xero: 0.14, aws: 0.12, autocad: 0.12, 'financial-modelling': 0.12, revit: 0.08, myob: 0.08, gis: 0.06 },
  construction: { autocad: 0.36, estimating: 0.3, 'project-management': 0.28, revit: 0.2, excel: 0.18, gis: 0.05 },
  'retail-trade': { 'pos-systems': 0.46, 'inventory-management': 0.4, 'visual-merchandising': 0.24, excel: 0.14, sap: 0.05 },
  'education-training': { 'lesson-planning': 0.58, 'curriculum-design': 0.34, lms: 0.3, excel: 0.06 },
  'financial-services': { excel: 0.55, 'financial-modelling': 0.4, 'data-analysis': 0.3, sql: 0.3, python: 0.2, powerbi: 0.2, sap: 0.14, xero: 0.1, cybersecurity: 0.1 },
  manufacturing: { sap: 0.3, excel: 0.3, 'lean-six-sigma': 0.3, 'plc-programming': 0.25, autocad: 0.24, 'inventory-management': 0.16 },
  'public-administration': { 'policy-analysis': 0.34, excel: 0.3, 'records-management': 0.24, 'data-analysis': 0.15, powerbi: 0.1, gis: 0.08, cybersecurity: 0.06 },
  'information-media-telecommunications': { networking: 0.3, 'adobe-creative-cloud': 0.25, cybersecurity: 0.2, python: 0.15, sql: 0.15, aws: 0.15, linux: 0.15, javascript: 0.12 },
  mining: { excel: 0.3, 'mine-planning': 0.3, sap: 0.25, autocad: 0.2, gis: 0.2, 'lean-six-sigma': 0.05 },
}).map(([industry, comps]) => [industry, Object.entries(comps).map(([skill_slug, weight]) => ({ skill_slug, weight })).sort((a, b) => b.weight - a.weight)]));

export const TRACKING_SINCE = '2024-06-03';

/**
 * Australian Skills Classification layer per skill. Rule: a work activity or
 * method (what you do) is a `specialist_task`; a named software product,
 * platform, language or framework (what you use) is a `technology_tool`.
 * Anything not listed here is a technology tool.
 */
const SPECIALIST_TASKS: ReadonlySet<string> = new Set([
  'data-analysis', 'statistics', 'machine-learning', 'llm', 'agile', 'project-management', 'stakeholder-management',
  'testing', 'ux-research', 'cicd', 'financial-modelling', 'estimating', 'clinical-assessment', 'medication-administration',
  'wound-care', 'lesson-planning', 'curriculum-design', 'inventory-management', 'visual-merchandising', 'policy-analysis',
  'records-management', 'lean-six-sigma', 'cybersecurity', 'networking', 'plc-programming',
]);

export function skillLayerOf(slug: string): SkillLayer {
  return SPECIALIST_TASKS.has(slug) ? 'specialist_task' : 'technology_tool';
}

function toInstrument(seed: Seed, type: ActiveInstrumentType): Instrument {
  return {
    id: `${type}:${seed.slug}`,
    slug: seed.slug,
    type,
    name: seed.name,
    symbol: seed.symbol,
    category: seed.category,
    aliases: seed.aliases,
    anzsco: seed.anzsco ?? null,
    anzsic: seed.anzsic ?? null,
    parent_id: null,
    skill_layer: type === 'skill' ? skillLayerOf(seed.slug) : null,
    blurb: seed.blurb,
    learning_effort: seed.effort,
    transferability: seed.transfer,
    tracking_since: TRACKING_SINCE,
  };
}

export const INSTRUMENTS: readonly Instrument[] = [
  ...SKILLS.map(s => toInstrument(s, 'skill')),
  ...ROLES.map(r => toInstrument(r, 'role')),
  ...INDUSTRIES.map(r => toInstrument(r, 'industry')),
];

const PROFILES = new Map<string, Seed>([...SKILLS, ...ROLES, ...INDUSTRIES].map(s => [s.slug, s]));
const BY_SLUG = new Map(INSTRUMENTS.map(i => [i.slug, i]));

export function getInstrument(slug: string): Instrument | undefined {
  return BY_SLUG.get(slug);
}

export function instrumentsOfType(type: ActiveInstrumentType): Instrument[] {
  return INSTRUMENTS.filter(i => i.type === type);
}

export function profileOf(slug: string): SkillProfile {
  const seed = PROFILES.get(slug);
  if (!seed) throw new Error(`Unknown instrument ${slug}`);
  return seed.p;
}

export type SalarySeed = NonNullable<Seed['salary']>;

/** Fallback for a skill no seeded role lists (fixture; roughly the middle of the catalogue). */
export const DEFAULT_SKILL_SALARY: Readonly<SalarySeed> = Object.freeze({ median: 105000, spread: 0.28, skillsPerAd: 7 });

/**
 * A skill's fixture salary: the average of the salaries of the roles that list
 * it as a component, weighted by `RoleComponent.weight` (share of the role's
 * ads mentioning the skill), median rounded to $1,000. Falls back to
 * DEFAULT_SKILL_SALARY when no role with a salary lists it. Pure; exported for tests.
 */
export function deriveSkillSalary(roles: ReadonlyArray<{ salary: SalarySeed | undefined; weight: number }>): SalarySeed {
  const known = roles.filter((r): r is { salary: SalarySeed; weight: number } => Boolean(r.salary) && r.weight > 0);
  const total = known.reduce((a, r) => a + r.weight, 0);
  if (!(total > 0)) return { ...DEFAULT_SKILL_SALARY };
  const avg = (pick: (s: SalarySeed) => number) => known.reduce((a, r) => a + pick(r.salary) * r.weight, 0) / total;
  return {
    median: Math.round(avg(s => s.median) / 1000) * 1000,
    spread: Math.round(avg(s => s.spread) * 100) / 100,
    skillsPerAd: Math.round(avg(s => s.skillsPerAd)),
  };
}

const SKILL_SLUGS = new Set(SKILLS.map(s => s.slug));
const derivedSalaries = new Map<string, SalarySeed>();

/**
 * Advertised salary seed. Roles carry their own; skills derive one from the
 * roles that ask for them (GLOSSARY §3: skills show Median salary since
 * 2026-10-17); industries have none.
 */
export function salaryOf(slug: string): SalarySeed | undefined {
  const own = PROFILES.get(slug)?.salary;
  if (own || !SKILL_SLUGS.has(slug)) return own;
  let derived = derivedSalaries.get(slug);
  if (!derived) {
    const roles = Object.entries(ROLE_COMPONENTS).flatMap(([roleSlug, comps]) => {
      const c = comps.find(x => x.skill_slug === slug);
      return c ? [{ salary: PROFILES.get(roleSlug)?.salary, weight: c.weight }] : [];
    });
    derived = deriveSkillSalary(roles);
    derivedSalaries.set(slug, derived);
  }
  return derived;
}

export function premiumOf(slug: string): number | undefined {
  return PROFILES.get(slug)?.premium;
}

/** FR-D6 alias normalisation: "JS" → JavaScript, "k8s" → Kubernetes. */
export { normalizeSearch as normaliseQuery } from '@/lib/search/matcher';

export interface SearchHit {
  instrument: Instrument;
  matched: string;
  via: 'name' | 'alias' | 'symbol' | 'prefix' | 'fuzzy';
}

export interface SearchAlias { alias: string; instrument_slug: string }
export interface InstrumentSearchOptions {
  type?: Instrument['type'];
  layer?: Instrument['skill_layer'];
  exclude?: ReadonlySet<string>;
  aliases?: readonly SearchAlias[];
}

const catalogueSearch = buildCatalogueSearch([]);
const aliasSearches = new WeakMap<readonly SearchAlias[], ReturnType<typeof buildCatalogueSearch>>();
function buildCatalogueSearch(aliases: readonly SearchAlias[]) {
  return createSearch([...INSTRUMENTS].sort((a, b) => a.name.localeCompare(b.name)), i => [
    { text: i.name, kind: 'name' }, { text: i.symbol, kind: 'symbol', fuzzy: false },
    ...[...i.aliases, ...aliases.filter(a => a.instrument_slug === i.slug).map(a => a.alias)].map(text => ({ text, kind: 'alias' as const })),
  ]);
}

export function searchInstruments(q: string, limit = 12, options: InstrumentSearchOptions = {}): SearchHit[] {
  const aliases = options.aliases;
  let search = catalogueSearch;
  if (aliases?.length) {
    const cached = aliasSearches.get(aliases);
    search = cached ?? buildCatalogueSearch(aliases);
    if (!cached) aliasSearches.set(aliases, search);
  }
  return search(q, { limit, accept: i => (!options.type || i.type === options.type) && (!options.layer || i.skill_layer === options.layer) && !options.exclude?.has(i.slug) })
    .map(h => ({ instrument: h.item, matched: h.matched, via: h.kind === 'fuzzy' ? 'fuzzy' : h.field === 'alias' ? 'alias' : h.field === 'symbol' ? 'symbol' : h.kind === 'exact' ? 'name' : 'prefix' }));
}

/** Roles that ask for a skill, strongest first. */
export function rolesForSkill(skillSlug: string): Array<{ role: Instrument; weight: number }> {
  const out: Array<{ role: Instrument; weight: number }> = [];
  for (const [roleSlug, comps] of Object.entries(ROLE_COMPONENTS)) {
    const c = comps.find(x => x.skill_slug === skillSlug);
    const role = BY_SLUG.get(roleSlug);
    if (c && role) out.push({ role, weight: c.weight });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** Component skills of a role or an industry (weight = share of its ads mentioning the skill). */
export function componentsOf(slug: string): RoleComponent[] {
  return ROLE_COMPONENTS[slug] ?? INDUSTRY_COMPONENTS[slug] ?? [];
}

/** Industries whose ads mention a skill, strongest weight first. */
export function industriesForSkill(skillSlug: string): Array<{ industry: Instrument; weight: number }> {
  const out: Array<{ industry: Instrument; weight: number }> = [];
  for (const [slug, comps] of Object.entries(INDUSTRY_COMPONENTS)) {
    const c = comps.find(x => x.skill_slug === skillSlug);
    const industry = BY_SLUG.get(slug);
    if (c && industry) out.push({ industry, weight: c.weight });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/**
 * Co-occurrence between two skills, 0–1 (cosine over role demand): how often they
 * are asked for together. Symmetric; used for "often asked with" and the matching
 * fallback (`skill_adjacent`, threshold 0.3).
 */
export function cooccurrence(a: string, b: string): number {
  if (a === b) return 1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [roleSlug, comps] of Object.entries(ROLE_COMPONENTS)) {
    const vol = PROFILES.get(roleSlug)?.p.share ?? 0;
    const wa = comps.find(c => c.skill_slug === a)?.weight ?? 0;
    const wb = comps.find(c => c.skill_slug === b)?.weight ?? 0;
    dot += wa * wb * vol;
    na += wa * wa * vol;
    nb += wb * wb * vol;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function relatedSkills(skillSlug: string, limit = 8): Array<{ skill: Instrument; weight: number }> {
  return instrumentsOfType('skill')
    .filter(s => s.slug !== skillSlug)
    .map(skill => ({ skill, weight: cooccurrence(skillSlug, skill.slug) }))
    .filter(x => x.weight > 0.05)
    .sort((x, y) => y.weight - x.weight)
    .slice(0, limit);
}
