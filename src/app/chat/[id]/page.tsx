import { ClientPage, privateMetadata } from '@/features/student/page-shell';
import { RequestPage } from '@/features/community/request-page';

export const generateMetadata = () => privateMetadata('Chat');

export default async function ChatPage({ params }: PageProps<'/chat/[id]'>) {
  const { id } = await params;
  return <ClientPage><RequestPage id={id} /></ClientPage>;
}
