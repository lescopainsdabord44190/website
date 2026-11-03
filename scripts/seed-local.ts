/**
 * Restaure les buckets et les fichiers Storage dans le Supabase local
 * à partir du snapshot téléchargé dans `supabase/seed/storage/`.
 *
 * (Les données SQL auth + public sont restaurées automatiquement par
 * `supabase db reset` via `supabase/seed/prod_data_local.sql` configuré
 * dans `supabase/config.toml`).
 *
 * Usage : make reset   ou   make supabase_seed_storage
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureStorageBuckets } from './ensure-storage-buckets.ts';

config();

const SUPABASE_URL =
  process.env.API_URL ??
  process.env.LOCAL_SUPABASE_URL ??
  'http://127.0.0.1:54321';

const SERVICE_ROLE_KEY =
  process.env.SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SEED_DIR = path.resolve(process.cwd(), 'supabase/seed');
const STORAGE_DIR = path.resolve(SEED_DIR, 'storage');
const MANIFEST_PATH = path.resolve(SEED_DIR, 'storage_manifest.json');

interface StorageObjectMeta {
  id: string;
  bucket_id: string;
  name: string;
  mimetype: string;
  size: number;
}

async function main() {
  if (!SERVICE_ROLE_KEY) {
    console.error(
      '❌ SERVICE_ROLE_KEY manquant. Lancez via `make reset` ou `make supabase_seed_storage`.'
    );
    process.exit(1);
  }

  await ensureStorageBuckets(SUPABASE_URL, SERVICE_ROLE_KEY);

  const manifestExists = await fs
    .stat(MANIFEST_PATH)
    .then(() => true)
    .catch(() => false);

  if (!manifestExists) {
    console.warn(
      '⚠️ Aucun manifest Storage trouvé dans supabase/seed/storage_manifest.json. Lancez `make pull-prod` pour récupérer les fichiers de prod.'
    );
    return;
  }

  const manifest = JSON.parse(
    await fs.readFile(MANIFEST_PATH, 'utf8')
  ) as StorageObjectMeta[];

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    `📤 Restauration de ${manifest.length} fichier(s) dans le Storage local (${SUPABASE_URL})...`
  );

  let uploaded = 0;
  let failed = 0;
  let index = 0;
  const concurrency = 10;

  async function worker() {
    while (index < manifest.length) {
      const item = manifest[index++];
      const filePath = path.resolve(STORAGE_DIR, item.bucket_id, item.name);

      try {
        const buffer = await fs.readFile(filePath);
        const { error } = await supabase.storage
          .from(item.bucket_id)
          .upload(item.name, buffer, {
            contentType: item.mimetype || 'application/octet-stream',
            upsert: true,
          });

        if (error) {
          console.error(
            `  ✗ ${item.bucket_id}/${item.name}: ${error.message}`
          );
          failed++;
        } else {
          uploaded++;
        }
      } catch (err) {
        console.error(
          `  ✗ Fichier local manquant ou illisible (${item.bucket_id}/${item.name}):`,
          err
        );
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log(
    `✅ Fichiers Storage restaurés : ${uploaded}/${manifest.length} importé(s)${
      failed > 0 ? `, ${failed} erreur(s)` : ''
    }.`
  );
}

main().catch((err) => {
  console.error('❌ Erreur lors de la restauration Storage :', err);
  process.exit(1);
});
