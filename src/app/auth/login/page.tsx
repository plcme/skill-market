import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { LoginView } from '@/features/student/auth/login-view';

export const generateMetadata = () => privateMetadata('Auth', 'metaLogin');

export default function LoginPage() {
  return <ClientPage><LoginView /></ClientPage>;
}
