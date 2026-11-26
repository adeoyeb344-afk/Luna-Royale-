import type { Config } from '@netlify/server';

// Run the existing Express app (Paystack, media, AI concierge, auth handoff APIs)
// as a Netlify Server. Static frontend files continue to be served from the CDN.
process.env.NETLIFY_SERVER_RUNTIME = '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

await import('../../server.ts');

export const config: Config = {
  path: '/api/*',
};
