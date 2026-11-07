# Команды для polka: Nuxt + API (Nitro) + Cloudflare D1 в одном воркере.
#
# Интерактивные шаги (login, secret) автоматизировать нельзя — они вынесены
# в отдельные цели и просто подсказывают, что сделать.
#
# wrangler/miniflare на macOS пишут в ~/Library/Preferences/.wrangler, куда
# часто нет прав (EPERM), поэтому XDG_CONFIG_HOME уводится внутрь проекта.

SHELL := /bin/bash
.DEFAULT_GOAL := help

XDG := XDG_CONFIG_HOME=$(CURDIR)/.wrangler/config/xdg
# Временный файл для разбора JSON от wrangler (чистится make clean).
TMP_JSON := $(CURDIR)/.wrangler/d1.json
WRANGLER := $(XDG) npx wrangler
DB_NAME := polka-db
WRANGLER_CFG := wrangler.jsonc
# Куда кладём готовые инсталляторы для раздачи (папка в .gitignore).
BUILD_DIR := $(CURDIR)/apps/build
DMG_DIR := $(CURDIR)/apps/desktop/src-tauri/target/release/bundle/dmg

.PHONY: help install dev build check migrate deploy-local db-create db-id migrate-remote secret ship setup clean dmg app

help: ## Показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости (один lock в корне)
	npm install

dev: ## Dev-сервер: http://localhost:3000 (API и D1 через cloudflare-dev)
	npm run dev

build: ## Собрать воркер → app/.output
	npm run build

check: ## Проверка типов
	npm run typecheck

migrate: ## Применить миграции к локальной D1
	npm run d1:migrate

deploy-local: build ## Собрать и проверить бандл без деплоя (wrangler deploy --dry-run)
	$(WRANGLER) deploy --dry-run

db-id: ## Показать database_id из wrangler.jsonc и реальные id из аккаунта
	@echo "в $(WRANGLER_CFG):"
	@grep -o '"database_id": "[^"]*"' $(WRANGLER_CFG) || true
	@echo "в аккаунте:"
	@$(WRANGLER) d1 list --json 2>/dev/null > $(TMP_JSON); \
	node -e 'const fs=require("fs");let l=[];try{l=JSON.parse(fs.readFileSync("$(TMP_JSON)","utf8")||"[]")}catch{};if(!Array.isArray(l)||!l.length)console.log("  (пусто или нет авторизации: make login)");else l.forEach(x=>console.log("  "+x.name+"  "+x.uuid))' 

db-create: ## Создать D1 в аккаунте (если нет) и вписать database_id в wrangler.jsonc
	@$(WRANGLER) d1 list --json 2>/dev/null > $(TMP_JSON); \
	id=$$(node -e 'const fs=require("fs");let l=[];try{l=JSON.parse(fs.readFileSync("$(TMP_JSON)","utf8")||"[]")}catch{};const f=(Array.isArray(l)?l:[]).find(x=>x.name===process.argv[1]);console.log(f?f.uuid:"")' $(DB_NAME)); \
	if [ -z "$$id" ]; then \
		echo "→ создаю $(DB_NAME)"; \
		out=$$($(WRANGLER) d1 create $(DB_NAME) 2>&1); echo "$$out"; \
		id=$$(echo "$$out" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1); \
	fi; \
	if [ -z "$$id" ]; then echo "✖ не удалось получить database_id (нужен make login)"; exit 1; fi; \
	if grep -q "\"database_id\": \"$$id\"" $(WRANGLER_CFG); then \
		echo "✔ database_id уже прописан: $$id"; \
	else \
		cp $(WRANGLER_CFG) $(WRANGLER_CFG).bak; \
		sed -E -i '' "s/\"database_id\": \"[^\"]*\"/\"database_id\": \"$$id\"/" $(WRANGLER_CFG); \
		echo "✔ database_id записан в $(WRANGLER_CFG): $$id"; \
		echo "  (бэкап: $(WRANGLER_CFG).bak)"; \
	fi

migrate-remote: ## Применить миграции к боевой D1
	$(WRANGLER) d1 migrations apply $(DB_NAME) --remote

secret: ## Положить ключ OpenRouter в секреты воркера (спросит значение)
	$(WRANGLER) secret put OPENROUTER_KEY

login: ## Вход в Cloudflare (интерактивно, в браузере)
	$(WRANGLER) login

setup: install db-create migrate ## С нуля: зависимости + база + локальные миграции
	@echo
	@echo "Дальше (по порядку):"
	@echo "  1) make login          — если ещё не вошли в Cloudflare"
	@echo "  2) make migrate-remote — миграции в боевую базу"
	@echo "  3) make secret         — OPENROUTER_KEY в секреты воркера"
	@echo "  4) make ship           — проверка + сборка + деплой"

dmg: ## Собрать .dmg для macOS (arm64) и положить в apps/build
	@# `tauri build` сам пересоберёт статику фронта (beforeBuildCommand).
	cd apps/desktop && npx tauri build --bundles dmg
	@mkdir -p "$(BUILD_DIR)"
	@cp "$(DMG_DIR)"/*.dmg "$(BUILD_DIR)/"
	@echo "✔ готово:"
	@ls -lh "$(BUILD_DIR)"/*.dmg

app: ## Собрать .app для macOS (arm64) без .dmg
	cd apps/desktop && npx tauri build --bundles app
	@echo "✔ $(CURDIR)/apps/desktop/src-tauri/target/release/bundle/macos/Полка.app"

ship: check build ## Проверки + сборка + деплой на Cloudflare
	$(WRANGLER) deploy

clean: ## Удалить артефакты сборки и локальное состояние D1
	rm -rf app/.output app/.nuxt .wrangler/state $(TMP_JSON)
