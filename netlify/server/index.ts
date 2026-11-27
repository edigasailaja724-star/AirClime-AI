import type { Config } from '@netlify/server';
import { app } from '../../server/app.ts';

// Runs the AirClime Express API (/api/*) on Netlify. Static frontend files are
// served by Netlify's CDN from dist/.
app.listen(Number(process.env.PORT) || 3000);

export const config: Config = {
  path: '/api/*',
};
