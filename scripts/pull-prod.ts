/**
 * Récupère les données de la base de production (auth + public) ainsi que
 * tous les fichiers des buckets Storage de prod pour permettre un `make reset`
 * 100% iso-prod en local.
 *
 * Usage : npm run pull-prod   ou   make pull-prod
 */

import { config } from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

config();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'edpfmcafuyjskzflwvnw';
const PROD_SUPABASE_URL =
  process.env.PROD_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
const LOCAL_SUPABASE_URL =
  process.env.LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const SEED_DIR = path.resolve(process.cwd(), 'supabase/seed');
const STORAGE_DIR = path.resolve(SEED_DIR, 'storage');

const TABLES_IN_ORDER: { schema: string; table: string }[] = [
  { schema: 'auth', table: 'users' },
  { schema: 'auth', table: 'identities' },
  { schema: 'public', table: 'profiles' },
  { schema: 'public', table: 'user_roles' },
  { schema: 'public', table: 'site_settings' },
  { schema: 'public', table: 'pages' },
  { schema: 'public', table: 'featured_highlights' },
  { schema: 'public', table: 'counselors' },
  { schema: 'public', table: 'projects' },
  { schema: 'public', table: 'project_counselors' },
  { schema: 'public', table: 'volunteers' },
  { schema: 'public', table: 'commissions' },
  { schema: 'public', table: 'commission_volunteers' },
  { schema: 'public', table: 'news_categories' },
  { schema: 'public', table: 'news_tags' },
  { schema: 'public', table: 'news_articles' },
  { schema: 'public', table: 'news_article_tags' },
  { schema: 'public', table: 'game_scores' },
];

