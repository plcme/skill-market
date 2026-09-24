import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { SkillsView } from '@/features/student/skills/skills-view';

export const generateMetadata = () => privateMetadata('SkillsPage');

export default function SkillsPage() {
  return <ClientPage><SkillsView /></ClientPage>;
}
