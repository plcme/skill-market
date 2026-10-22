import {
  siApacheairflow,
  siApachespark,
  siAutocad,
  siAutodeskrevit,
  siCplusplus,
  siDocker,
  siFigma,
  siGit,
  siGo,
  siGooglecloud,
  siJavascript,
  siKubernetes,
  siLinux,
  siMyob,
  siNodedotjs,
  siOpenjdk,
  siPostgresql,
  siPython,
  siPytorch,
  siReact,
  siRust,
  siSap,
  siTerraform,
  siTypescript,
  siXero,
  type SimpleIcon,
} from 'simple-icons';

// Skill logos from Simple Icons (CC0; the logos themselves are trademarks of
// their owners). Used only to identify the technology (nominative use), drawn
// monochrome in ink, never in brand colours (DESIGN §5).
//
// The map is explicit: a skill gets a logo only when Simple Icons has an icon
// for exactly that technology in the installed version. Named imports keep the
// bundle to these icons and fail the build if one disappears upstream.
// Deliberately unmapped: SQL, C# (no icon), AWS and Azure (removed upstream),
// Power BI, Tableau, Excel, dbt, Adobe Creative Cloud (not in the set), CI/CD
// and GIS (generic practices, not one product), and every specialist task.

export const SKILL_LOGOS: Readonly<Record<string, SimpleIcon>> = Object.freeze({
  python: siPython,
  javascript: siJavascript,
  typescript: siTypescript,
  react: siReact,
  nodejs: siNodedotjs,
  java: siOpenjdk,
  go: siGo,
  rust: siRust,
  cpp: siCplusplus,
  gcp: siGooglecloud,
  docker: siDocker,
  kubernetes: siKubernetes,
  terraform: siTerraform,
  linux: siLinux,
  git: siGit,
  postgresql: siPostgresql,
  pytorch: siPytorch,
  spark: siApachespark,
  airflow: siApacheairflow,
  figma: siFigma,
  xero: siXero,
  myob: siMyob,
  sap: siSap,
  autocad: siAutocad,
  revit: siAutodeskrevit,
});

/** Skill slug → Simple Icons slug, for docs and tests. */
export const SKILL_LOGO_SLUGS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(SKILL_LOGOS).map(([skill, icon]) => [skill, icon.slug])),
);

/** The logo for a skill slug, or null (roles, industries and unmapped skills keep their letters). */
export function logoFor(slug: string): SimpleIcon | null {
  return Object.prototype.hasOwnProperty.call(SKILL_LOGOS, slug) ? SKILL_LOGOS[slug] : null;
}
