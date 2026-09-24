import { getRequestConfig } from 'next-intl/server';
import { loadMessages } from './messages';

export default getRequestConfig(async () => ({ locale: 'en', timeZone: 'Australia/Sydney', messages: await loadMessages('en') }));
