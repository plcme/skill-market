import type { Instrument, LearningEffort, RoleComponent, Transferability } from './types';

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
  { slug: 'communication', name: 'Communication', symbol: 'COM', category: 'Ways of working', aliases: ['written communication', 'verbal communication', 'presentation skills'], blurb: 'Explaining work clearly to different audiences.', effort: 'year_plus', transfer: 'broad', p: P(0.3, 0.01, 0, 0.2), premium: 0 },
  { slug: 'stakeholder-management', name: 'Stakeholder management', symbol: 'STK', category: 'Ways of working', aliases: ['stakeholder engagement', 'client management'], blurb: 'Working with the people who shape and depend on a project.', effort: 'year_plus', transfer: 'broad', p: P(0.14, 0.03, 0, 0.09), premium: 0.02 },
  { slug: 'project-management', name: 'Project management', symbol: 'PM', category: 'Ways of working', aliases: ['pmp', 'prince2', 'delivery management'], blurb: 'Planning scope, time and people to deliver outcomes.', effort: 'year_plus', transfer: 'broad', p: P(0.06, -0.02, 0, 0.08, 0, 0.5, 0.8), premium: 0.02 },
  { slug: 'testing', name: 'Software testing', symbol: 'QA', category: 'Web & product', aliases: ['qa', 'test automation', 'quality assurance', 'selenium'], blurb: 'Checking software works — by hand and through automation.', effort: 'weeks', transfer: 'moderate', p: P(0.05, -0.07, -0.03, 0.22, 0, 0.55, 0.9), premium: -0.03 },
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
];

export const ROLE_COMPONENTS: Record<string, RoleComponent[]> = Object.fromEntries(Object.entries({
  'software-engineer': { communication: 0.6, javascript: 0.55, python: 0.5, typescript: 0.45, git: 0.45, aws: 0.4, sql: 0.4, java: 0.35, cicd: 0.35, agile: 0.35, docker: 0.3, rust: 0.04, go: 0.08 },
  'developer-programmer': { javascript: 0.5, csharp: 0.45, java: 0.45, sql: 0.45, git: 0.4, agile: 0.3, communication: 0.45 },
  'analyst-programmer': { sql: 0.6, communication: 0.5, csharp: 0.4, java: 0.4, python: 0.3 },
  'web-developer': { javascript: 0.85, react: 0.7, typescript: 0.5, nodejs: 0.5, git: 0.45, figma: 0.2, communication: 0.4 },
  'data-analyst': { 'data-analysis': 0.85, sql: 0.8, communication: 0.7, excel: 0.6, powerbi: 0.5, python: 0.45, 'stakeholder-management': 0.45, statistics: 0.4, tableau: 0.3 },
  'data-scientist': { python: 0.85, 'machine-learning': 0.75, statistics: 0.7, sql: 0.6, communication: 0.55, pytorch: 0.3, spark: 0.25, llm: 0.15 },
  'data-engineer': { sql: 0.85, python: 0.7, aws: 0.5, spark: 0.45, airflow: 0.4, dbt: 0.35, azure: 0.35, docker: 0.3, terraform: 0.2, rust: 0.05 },
  'ml-engineer': { python: 0.9, 'machine-learning': 0.85, pytorch: 0.6, llm: 0.45, docker: 0.4, aws: 0.4, kubernetes: 0.3, rust: 0.06 },
  'devops-engineer': { cicd: 0.75, docker: 0.65, aws: 0.6, kubernetes: 0.6, linux: 0.6, terraform: 0.55, git: 0.5, azure: 0.4, python: 0.35, go: 0.2, rust: 0.05 },
  'cloud-engineer': { aws: 0.7, azure: 0.6, terraform: 0.5, linux: 0.5, kubernetes: 0.4, networking: 0.4, gcp: 0.3, go: 0.1 },
  'cyber-security-analyst': { cybersecurity: 0.95, networking: 0.55, communication: 0.5, linux: 0.45, azure: 0.3, python: 0.3 },
  'business-analyst': { 'stakeholder-management': 0.8, communication: 0.8, agile: 0.55, excel: 0.45, 'data-analysis': 0.4, sql: 0.35, 'project-management': 0.3 },
  'product-manager': { communication: 0.8, 'stakeholder-management': 0.75, agile: 0.6, 'data-analysis': 0.35, 'ux-research': 0.3, figma: 0.2 },
  'ux-designer': { figma: 0.85, 'ux-research': 0.75, communication: 0.6, agile: 0.35, javascript: 0.15 },
  'software-tester': { testing: 0.9, agile: 0.5, cicd: 0.4, javascript: 0.3, python: 0.3, sql: 0.3 },
  'database-administrator': { sql: 0.9, postgresql: 0.55, linux: 0.4, azure: 0.3, aws: 0.3 },
  'network-engineer': { networking: 0.9, linux: 0.5, cybersecurity: 0.4, azure: 0.25 },
  'ict-project-manager': { 'project-management': 0.9, communication: 0.8, 'stakeholder-management': 0.8, agile: 0.6 },
}).map(([role, comps]) => [role, Object.entries(comps).map(([skill_slug, weight]) => ({ skill_slug, weight })).sort((a, b) => b.weight - a.weight)]));

