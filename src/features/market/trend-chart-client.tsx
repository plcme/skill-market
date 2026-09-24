'use client';

import dynamic from 'next/dynamic';

// ARCHITECTURE §4.2: the interactive chart renders client-only. This also avoids
// server/browser ICU differences in month labels ("Jun" vs "June") during hydration.
export const ClientTrendChart = dynamic(() => import('@/components/market/trend-chart').then(m => m.TrendChart), {
  ssr: false,
  loading: () => <div aria-hidden className="skeleton h-[344px] w-full" />,
});
