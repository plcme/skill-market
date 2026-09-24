import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { DeskView } from '@/features/student/desk/desk-view';

export const generateMetadata = () => privateMetadata('Desk');

export default function DeskPage() {
  return <ClientPage><DeskView /></ClientPage>;
}
