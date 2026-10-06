import type { PipelineRun, Practitioner } from '@/lib/api/types';

// Fictional people and employers for the preview. Every employer uses a
// reserved `.example` domain so nothing here impersonates a real organisation.

type SeedPractitioner = Omit<Practitioner, 'user_id' | 'initials' | 'timezone' | 'joined_at' | 'suspended_until' | 'meeting_link'> & { tz?: string };

const PEOPLE: SeedPractitioner[] = [
  {
    id: 'p-arjun', display_name: 'Arjun Mehta', current_title: 'Software Engineer, Platform', current_role_slug: 'software-engineer',
    employer: 'Kestrel Logistics', work_email_domain: 'kestrel-logistics.example', verification: 'verified', entry_year: 2024,
    location_id: 'au-nsw-sydney-cbd', skills: ['rust', 'go', 'kubernetes', 'aws', 'linux', 'git'],
    topics: ['choosing_electives', 'side_projects', 'first_90_days', 'day_to_day'],
    path: 'Graduate program after a Bachelor of Advanced Computing; picked up Rust in a final-year capstone.',
    bio: 'I work on the routing service that plans deliveries. Happy to talk about getting into systems work without a PhD.',
    monthly_cap: 3, paused: false, availability: [{ weekday: 2, start: '18:00', end: '19:30' }, { weekday: 4, start: '12:30', end: '13:30' }],
  },
  {
    id: 'p-daniel', display_name: 'Daniel Kim', current_title: 'Backend Engineer, Payments', current_role_slug: 'software-engineer',
    employer: 'Harbourline Bank', work_email_domain: 'harbourline.example', verification: 'verified', entry_year: 2023,
    location_id: 'au-nsw-sydney-north', skills: ['rust', 'java', 'sql', 'postgresql', 'docker', 'cicd'],
    topics: ['grad_programs', 'interview_prep', 'day_to_day', 'visa_work_rights'],
    path: 'Came through a bank graduate program as an international student on a 485 visa.',
    bio: 'I moved from Java to Rust when our team rewrote a settlement service. Ask me about grad programs at big employers.',
    monthly_cap: 2, paused: false, availability: [{ weekday: 1, start: '17:30', end: '18:30' }, { weekday: 3, start: '17:30', end: '18:30' }],
  },
  {
    id: 'p-chloe', display_name: 'Chloe Nguyen', current_title: 'Analytics Engineer', current_role_slug: 'data-engineer',
    employer: 'Southerly Health', work_email_domain: 'southerly-health.example', verification: 'verified', entry_year: 2024,
    location_id: 'au-vic-melbourne-cbd', skills: ['dbt', 'sql', 'python', 'airflow', 'data-analysis', 'powerbi'],
    topics: ['switching_into_tech', 'portfolio', 'choosing_electives', 'day_to_day'],
    path: 'Started as a data analyst after a Commerce degree, moved into analytics engineering within a year.',
    bio: 'I build the models our hospital dashboards run on. Not from a CS background — happy to talk about that.',
    monthly_cap: 4, paused: false, availability: [{ weekday: 2, start: '12:00', end: '13:00' }, { weekday: 5, start: '15:00', end: '16:30' }],
  },
  {
    id: 'p-tom', display_name: 'Tom Walker', current_title: 'DevOps Engineer', current_role_slug: 'devops-engineer',
    employer: 'Wattle Energy', work_email_domain: 'wattle-energy.example', verification: 'verified', entry_year: 2022,
    location_id: 'au-qld-brisbane', skills: ['terraform', 'aws', 'kubernetes', 'docker', 'cicd', 'linux', 'python'],
    topics: ['internships', 'first_90_days', 'day_to_day', 'side_projects'],
    path: 'Internship in second year turned into a part-time role, then full-time after graduating.',
    bio: 'Infrastructure for a renewable energy retailer. I can talk about what the on-call life is actually like.',
    monthly_cap: 3, paused: false, availability: [{ weekday: 3, start: '19:00', end: '20:00' }, { weekday: 6, start: '10:00', end: '11:00' }], tz: 'Australia/Brisbane',
  },
  {
    id: 'p-priya', display_name: 'Priya Sharma', current_title: 'Machine Learning Engineer', current_role_slug: 'ml-engineer',
    employer: 'Lyrebird Robotics', work_email_domain: 'lyrebird-robotics.example', verification: 'verified', entry_year: 2023,
    location_id: 'au-nsw-sydney-west', skills: ['python', 'pytorch', 'machine-learning', 'llm', 'docker', 'statistics'],
    topics: ['choosing_electives', 'grad_programs', 'portfolio', 'interview_prep'],
    path: 'Master of Data Science, then a research assistant role that became an ML engineering job.',
    bio: 'I put models onto warehouse robots. Ask me whether a master’s was worth it.',
    monthly_cap: 2, paused: false, availability: [{ weekday: 4, start: '18:00', end: '19:00' }],
  },
  {
    id: 'p-aisha', display_name: 'Aisha Rahman', current_title: 'Security Analyst', current_role_slug: 'cyber-security-analyst',
    employer: 'Coastline Insurance', work_email_domain: 'coastline-insurance.example', verification: 'verified', entry_year: 2025,
    location_id: 'au-act-canberra', skills: ['cybersecurity', 'networking', 'linux', 'python', 'azure'],
    topics: ['grad_programs', 'visa_work_rights', 'first_90_days', 'interview_prep'],
    path: 'Security operations graduate role straight after a Bachelor of IT; did CTFs through uni.',
    bio: 'First year in a SOC. I remember the application season well — ask me anything about it.',
    monthly_cap: 3, paused: false, availability: [{ weekday: 1, start: '12:00', end: '13:00' }, { weekday: 3, start: '12:00', end: '13:00' }],
  },
  {
    id: 'p-lucas', display_name: 'Lucas Ferreira', current_title: 'Full-stack Developer', current_role_slug: 'web-developer',
    employer: 'Bluegum Software', work_email_domain: 'bluegum.example', verification: 'verified', entry_year: 2024,
    location_id: 'au-vic-melbourne-south', skills: ['typescript', 'react', 'javascript', 'nodejs', 'postgresql', 'figma'],
    topics: ['side_projects', 'portfolio', 'switching_into_tech', 'day_to_day'],
    path: 'Bootcamp after a biology degree, then a junior role at a small agency.',
    bio: 'I build booking software for physios. Happy to talk about switching fields and building a portfolio.',
    monthly_cap: 2, paused: false, availability: [{ weekday: 2, start: '19:00', end: '20:00' }, { weekday: 7, start: '10:00', end: '11:00' }],
  },
  {
    id: 'p-grace', display_name: 'Grace Liu', current_title: 'Data Analyst', current_role_slug: 'data-analyst',
    employer: 'Saltbush Retail', work_email_domain: 'saltbush.example', verification: 'verified', entry_year: 2025,
    location_id: 'au-nsw-sydney-cbd', skills: ['sql', 'excel', 'powerbi', 'data-analysis', 'python'],
    topics: ['grad_programs', 'internships', 'choosing_electives', 'interview_prep'],
    path: 'Summer internship in penultimate year led to a graduate offer.',
    bio: 'I look after pricing dashboards for 300 stores. Very happy to talk internships.',
    monthly_cap: 4, paused: false, availability: [{ weekday: 1, start: '18:00', end: '19:00' }, { weekday: 4, start: '18:00', end: '19:00' }],
  },
  {
    id: 'p-omar', display_name: 'Omar Haddad', current_title: 'Data Engineer', current_role_slug: 'data-engineer',
    employer: 'Mulga Analytics', work_email_domain: 'mulga-analytics.example', verification: 'verified', entry_year: 2021,
    location_id: 'au-wa-perth', skills: ['python', 'spark', 'sql', 'airflow', 'aws', 'dbt', 'terraform'],
    topics: ['day_to_day', 'first_90_days', 'side_projects'],
    path: 'Mechanical engineering graduate who taught himself Python on a mining site.',
    bio: 'Pipelines for mining sensor data in Perth. I switched from engineering — ask me how.',
    monthly_cap: 2, paused: false, availability: [{ weekday: 3, start: '17:00', end: '18:00' }], tz: 'Australia/Perth',
  },
  {
    id: 'p-jack', display_name: 'Jack O’Brien', current_title: 'Cloud Engineer', current_role_slug: 'cloud-engineer',
    employer: 'Riverbend Services', work_email_domain: 'riverbend.example', verification: 'verified', entry_year: 2020,
    location_id: 'au-sa-adelaide', skills: ['azure', 'aws', 'terraform', 'networking', 'linux'],
    topics: ['grad_programs', 'day_to_day', 'visa_work_rights'],
    path: 'Service desk role while studying part-time, then moved into cloud.',
    bio: 'Cloud platform for a state services agency. I started on the help desk.',
    monthly_cap: 2, paused: false, availability: [{ weekday: 5, start: '12:00', end: '13:00' }], tz: 'Australia/Adelaide',
  },
  {
    id: 'p-hana', display_name: 'Hana Kobayashi', current_title: 'Product Designer', current_role_slug: 'ux-designer',
    employer: 'Tessellate Studio', work_email_domain: 'tessellate.example', verification: 'verified', entry_year: 2023,
    location_id: 'au-vic-melbourne-cbd', skills: ['figma', 'ux-research', 'agile'],
    topics: ['portfolio', 'switching_into_tech', 'interview_prep'],
    path: 'Design degree, then a junior UX role at a consultancy.',
    bio: 'I design and research for health apps. The UX market is tough right now — happy to be honest about it.',
    monthly_cap: 3, paused: false, availability: [{ weekday: 2, start: '12:30', end: '13:30' }],
  },
  {
    id: 'p-sofia', display_name: 'Sofia Rossi', current_title: 'Product Manager', current_role_slug: 'product-manager',
    employer: 'Bluegum Software', work_email_domain: 'bluegum.example', verification: 'verified', entry_year: 2022,
    location_id: 'au-vic-melbourne-cbd', skills: ['stakeholder-management', 'agile', 'data-analysis'],
    topics: ['switching_into_tech', 'day_to_day', 'first_90_days'],
    path: 'Associate product manager program after a Commerce/Science double degree.',
    bio: 'Currently paused while I’m on leave.',
    monthly_cap: 2, paused: true, availability: [{ weekday: 3, start: '18:00', end: '19:00' }],
  },
  {
    id: 'p-ngaio', display_name: 'Ngaio Parata', current_title: 'Software Tester', current_role_slug: 'software-tester',
    employer: 'Ironbark Games', work_email_domain: 'gmail.example', verification: 'manual_review', entry_year: 2024,
    location_id: 'nz-wellington', skills: ['testing', 'javascript', 'python', 'agile'],
    topics: ['first_90_days', 'day_to_day'],
    path: 'QA contractor at a game studio after a diploma in software development.',
    bio: 'Signed up with a personal email — waiting for manual review.',
    monthly_cap: 2, paused: false, availability: [{ weekday: 1, start: '19:00', end: '20:00' }], tz: 'Pacific/Auckland',
  },
  {
    id: 'p-emily', display_name: 'Emily Chen', current_title: 'Graduate Software Engineer', current_role_slug: 'software-engineer',
    employer: 'Harbourline Bank', work_email_domain: 'harbourline.example', verification: 'verified', entry_year: 2025,
    location_id: 'au-nsw-sydney-cbd', skills: ['python', 'sql', 'typescript', 'react', 'aws', 'git'],
    topics: ['grad_programs', 'interview_prep', 'choosing_electives', 'internships'],
    path: 'Penultimate-year internship at the bank, graduate offer in final year.',
    bio: 'Nine months into a grad rotation. The application process is still fresh in my mind.',
    monthly_cap: 3, paused: false, availability: [{ weekday: 2, start: '17:30', end: '18:30' }, { weekday: 4, start: '17:30', end: '18:30' }],
  },
];