async function runProdQuery<T = any>(query: string): Promise<T[]> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur API Supabase (${res.status}): ${errText}`);
  }
  return (await res.json()) as T[];
}

async function getProdServiceRoleKey(): Promise<string> {
  if (process.env.PROD_SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
  }
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`,
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Impossible de récupérer les clés API de prod (${res.status})`);
  }
  const keys = (await res.json()) as { name: string; api_key: string }[];
  const sr = keys.find((k) => k.name === 'service_role');
  if (!sr?.api_key) {
    throw new Error('Clé service_role introuvable sur le projet de prod');
  }
  return sr.api_key;
}

interface StorageObjectMeta {
  id: string;
  bucket_id: string;
  name: string;
  mimetype: string;
  size: number;
  created_at: string;
  updated_at: string;
}

async function main() {
  if (!ACCESS_TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN manquant dans .env');
    process.exit(1);
  }

  await fs.mkdir(STORAGE_DIR, { recursive: true });

  console.log(`🔄 Connexion au projet Supabase de prod (${PROJECT_REF})...`);
  const serviceRoleKey = await getProdServiceRoleKey();

  // 1. Récupération des colonnes non générées par table
  const colRows = await runProdQuery<{
    table_schema: string;
    table_name: string;
    column_name: string;
  }>(`
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE is_generated = 'NEVER'
      AND (
        table_schema = 'public'
        OR (table_schema = 'auth' AND table_name IN ('users', 'identities'))
      )
    ORDER BY table_schema, table_name, ordinal_position;
  `);

  const columnsByTable = new Map<string, string[]>();
  for (const row of colRows) {
    const key = `${row.table_schema}.${row.table_name}`;
    const list = columnsByTable.get(key) ?? [];
    list.push(row.column_name);
    columnsByTable.set(key, list);
  }

  // 2. Récupération des données de chaque table et génération du SQL
  const sqlLines: string[] = [
    '-- ============================================================================',
    `-- Dump des données de production (${PROJECT_REF})`,
    `-- Généré automatiquement par scripts/pull-prod.ts le ${new Date().toISOString()}`,
    '-- ============================================================================',
    '',
    'SET session_replication_role = replica;',
    'SET client_encoding = \'UTF8\';',
    'SET standard_conforming_strings = on;',
    'SET check_function_bodies = false;',
    'SET row_security = off;',
    '',
    '-- Nettoyage préalable des tables',
    'TRUNCATE TABLE',
    '  "public"."game_scores",',
    '  "public"."news_article_tags",',
    '  "public"."news_articles",',
    '  "public"."news_tags",',
    '  "public"."news_categories",',
    '  "public"."commission_volunteers",',
    '  "public"."commissions",',
    '  "public"."volunteers",',
    '  "public"."project_counselors",',
    '  "public"."projects",',
    '  "public"."counselors",',
    '  "public"."featured_highlights",',
    '  "public"."pages",',
    '  "public"."site_settings",',
    '  "public"."user_roles",',
    '  "public"."profiles",',
    '  "auth"."identities",',
    '  "auth"."users"',
    'CASCADE;',
    '',
  ];

  for (const { schema, table } of TABLES_IN_ORDER) {
    const fullName = `${schema}.${table}`;
    const cols = columnsByTable.get(fullName);
    if (!cols || cols.length === 0) {
      console.warn(`⚠️ Aucune colonne trouvée pour ${fullName}, ignoré.`);
      continue;
    }

    const rows = await runProdQuery<{ row_data: Record<string, unknown> }>(
      `SELECT to_jsonb(t) AS row_data FROM "${schema}"."${table}" t;`
    );

    console.log(`  ✓ ${fullName} : ${rows.length} ligne(s)`);

    if (rows.length === 0) continue;

    const jsonArray = JSON.stringify(rows.map((r) => r.row_data), null, 2);
    const quotedCols = cols.map((c) => `"${c}"`).join(', ');

    sqlLines.push(`-- Data for ${fullName} (${rows.length} rows)`);
    sqlLines.push(
      `INSERT INTO "${schema}"."${table}" (${quotedCols})`
    );
    sqlLines.push(
      `SELECT ${quotedCols} FROM jsonb_populate_recordset(NULL::"${schema}"."${table}", $json_dump$`
    );
    sqlLines.push(jsonArray);
    sqlLines.push(`$json_dump$::jsonb);`);
    sqlLines.push('');
  }

  sqlLines.push('SET session_replication_role = origin;');
  sqlLines.push('');

  const prodSql = sqlLines.join('\n');
  const localSql = prodSql.replaceAll(PROD_SUPABASE_URL, LOCAL_SUPABASE_URL);

  const prodSqlPath = path.resolve(SEED_DIR, 'prod_data.sql');
  const localSqlPath = path.resolve(SEED_DIR, 'prod_data_local.sql');

  await fs.writeFile(prodSqlPath, prodSql, 'utf8');
  await fs.writeFile(localSqlPath, localSql, 'utf8');

  console.log(`💾 Dump SQL écrit dans :`);
  console.log(`   - supabase/seed/prod_data.sql (URLs prod)`);
  console.log(`   - supabase/seed/prod_data_local.sql (URLs réécrites vers ${LOCAL_SUPABASE_URL})`);

  // 3. Récupération de la liste des fichiers Storage de prod
  const storageObjects = await runProdQuery<StorageObjectMeta>(`
    SELECT
      id,
      bucket_id,
      name,
      COALESCE(metadata->>'mimetype', 'application/octet-stream') AS mimetype,
      COALESCE((metadata->>'size')::bigint, 0) AS size,
      created_at,
      updated_at
    FROM storage.objects
    WHERE name IS NOT NULL AND name <> '.emptyFolderPlaceholder'
    ORDER BY bucket_id, name;
  `);

  const manifestPath = path.resolve(SEED_DIR, 'storage_manifest.json');
  await fs.writeFile(
    manifestPath,
    JSON.stringify(storageObjects, null, 2),
    'utf8'
  );

  console.log(
    `\n📦 Téléchargement de ${storageObjects.length} fichier(s) Storage depuis la prod...`
  );

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const concurrency = 10;
  let index = 0;

  async function worker() {
    while (index < storageObjects.length) {
      const current = storageObjects[index++];
      const localFilePath = path.resolve(
        STORAGE_DIR,
        current.bucket_id,
        current.name
      );

      try {
        const stat = await fs.stat(localFilePath).catch(() => null);
        if (stat && Number(current.size) > 0 && stat.size === Number(current.size)) {
          skipped++;
          continue;
        }

        await fs.mkdir(path.dirname(localFilePath), { recursive: true });

        const encodedPath = current.name
          .split('/')
          .map(encodeURIComponent)
          .join('/');
        const url = `${PROD_SUPABASE_URL}/storage/v1/object/${encodeURIComponent(
          current.bucket_id
        )}/${encodedPath}`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
        });

        if (!res.ok) {
          console.error(
            `  ✗ Échec téléchargement ${current.bucket_id}/${current.name}: HTTP ${res.status}`
          );
          failed++;
          continue;
        }

        const arrayBuf = await res.arrayBuffer();
        await fs.writeFile(localFilePath, Buffer.from(arrayBuf));
        downloaded++;
      } catch (err) {
        console.error(
          `  ✗ Erreur sur ${current.bucket_id}/${current.name}:`,
          err
        );
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log(
    `✅ Storage synchronisé : ${downloaded} téléchargé(s), ${skipped} déjà à jour, ${failed} erreur(s).`
  );
}

main().catch((err) => {
  console.error('❌ Erreur lors du pull-prod :', err);
  process.exit(1);
});
