import { redirect } from 'next/navigation';
import { marketEntryHref } from '@/features/market/logic';

/** The market is the entry: `/` is the board, which opens on the landing band. */
export default async function RootPage({ searchParams }: PageProps<'/'>) {
  redirect(marketEntryHref(await searchParams));
}
