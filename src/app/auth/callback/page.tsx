import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { CallbackView } from '@/features/student/auth/callback-view';

export const generateMetadata = () => privateMetadata('Auth', 'metaCallback');

export default function CallbackPage() {
  return <ClientPage><CallbackView /></ClientPage>;
}
