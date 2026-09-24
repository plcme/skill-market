import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { PractitionerDesk } from '@/features/community/practitioner-desk';

export const generateMetadata = () => privateMetadata('PractitionerDesk');

export default function PractitionerPage() {
  return <ClientPage><PractitionerDesk /></ClientPage>;
}
