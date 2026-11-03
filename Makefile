.PHONY: help build up down restart logs shell clean ps reset pull-prod \
	supabase_start supabase_stop supabase_status supabase_reset \
	supabase_ensure_buckets supabase_seed_storage \
	supabase_migrate supabase_new supabase_diff supabase_functions_deploy

# Variables
COMPOSE = UID=$$(id -u) GID=$$(id -g) docker compose
SERVICE = app
SUPABASE = npx supabase

# Charge les variables de .env si présent
ifneq (,$(wildcard .env))
include .env
export
endif

# Par défaut, affiche l'aide
help:
	@echo "Commandes disponibles (Copains d'Abord) :"
	@echo ""
	@echo "  🚀 Application & Stack locale :"
	@echo "    make up                       - Démarre Supabase local + l'application sur http://localhost:3450"
	@echo "    make down                     - Arrête l'application et Supabase local"
	@echo "    make restart                  - Redémarre Supabase local et l'application"
	@echo "    make reset                    - Reconstruit le Supabase local iso-prod (schéma + données + fichiers Storage)"
	@echo "    make pull-prod                - Télécharge les données SQL et les fichiers Storage depuis la prod"
	@echo "    make logs                     - Affiche les logs du conteneur applicatif"
	@echo "    make ps                       - Affiche l'état des conteneurs"
	@echo "    make shell                    - Ouvre un shell dans le conteneur de l'application"
	@echo "    make clean                    - Nettoie les conteneurs et volumes Docker"
	@echo ""
	@echo "  🗄️  Supabase Local :"
	@echo "    make supabase_start           - Démarre la stack Supabase locale (API :54321, Studio :54323, Mailpit :54324)"
	@echo "    make supabase_stop            - Arrête la stack Supabase locale"
	@echo "    make supabase_status          - Affiche le statut et les clés du Supabase local"
	@echo "    make supabase_ensure_buckets  - Crée les 7 buckets Storage en local s'ils n'existent pas"
	@echo "    make supabase_seed_storage    - Restaure les fichiers Storage de prod dans le Supabase local"
	@echo ""
	@echo "  ☁️  Supabase Production (projet lié) :"
	@echo "    make supabase_migrate         - Pousse les migrations locales vers la production"
	@echo "    make supabase_new name=...    - Crée un nouveau fichier de migration"
	@echo "    make supabase_diff name=...   - Génère une migration depuis les différences du schéma distant"
	@echo "    make supabase_functions_deploy- Déploie les 3 Edge Functions vers la production"

# Construit les images
build:
	$(COMPOSE) build

# Démarre Supabase local puis les conteneurs applicatifs
up:
	@$(MAKE) supabase_start
	$(COMPOSE) up -d
	@echo ""
	@echo "✅ Application démarrée !"
	@echo "   🌐 Site web        : http://localhost:3450"
	@echo "   🎛️  Supabase Studio : http://localhost:54323"
	@echo "   🔌 Supabase API    : http://127.0.0.1:54321"
	@echo "   📬 Mailpit (Inbucket) : http://localhost:54324"

# Arrête les conteneurs et Supabase local
down:
	$(COMPOSE) down
	@$(MAKE) supabase_stop
	@echo "✅ Stack arrêtée"

# Redémarre les conteneurs
restart:
	@$(MAKE) supabase_stop
	@$(MAKE) supabase_start
	$(COMPOSE) restart
	@echo "✅ Stack redémarrée"

# Affiche les logs
logs:
	$(COMPOSE) logs -f $(SERVICE)

# Ouvre un shell dans le conteneur de l'application
shell:
	$(COMPOSE) exec $(SERVICE) sh

# Affiche l'état des conteneurs
ps:
	$(COMPOSE) ps

# Nettoie les conteneurs, volumes et images
clean:
	$(COMPOSE) down -v --rmi local
	@echo "🧹 Nettoyage terminé"

# ==============================================================================
# Reconstruction Iso-Prod (Base + Storage + Edge Functions)
# ==============================================================================

# Télécharge le dump de données et les fichiers Storage depuis la prod
pull-prod:
	@echo "📥 Récupération des données et fichiers de la production..."
	npx tsx scripts/pull-prod.ts

# Reconstruit intégralement le Supabase local iso-prod
reset:
	@echo "🔄 Reconstruction complète du Supabase local iso-prod..."
	@if [ ! -f supabase/seed/prod_data_local.sql ] || [ ! -f supabase/seed/storage_manifest.json ]; then \
		echo "📥 Aucun snapshot local trouvé, téléchargement depuis la prod..."; \
		$(MAKE) pull-prod; \
	fi
	@$(MAKE) supabase_start
	@echo "🗄️  Réinitialisation de la base (migrations + données de prod)..."
	$(SUPABASE) db reset
	@$(MAKE) supabase_seed_storage
	@echo "✅ Supabase local reconstruit iso-prod avec succès !"

# ==============================================================================
# Commandes Supabase
# ==============================================================================

supabase_start:
	@echo "🚀 Démarrage de Supabase local..."
	$(SUPABASE) start
	@echo "✅ Supabase local démarré (Edge Functions actives sur http://127.0.0.1:54321/functions/v1/)"

supabase_stop:
	@echo "🛑 Arrêt de Supabase local..."
	$(SUPABASE) stop

supabase_status:
	$(SUPABASE) status

supabase_reset: reset

supabase_ensure_buckets:
	@echo "🪣 Vérification / création des buckets Storage (Supabase local)..."
	@eval "$$($(SUPABASE) status -o env 2>/dev/null | grep -E '^(API_URL|SERVICE_ROLE_KEY)=')" && \
	API_URL="$$API_URL" SERVICE_ROLE_KEY="$$SERVICE_ROLE_KEY" npm run ensure-buckets

supabase_seed_storage:
	@echo "📦 Import des fichiers Storage de prod dans Supabase local..."
	@eval "$$($(SUPABASE) status -o env 2>/dev/null | grep -E '^(API_URL|SERVICE_ROLE_KEY)=')" && \
	API_URL="$$API_URL" SERVICE_ROLE_KEY="$$SERVICE_ROLE_KEY" npm run seed-local

# Appliquer les migrations en attente sur la base distante (production)
supabase_migrate:
	@if [ -z "$(SUPABASE_ACCESS_TOKEN)" ]; then echo "❌ SUPABASE_ACCESS_TOKEN manquant dans .env"; exit 1; fi
	$(SUPABASE) db push

# Créer une nouvelle migration : make supabase_new name=ma_migration
supabase_new:
	@if [ -z "$(name)" ]; then echo "❌ Usage: make supabase_new name=nom_de_la_migration"; exit 1; fi
	$(SUPABASE) migration new $(name)

# Générer une migration depuis les diffs du schéma distant : make supabase_diff name=ma_migration
supabase_diff:
	@if [ -z "$(name)" ]; then echo "❌ Usage: make supabase_diff name=nom_de_la_migration"; exit 1; fi
	$(SUPABASE) db diff --linked -f $(name)

# Déployer les Edge Functions vers la prod
supabase_functions_deploy:
	@if [ -z "$(SUPABASE_ACCESS_TOKEN)" ]; then echo "❌ SUPABASE_ACCESS_TOKEN manquant dans .env"; exit 1; fi
	$(SUPABASE) functions deploy send-contact-email
	$(SUPABASE) functions deploy verify-turnstile
	$(SUPABASE) functions deploy admin-users
