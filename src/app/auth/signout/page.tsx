import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { SignOutView } from '@/features/student/auth/signout-view';

export const generateMetadata = () => privateMetadata('Auth', 'metaSignOut');

export default function SignOutPage() {
  return <ClientPage><SignOutView /></ClientPage>;
}
