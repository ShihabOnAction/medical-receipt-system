import 'dotenv/config';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  // eslint-disable-next-line no-console
  console.error(
    `\n[config] Missing environment variable(s): ${missing.join(', ')}\n` +
      '         Copy backend/.env.example to backend/.env and fill it in.\n'
  );
  process.exit(1);
}

const list = (value, fallback = []) =>
  (value ? value.split(',') : fallback).map((v) => v.trim()).filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',

  frontendUrls: list(process.env.FRONTEND_URL, ['http://localhost:5173']),

  /** Only these e-mail domains may register. */
  allowedEmailDomains: list(process.env.ALLOWED_EMAIL_DOMAINS, ['gmail.com']).map((d) =>
    d.toLowerCase().replace(/^@/, '')
  ),

  /** Optional: path to a system Chrome, for hosts without a bundled Chromium. */
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

  timezone: process.env.TZ_NAME || 'Asia/Dhaka',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'combined' : 'dev'),
};

export default env;