function initials(name: string): string {
  return name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function seedPractitioners(): Practitioner[] {
  return PEOPLE.map(({ tz, ...p }) => ({
    ...p,
    user_id: null,
    initials: initials(p.display_name),
    timezone: tz ?? 'Australia/Sydney',
    joined_at: '2026-07-01T00:00:00.000Z',
    suspended_until: null,
    meeting_link: `https://meet.example/${p.id.slice(2)}`,
  }));
}

export const TOPICS = [
  'choosing_electives', 'grad_programs', 'internships', 'first_90_days', 'side_projects',
  'portfolio', 'interview_prep', 'visa_work_rights', 'switching_into_tech', 'day_to_day',
] as const;
export type Topic = (typeof TOPICS)[number];

export function seedPipelineRuns(nowMs: number): PipelineRun[] {
  const at = (hoursAgo: number) => new Date(nowMs - hoursAgo * 3_600_000).toISOString();
  return [
    { id: 'run-6', job: 'detect_signals', status: 'succeeded', started_at: at(5.2), finished_at: at(5.1), stats: { instruments: 58, signals: 7 }, error: null },
    { id: 'run-5', job: 'compute_metrics', status: 'succeeded', started_at: at(5.6), finished_at: at(5.2), stats: { cells: 1566, points: 90828 }, error: null },
    { id: 'run-4', job: 'ingest_ads', status: 'succeeded', started_at: at(6.5), finished_at: at(5.7), stats: { calls: 312, ads_new: 2877, ads_updated: 9120 }, error: null },
    { id: 'run-3', job: 'ingest_official', status: 'failed', started_at: at(30), finished_at: at(29.9), stats: { series: 0 }, error: 'Upstream returned 503; will retry next schedule' },
    { id: 'run-2', job: 'expire_requests', status: 'succeeded', started_at: at(1), finished_at: at(1), stats: { expired: 0, replaced: 0 }, error: null },
    { id: 'run-1', job: 'send_outbox', status: 'succeeded', started_at: at(0.2), finished_at: at(0.2), stats: { sent: 0, held_in_preview: 0 }, error: null },
  ];
}
