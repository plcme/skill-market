import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { SettingsView } from '@/features/student/settings/settings-view';

export const generateMetadata = () => privateMetadata('Settings');

export default function SettingsPage() {
  return <ClientPage><SettingsView /></ClientPage>;
}
