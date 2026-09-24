import type { DemoDB } from './types';

// Scheduled chat jobs (expiry after 72h, silent replacement, reminders,
// auto-complete after 7 days). Implemented with the chat domain.
export function runChatJobs(_db: DemoDB, _now: number): void {}
