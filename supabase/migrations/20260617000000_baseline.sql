-- Baseline du schéma de production (projet edpfmcafuyjskzflwvnw)
-- Généré le 2026-06-17 via `supabase db dump` — représente l'état réel de la prod.
-- Les migrations granulaires antérieures sont archivées dans supabase/migrations_archive/.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."delete_own_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur connecté
  user_id := auth.uid();
  
  -- Vérifier que l'utilisateur est connecté
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  
  -- Supprimer le profil de l'utilisateur
  DELETE FROM profiles WHERE id = user_id;
  
  -- Supprimer les données de l'utilisateur dans user_roles
  DELETE FROM user_roles WHERE user_roles.user_id = user_id;
  
  -- Supprimer l'utilisateur de auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."delete_own_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_page"("_page_id" "uuid", "_new_parent_id" "uuid", "_new_order_index" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _old_parent_id uuid;
BEGIN
  SELECT parent_id
  INTO _old_parent_id
  FROM pages
  WHERE id = _page_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page % introuvable', _page_id;
  END IF;

  -- Move page to target parent immediately with sentinel order to avoid conflicts
  UPDATE pages
  SET parent_id = _new_parent_id,
      order_index = -1
  WHERE id = _page_id;

  -- Re-index former parent siblings
  WITH ordered_old AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY order_index) - 1 AS rn
    FROM pages
    WHERE parent_id IS NOT DISTINCT FROM _old_parent_id
  )
  UPDATE pages AS p
  SET order_index = ordered_old.rn
  FROM ordered_old
  WHERE p.id = ordered_old.id;

  -- Shift siblings in target parent to make room
  WITH target AS (
    SELECT id
    FROM pages
    WHERE parent_id IS NOT DISTINCT FROM _new_parent_id
      AND id <> _page_id
      AND order_index >= _new_order_index
    ORDER BY order_index DESC
  )
  UPDATE pages AS p
  SET order_index = order_index + 1000
  FROM target
  WHERE p.id = target.id;

  -- Assign provisional order to moved page above the gap
  UPDATE pages
  SET order_index = _new_order_index + 1000
  WHERE id = _page_id;

  -- Re-index target parent (including moved page)
  WITH ordered_target AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY order_index) - 1 AS rn
    FROM pages
    WHERE parent_id IS NOT DISTINCT FROM _new_parent_id
  )
  UPDATE pages AS p
  SET order_index = ordered_target.rn
  FROM ordered_target
  WHERE p.id = ordered_target.id;
END;
$$;


