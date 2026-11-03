/**
 * Crée les buckets Storage Supabase s'ils n'existent pas.
 * Utilisé après `supabase start` (local) ou lors d'un `make reset`.
 *
 * Variables d'environnement :
 * - API_URL ou VITE_SUPABASE_URL ou SUPABASE_URL (défaut: http://127.0.0.1:54321)
 * - SERVICE_ROLE_KEY ou SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const SUPABASE_URL =
  process.env.API_URL ??
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  'http://127.0.0.1:54321';

const SUPABASE_KEY =
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export const BUCKETS: { name: string; public: boolean }[] = [
  { name: 'avatars', public: true },
  { name: 'counselor_photos', public: true },
  { name: 'news', public: true },
  { name: 'page_assets', public: true },
  { name: 'page-images', public: true },
  { name: 'project_images', public: true },
  { name: 'volunteer_photos', public: true },
];

export async function ensureStorageBuckets(url = SUPABASE_URL, serviceRoleKey = SUPABASE_KEY) {
  if (!url || !serviceRoleKey) {
    console.error(
      '❌ Définir API_URL et SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE_KEY).'
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const { name, public: isPublic } of BUCKETS) {
    const { data: existing } = await supabase.storage.getBucket(name);
    if (existing) {
      if (existing.public !== isPublic) {
        await supabase.storage.updateBucket(name, { public: isPublic });
      }
      console.log(`✓ Bucket "${name}" prêt`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(name, { public: isPublic });
    if (error) {
      console.error(`✗ Bucket "${name}": ${error.message}`);
      continue;
    }
    console.log(`✓ Bucket "${name}" créé`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureStorageBuckets().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
