SHELL := /bin/bash

# Référence du projet Supabase (cf. VITE_SUPABASE_URL dans .env)
SUPABASE_PROJECT_REF := edpfmcafuyjskzflwvnw

# Token d'accès lu depuis .env (Personal Access Token Supabase)
SUPABASE_ACCESS_TOKEN := $(shell grep -E '^SUPABASE_ACCESS_TOKEN=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
export SUPABASE_ACCESS_TOKEN

.PHONY: help supabase_migrate supabase_status supabase_new supabase_diff

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

define _require_token
	@test -n "$(SUPABASE_ACCESS_TOKEN)" || { echo "❌ SUPABASE_ACCESS_TOKEN manquant dans .env"; exit 1; }
	@npx supabase link --project-ref $(SUPABASE_PROJECT_REF) >/dev/null
endef

supabase_migrate: ## Applique les migrations locales en attente sur la prod
	$(call _require_token)
	npx supabase db push

supabase_status: ## Affiche l'état des migrations (local vs prod)
	$(call _require_token)
	npx supabase migration list

supabase_new: ## Crée une nouvelle migration vide : make supabase_new name=ma_migration
	@test -n "$(name)" || { echo "❌ Usage: make supabase_new name=ma_migration"; exit 1; }
	npx supabase migration new $(name)

supabase_diff: ## Génère une migration depuis les diffs du schéma distant : make supabase_diff name=ma_migration
	$(call _require_token)
	@test -n "$(name)" || { echo "❌ Usage: make supabase_diff name=ma_migration"; exit 1; }
	npx supabase db diff --linked -f $(name)