export const TRACKING_SINCE = '2024-06-03';

function toInstrument(seed: Seed, type: 'skill' | 'role'): Instrument {
  return {
    id: `${type}:${seed.slug}`,
    slug: seed.slug,
    type,
    name: seed.name,
    symbol: seed.symbol,
    category: seed.category,
    aliases: seed.aliases,
    anzsco: seed.anzsco ?? null,
    blurb: seed.blurb,
    learning_effort: seed.effort,
    transferability: seed.transfer,
    tracking_since: TRACKING_SINCE,
  };
}

export const INSTRUMENTS: readonly Instrument[] = [
  ...SKILLS.map(s => toInstrument(s, 'skill')),
  ...ROLES.map(r => toInstrument(r, 'role')),
];

const PROFILES = new Map<string, Seed>([...SKILLS, ...ROLES].map(s => [s.slug, s]));
const BY_SLUG = new Map(INSTRUMENTS.map(i => [i.slug, i]));

export function getInstrument(slug: string): Instrument | undefined {
  return BY_SLUG.get(slug);
}

export function instrumentsOfType(type: 'skill' | 'role'): Instrument[] {
  return INSTRUMENTS.filter(i => i.type === type);
}

export function profileOf(slug: string): SkillProfile {
  const seed = PROFILES.get(slug);
  if (!seed) throw new Error(`Unknown instrument ${slug}`);
  return seed.p;
}

export function salaryOf(slug: string): Seed['salary'] | undefined {
  return PROFILES.get(slug)?.salary;
}

export function premiumOf(slug: string): number | undefined {
  return PROFILES.get(slug)?.premium;
}

/** FR-D6 alias normalisation: "JS" → JavaScript, "k8s" → Kubernetes. */
export function normaliseQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface SearchHit {
  instrument: Instrument;
  matched: string;
  via: 'name' | 'alias' | 'symbol' | 'prefix';
}

export function searchInstruments(q: string, limit = 12): SearchHit[] {
  const needle = normaliseQuery(q);
  if (!needle) return [];
  const hits: Array<SearchHit & { score: number }> = [];
  for (const inst of INSTRUMENTS) {
    const name = inst.name.toLowerCase();
    const alias = inst.aliases.find(a => a === needle);
    let hit: (SearchHit & { score: number }) | null = null;
    if (name === needle) hit = { instrument: inst, matched: inst.name, via: 'name', score: 100 };
    else if (inst.symbol.toLowerCase() === needle) hit = { instrument: inst, matched: inst.symbol, via: 'symbol', score: 95 };
    else if (alias) hit = { instrument: inst, matched: alias, via: 'alias', score: 90 };
    else if (name.startsWith(needle)) hit = { instrument: inst, matched: inst.name, via: 'prefix', score: 70 };
    else {
      const prefixAlias = inst.aliases.find(a => a.startsWith(needle));
      if (prefixAlias) hit = { instrument: inst, matched: prefixAlias, via: 'alias', score: 60 };
      else if (name.includes(needle)) hit = { instrument: inst, matched: inst.name, via: 'prefix', score: 40 };
    }
    if (hit) hits.push(hit);
  }
  return hits.sort((a, b) => b.score - a.score || a.instrument.name.localeCompare(b.instrument.name)).slice(0, limit).map(({ score: _score, ...h }) => h);
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
