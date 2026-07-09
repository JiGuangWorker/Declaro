.PHONY: help check-structure lint vet test-server build-server dev-server tidy-server check-all dev-web build-web dev-uniapp build-uniapp generate-types check-types

# 默认目标
help:
	@echo "Declaro - 统一命令入口"
	@echo ""
	@echo "  校验:"
	@echo "    make check-structure    目录结构校验"
	@echo "    make lint               代码静态分析（golangci-lint）"
	@echo "    make vet                Go 静态检查（go vet）"
	@echo "    make check-all          全量校验（lint + 结构 + 测试）"
	@echo ""
	@echo "  服务端:"
	@echo "    make test-server        运行服务端测试"
	@echo "    make build-server       构建服务端"
	@echo "    make dev-server         启动服务端开发模式"
	@echo "    make tidy-server        整理 go.mod 依赖"
	@echo ""
	@echo "  Web 端:"
	@echo "    make dev-web            启动 Web 开发模式"
	@echo "    make build-web          构建 Web 端"
	@echo ""
	@echo "  类型生成:"
	@echo "    make generate-types     从 openapi.yaml 生成 TS 类型"
	@echo "    make check-types       校验类型是否与 openapi.yaml 同步"
	@echo ""
	@echo "  UniApp 端:"
	@echo "    make dev-uniapp         启动 UniApp 开发模式"
	@echo "    make build-uniapp       构建 UniApp 端"

# ============================================================
# 目录结构校验
# ============================================================

# 必须存在的目录（新增约束只需追加一行）
REQUIRED_DIRS := \
	server web uniapp shared docs deploy \
	server/cmd/server server/internal/module server/internal/compositor \
	server/internal/middleware server/internal/router server/internal/config \
	server/pkg server/migrations server/config \
	web/packages \
	uniapp/packages uniapp/packages/app uniapp/packages/app/src \
	uniapp/packages/app/src/pages uniapp/packages/app/src/api \
	uniapp/packages/app/src/store uniapp/packages/shared uniapp/packages/shared/src \
	uniapp/tests \
	shared/api-types shared/constants \
	docs/prd docs/prd/mock docs/design docs/qa docs/references

# 必须存在的文件（新增约束只需追加一行）
REQUIRED_FILES := \
	README.md Makefile \
	server/cmd/server/main.go server/go.mod server/config/config.yaml \
	web/package.json web/pnpm-workspace.yaml web/tsconfig.base.json \
	uniapp/package.json uniapp/pnpm-workspace.yaml uniapp/tsconfig.base.json \
	uniapp/packages/app/src/pages.json uniapp/packages/app/src/manifest.json \
	uniapp/packages/app/src/App.vue uniapp/packages/app/src/main.ts \
	uniapp/packages/app/vite.config.ts uniapp/packages/app/tsconfig.json \
	shared/README.md shared/api-types/index.ts \
	docs/prd/README.md docs/design/README.md docs/qa/README.md docs/references/README.md

check-structure:
	@set -e; failed=0; \
	for d in $(REQUIRED_DIRS); do \
		if [ ! -d "$$d" ]; then echo "FAIL: missing directory: $$d/"; failed=1; fi; \
	done; \
	for f in $(REQUIRED_FILES); do \
		if [ ! -f "$$f" ]; then echo "FAIL: missing file: $$f"; failed=1; fi; \
	done; \
	if [ $$failed -ne 0 ]; then echo ""; echo "Structure check FAILED"; exit 1; fi; \
	echo "OK: all structure checks passed"

# ============================================================
# 代码静态分析
# ============================================================
lint:
	cd server && golangci-lint run ./...

vet:
	cd server && go vet ./...

# ============================================================
# 服务端
# ============================================================
test-server:
	cd server && go test ./...

build-server:
	cd server && go build -o bin/server ./cmd/server

dev-server:
	cd server && go run ./cmd/server

tidy-server:
	cd server && go mod tidy

# 全量校验门禁：CI 必须全绿才能进审/合并
check-all: check-structure lint vet test-server
	@echo "OK: all checks passed"

# ============================================================
# Web 端
# ============================================================
dev-web:
	cd web && pnpm dev

build-web:
	cd web && pnpm build

# ============================================================
# UniApp 端
# ============================================================
dev-uniapp:
	cd uniapp && pnpm dev

build-uniapp:
	cd uniapp && pnpm build

# ============================================================
# 类型生成（shared/api-types/）
# ============================================================
generate-types:
	cd shared && npm install && npm run generate-types

check-types:
	cd shared && npm install && npm run check-types
