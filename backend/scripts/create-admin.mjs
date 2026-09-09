/**
 * Bootstrap an administrator.
 *
 *   npm run create-admin -- admin@gmail.com
 *   npm run create-admin -- admin@gmail.com --password "Str0ngPass" --name "Dr. Rakib"
 *
 * Uses the service-role key from backend/.env, which bypasses Row Level
 * Security - so it works even when the Supabase SQL editor runs under a
 * restricted role and refuses to touch `profiles` or call
 * `promote_to_admin()`.
 *
 * If the account already exists it is promoted in place. If it does not and
 * --password is given, the auth user is created (pre-confirmed) first.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);

function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1] ?? null;
}

const email = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true);
const password = flag('password');
const fullName = flag('name');

const die = (message) => {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
};

if (!email || !email.includes('@')) {
  die('Usage: npm run create-admin -- you@example.com [--password "..."] [--name "..."]');
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  die('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing from backend/.env');
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const normalized = email.trim().toLowerCase();
console.log(`\n  Bootstrapping administrator: ${normalized}`);

// 1. Find the auth user (listUsers is paged; walk until we find it)
async function findAuthUser(target) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) die(`Could not list auth users: ${error.message}`);
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findAuthUser(normalized);

// 2. Create it if asked to
if (!user) {
  if (!password) {
    die(
      `No auth user with that e-mail.\n` +
        `    Either create it in Supabase (Authentication -> Users -> Add user, tick "Auto Confirm User"),\n` +
        `    or re-run this with a password:\n` +
        `      npm run create-admin -- ${normalized} --password "YourStrongPassword"`
    );
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || normalized.split('@')[0] },
  });
  if (error) die(`Could not create the auth user: ${error.message}`);
  user = data.user;
  console.log('  • auth user created (pre-confirmed)');
} else {
  console.log('  • auth user found');
  if (password) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) die(`Could not set the password: ${error.message}`);
    console.log('  • password updated');
  }
}

// 3. Promote (or create) the profile
const { data: profile, error } = await admin
  .from('profiles')
  .upsert(
    {
      id: user.id,
      full_name: fullName || user.user_metadata?.full_name || normalized.split('@')[0],
      email: normalized,
      role: 'ADMIN',
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  .select('email, full_name, role, status')
  .single();

if (error) die(`Could not write the profile: ${error.message}`);

await admin.from('audit_logs').insert({
  user_id: user.id,
  user_email: normalized,
  action: 'ADMIN_BOOTSTRAPPED',
  entity_type: 'profile',
  entity_id: user.id,
  metadata: { via: 'create-admin script' },
});

console.log(
  `\n  ✔ ${profile.full_name} <${profile.email}> is now ${profile.role} / ${profile.status}\n` +
    `    Sign in at the frontend and you will land on the admin dashboard.\n`
);
