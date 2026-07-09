# Shared Definitions

跨端共享类型定义和常量。

## 目录

- `api-types/` — 从 OpenAPI 自动生成的 TS 类型（**禁止手写**）
- `constants/` — 跨端常量（错误码、枚举）

## 引用方式

**Web 端：** pnpm workspace 引用
**UniApp 端：** Vite alias `@shared` 引用

---

## API 类型生成与更新

`api-types/index.ts` 由 [openapi-typescript](https://github.com/openapi-ts/openapi-typescript) 从 `docs/api/openapi.yaml` 自动生成。

### 前置条件

确保已安装 pnpm：
```bash
npm install -g pnpm
```

### 生成类型

**方式一：Make 命令（推荐）**
```bash
make generate-types
```

**方式二：直接执行脚本**
```bash
cd shared && pnpm install && pnpm run generate-types
```

### 校验类型是否同步

在 CI 或本地检查 `openapi.yaml` 变更后类型是否已重新生成：

```bash
make check-types
```

若类型过期，命令以非零退出码失败。

### 工作流程

1. 修改 `docs/api/openapi.yaml`（新增/修改 schema 或接口）
2. 运行 `make generate-types` 重新生成类型
3. 检查生成的 `shared/api-types/index.ts` 变更是否正确
4. 将 yaml 和生成的 ts 文件一起提交

### 生成规则

| 规则 | 说明 |
|------|------|
| 严禁手写 | `api-types/index.ts` 内容由工具生成，手动修改将在下次生成时被覆盖 |
| operationId 映射 | openapi.yaml 中每个 `operationId` 映射为 `operations` 命名空间下的请求/响应类型 |
| required 字段 | schema 中 `required` 数组内的字段在 TS 类型中为必填（无 `?`），非 required 字段为可选（带 `?`） |
| $ref 展开 | `$ref` 引用自动展开为对应的 TS 类型引用 |