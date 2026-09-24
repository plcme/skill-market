import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { AdminShell } from '@/features/admin/admin-shell';

export const generateMetadata = () => privateMetadata('Admin');

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ClientPage><AdminShell>{children}</AdminShell></ClientPage>;
}
