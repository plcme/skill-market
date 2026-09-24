import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { StudentRequests } from '@/features/community/requests-list';

export const generateMetadata = () => privateMetadata('Requests');

export default function RequestsPage() {
  return <ClientPage><StudentRequests /></ClientPage>;
}
