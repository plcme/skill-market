import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { GapView } from '@/features/student/gap/gap-view';

export const generateMetadata = () => privateMetadata('Gap');

export default function GapPage() {
  return <ClientPage><GapView /></ClientPage>;
}