ALTER FUNCTION "public"."move_page"("_page_id" "uuid", "_new_parent_id" "uuid", "_new_order_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_pages"("_updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ids uuid[];
BEGIN
  ids := ARRAY(
    SELECT (elem->>'id')::uuid
    FROM jsonb_array_elements(_updates) AS u(elem)
  );

  -- temporary shift to avoid unique constraint conflict
  UPDATE pages
  SET order_index = order_index + 1000
  WHERE id = ANY(ids);

  -- apply final order
  UPDATE pages AS p
  SET order_index = (u.elem->>'order_index')::integer
  FROM jsonb_array_elements(_updates) AS u(elem)
  WHERE p.id = (u.elem->>'id')::uuid;
END;
$$;


ALTER FUNCTION "public"."reorder_pages"("_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_page_order_index"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  max_order INTEGER;
BEGIN
  IF NEW.order_index IS NULL THEN
    SELECT COALESCE(MAX(order_index), -1) + 1 INTO max_order
    FROM pages
    WHERE (parent_id IS NOT DISTINCT FROM NEW.parent_id);

    NEW.order_index := max_order;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_page_order_index"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."commission_volunteers" (
    "commission_id" "uuid" NOT NULL,
    "volunteer_id" "uuid" NOT NULL,
    "role" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."commission_volunteers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "order_index" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counselors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text",
    "role_title" "text",
    "tagline" "text",
    "bio" "text",
    "photo_url" "text",
    "focus_areas" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."counselors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."featured_highlights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{"time": 0, "blocks": [], "version": "2.28.0"}'::"jsonb" NOT NULL,
    "link" "text",
    "gradient_theme" "text" DEFAULT 'blue-green'::"text" NOT NULL,
    "icon" "text" DEFAULT 'Lightbulb'::"text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_by" "uuid",
    "updated_by" "uuid",
    "link_label" "text",
    "end_date" timestamp with time zone,
    "start_date" timestamp with time zone
);


ALTER TABLE "public"."featured_highlights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_name" character varying(3) NOT NULL,
    "score" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."game_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_article_tags" (
    "article_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."news_article_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "summary" "text" DEFAULT ''::"text",
    "content" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "category_id" "uuid",
    "image_url" "text",
    "author_id" "uuid",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "news_articles_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."news_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "meta_description" "text" DEFAULT ''::"text",
    "content" "jsonb" DEFAULT '[]'::"jsonb",
    "parent_id" "uuid",
    "order_index" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "show_in_menu" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "image_url" "text",
    "show_toc" boolean DEFAULT true,
    "show_in_footer" boolean DEFAULT false
);


ALTER TABLE "public"."pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "is_active" boolean DEFAULT true,
    "password_set" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_counselors" (
    "project_id" "uuid" NOT NULL,
    "counselor_id" "uuid" NOT NULL,
    "role" "text"
);


ALTER TABLE "public"."project_counselors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "short_description" "text",
    "age_group" "text",
    "cover_image_url" "text",
    "content" "jsonb" DEFAULT "jsonb_build_object"('time', 0, 'blocks', "jsonb_build_array"(), 'version', '2.31.0'),
    "objectives" "text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" DEFAULT ''::"text",
    "description" "text" DEFAULT ''::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "type" character varying(50) DEFAULT 'text'::character varying
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."site_settings"."type" IS 'Type of setting: text (simple text), richtext (EditorJS content), images (collection of images with title and link)';



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."volunteers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text",
    "role_title" "text",
    "bio" "text",
    "photo_url" "text",
    "is_executive_member" boolean DEFAULT false,
    "is_board_member" boolean DEFAULT false,
    "mandate_start_date" "date",
    "order_index" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."volunteers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."commission_volunteers"
    ADD CONSTRAINT "commission_volunteers_pkey" PRIMARY KEY ("commission_id", "volunteer_id");



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."counselors"
    ADD CONSTRAINT "counselors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counselors"
    ADD CONSTRAINT "counselors_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."featured_highlights"
    ADD CONSTRAINT "featured_highlights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_scores"
    ADD CONSTRAINT "game_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_article_tags"
    ADD CONSTRAINT "news_article_tags_pkey" PRIMARY KEY ("article_id", "tag_id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."news_categories"
    ADD CONSTRAINT "news_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."news_categories"
    ADD CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_tags"
    ADD CONSTRAINT "news_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."news_tags"
    ADD CONSTRAINT "news_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_tags"
    ADD CONSTRAINT "news_tags_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_counselors"
    ADD CONSTRAINT "project_counselors_pkey" PRIMARY KEY ("project_id", "counselor_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."volunteers"
    ADD CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."volunteers"
    ADD CONSTRAINT "volunteers_slug_key" UNIQUE ("slug");



CREATE INDEX "featured_highlights_end_date_idx" ON "public"."featured_highlights" USING "btree" ("end_date");



CREATE INDEX "featured_highlights_is_active_idx" ON "public"."featured_highlights" USING "btree" ("is_active");



CREATE INDEX "featured_highlights_order_index_idx" ON "public"."featured_highlights" USING "btree" ("order_index");



CREATE INDEX "featured_highlights_start_date_idx" ON "public"."featured_highlights" USING "btree" ("start_date");



CREATE INDEX "idx_game_scores_created_at" ON "public"."game_scores" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_game_scores_score" ON "public"."game_scores" USING "btree" ("score" DESC);



CREATE INDEX "idx_news_articles_category" ON "public"."news_articles" USING "btree" ("category_id");



CREATE INDEX "idx_news_articles_status_published_at" ON "public"."news_articles" USING "btree" ("status", "published_at" DESC);



CREATE UNIQUE INDEX "profiles_email_key" ON "public"."profiles" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE OR REPLACE TRIGGER "pages_order_index_trigger" BEFORE INSERT ON "public"."pages" FOR EACH ROW EXECUTE FUNCTION "public"."set_page_order_index"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."commission_volunteers"
    ADD CONSTRAINT "commission_volunteers_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commission_volunteers"
    ADD CONSTRAINT "commission_volunteers_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."featured_highlights"
    ADD CONSTRAINT "featured_highlights_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."featured_highlights"
    ADD CONSTRAINT "featured_highlights_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."news_article_tags"
    ADD CONSTRAINT "news_article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."news_articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_article_tags"
    ADD CONSTRAINT "news_article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."news_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."news_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_counselors"
    ADD CONSTRAINT "project_counselors_counselor_id_fkey" FOREIGN KEY ("counselor_id") REFERENCES "public"."counselors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_counselors"
    ADD CONSTRAINT "project_counselors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and editors can delete news article tags" ON "public"."news_article_tags" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can delete news articles" ON "public"."news_articles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can delete news categories" ON "public"."news_categories" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can delete news tags" ON "public"."news_tags" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can insert news article tags" ON "public"."news_article_tags" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can insert news articles" ON "public"."news_articles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can insert news categories" ON "public"."news_categories" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can insert news tags" ON "public"."news_tags" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can update news articles" ON "public"."news_articles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can update news categories" ON "public"."news_categories" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can update news tags" ON "public"."news_tags" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can view all news article tags" ON "public"."news_article_tags" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins and editors can view all news articles" ON "public"."news_articles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Admins can create featured highlights" ON "public"."featured_highlights" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete commission volunteers" ON "public"."commission_volunteers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete commissions" ON "public"."commissions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete counselors" ON "public"."counselors" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete featured highlights" ON "public"."featured_highlights" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete projects" ON "public"."projects" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete volunteers" ON "public"."volunteers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert commission volunteers" ON "public"."commission_volunteers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert commissions" ON "public"."commissions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert counselors" ON "public"."counselors" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert volunteers" ON "public"."volunteers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update commission volunteers" ON "public"."commission_volunteers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update commissions" ON "public"."commissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update counselors" ON "public"."counselors" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update featured highlights" ON "public"."featured_highlights" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update volunteers" ON "public"."volunteers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all featured highlights" ON "public"."featured_highlights" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all projects" ON "public"."projects" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view commission volunteers" ON "public"."commission_volunteers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view counselors" ON "public"."counselors" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view volunteers" ON "public"."volunteers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Anyone can insert game scores" ON "public"."game_scores" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read game scores" ON "public"."game_scores" FOR SELECT USING (true);



CREATE POLICY "Anyone can view project counselors" ON "public"."project_counselors" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_counselors"."project_id") AND ("projects"."is_active" = true)))));



CREATE POLICY "Everyone can read active pages" ON "public"."pages" FOR SELECT USING ((("is_active" = true) OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "Everyone can read site settings" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "Featured highlights are viewable by everyone" ON "public"."featured_highlights" FOR SELECT USING ((("is_active" = true) AND (("start_date" IS NULL) OR ("start_date" <= "now"())) AND (("end_date" IS NULL) OR ("end_date" > "now"()))));



CREATE POLICY "Only admins can delete pages" ON "public"."pages" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can delete project counselors" ON "public"."project_counselors" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can delete roles" ON "public"."user_roles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can delete site settings" ON "public"."site_settings" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert pages" ON "public"."pages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert project counselors" ON "public"."project_counselors" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can insert site settings" ON "public"."site_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can update pages" ON "public"."pages" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can update project counselors" ON "public"."project_counselors" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can update roles" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Only admins can update site settings" ON "public"."site_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Public can view active commissions" ON "public"."commissions" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view active counselors" ON "public"."counselors" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view active projects" ON "public"."projects" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view active volunteers" ON "public"."volunteers" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view commission volunteers" ON "public"."commission_volunteers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."commissions"
  WHERE (("commissions"."id" = "commission_volunteers"."commission_id") AND ("commissions"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."volunteers"
  WHERE (("volunteers"."id" = "commission_volunteers"."volunteer_id") AND ("volunteers"."is_active" = true))))));



CREATE POLICY "Public can view news categories" ON "public"."news_categories" FOR SELECT USING (true);



CREATE POLICY "Public can view news tags" ON "public"."news_tags" FOR SELECT USING (true);



CREATE POLICY "Public can view published news articles" ON "public"."news_articles" FOR SELECT USING (("status" = 'published'::"text"));



CREATE POLICY "Public can view tags of published news articles" ON "public"."news_article_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."news_articles"
  WHERE (("news_articles"."id" = "news_article_tags"."article_id") AND ("news_articles"."status" = 'published'::"text")))));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can read their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."commission_volunteers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counselors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."featured_highlights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_article_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_counselors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."volunteers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_own_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."move_page"("_page_id" "uuid", "_new_parent_id" "uuid", "_new_order_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."move_page"("_page_id" "uuid", "_new_parent_id" "uuid", "_new_order_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_page"("_page_id" "uuid", "_new_parent_id" "uuid", "_new_order_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_pages"("_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_pages"("_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_pages"("_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_page_order_index"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_page_order_index"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_page_order_index"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."commission_volunteers" TO "anon";
GRANT ALL ON TABLE "public"."commission_volunteers" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_volunteers" TO "service_role";



GRANT ALL ON TABLE "public"."commissions" TO "anon";
GRANT ALL ON TABLE "public"."commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."commissions" TO "service_role";



GRANT ALL ON TABLE "public"."counselors" TO "anon";
GRANT ALL ON TABLE "public"."counselors" TO "authenticated";
GRANT ALL ON TABLE "public"."counselors" TO "service_role";



GRANT ALL ON TABLE "public"."featured_highlights" TO "anon";
GRANT ALL ON TABLE "public"."featured_highlights" TO "authenticated";
GRANT ALL ON TABLE "public"."featured_highlights" TO "service_role";



GRANT ALL ON TABLE "public"."game_scores" TO "anon";
GRANT ALL ON TABLE "public"."game_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."game_scores" TO "service_role";



GRANT ALL ON TABLE "public"."news_article_tags" TO "anon";
GRANT ALL ON TABLE "public"."news_article_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."news_article_tags" TO "service_role";



GRANT ALL ON TABLE "public"."news_articles" TO "anon";
GRANT ALL ON TABLE "public"."news_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."news_articles" TO "service_role";



GRANT ALL ON TABLE "public"."news_categories" TO "anon";
GRANT ALL ON TABLE "public"."news_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."news_categories" TO "service_role";



GRANT ALL ON TABLE "public"."news_tags" TO "anon";
GRANT ALL ON TABLE "public"."news_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."news_tags" TO "service_role";



GRANT ALL ON TABLE "public"."pages" TO "anon";
GRANT ALL ON TABLE "public"."pages" TO "authenticated";
GRANT ALL ON TABLE "public"."pages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_counselors" TO "anon";
GRANT ALL ON TABLE "public"."project_counselors" TO "authenticated";
GRANT ALL ON TABLE "public"."project_counselors" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."volunteers" TO "anon";
GRANT ALL ON TABLE "public"."volunteers" TO "authenticated";
GRANT ALL ON TABLE "public"."volunteers" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































