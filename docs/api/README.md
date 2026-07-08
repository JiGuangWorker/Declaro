# API 文档

## 职责

定义前后端接口契约，是前后端并行开发的基础。

## 存放内容

- **openapi.yaml**：OpenAPI 3.0 规范文件，由 PRD GWT 场景映射生成
- 所有接口统一响应格式：`{ code: 0, msg: string, data: object }`
- 鉴权采用微信小程序 OpenID：前端 `wx.login()` 获取 code → 调 `POST /api/v1/auth/wx-login` 换取 session_token → 后续请求通过 `Authorization: Bearer <session_token>` 携带

## 边界

| 是 | 不是 |
|----|------|
| 接口路径、请求参数、响应格式定义 | 具体业务逻辑实现 |
| 前后端共同遵守的契约 | 单方面的前端或后端约定 |
| 与 PRD GWT 场景一一对应 | 脱离 PRD 随意添加接口 |

## 本期范围声明

- ✅ 覆盖用户侧接口：鉴权、模板查询、材料实例、步骤进度、表单填报、文件上传、AI 质检、导出管理
- ❌ **不覆盖**后台模板管理接口（`POST/PUT/DELETE /templates`、`PUT /templates/{id}/schema` 等）——本期 MVP 阶段模板由运营手动配置，后台管理接口在后续版本单独规划

## 使用方式

1. 将 `openapi.yaml` 导入 API Fox（项目设置 → 导入数据 → OpenAPI/Swagger → 选择文件）
2. 在 API Fox 中开启 Mock 服务，获取 Mock URL
3. Mock URL 发给前端，前端可立即开始开发
4. 后端按 `openapi.yaml` 中的响应 schema 实现接口
5. `shared/api-types/` 中的 TypeScript 类型必须从此文件生成，禁止手写：
   ```bash
   npx openapi-typescript docs/api/openapi.yaml -o shared/api-types/index.ts
   ```

## 接口分组

| 分组 | operationId 列表 |
|------|-------------------|
| 鉴权 | `wxLogin` |
| 模板管理 | `listTemplates` / `getTemplate` / `getTemplateSchema` |
| 材料实例 | `createMaterial` / `getMaterial` |
| 步骤进度 | `getStepProgress` / `gotoStep` |
| 表单填报 | `getFormData` / `saveFormData` / `validateField` |
| 文件上传 | `listFiles` / `uploadFile` / `replaceFile` / `deleteFile` |
| AI 质检 | `triggerQualityCheck` / `getQualityCheckResult` |
| 导出管理 | `createExportTask` / `listExportTasks` / `getExportTask` / `downloadExportFile` |

## 错误码段位规划

所有响应统一格式 `{ code, msg, data }`，`code=0` 表示成功，非 0 走业务码段位：

| 段位 | 业务域 | 示例 code | 示例含义 |
|------|--------|-----------|----------|
| `0` | 成功 | `0` | success |
| `1xxxx` | 鉴权/通用 | `10001` | 未授权或 token 已过期 |
| `2xxxx` | 步骤进度 | `20001` | 顺序推进模式下前置步骤未完成 |
| `3xxxx` | 文件上传 | `30001` | 已达到最大上传数量 |
| `4xxxx` | AI 质检 | `40001` | 检测失败（超时）<br>`40002` 并发超限 |
| `5xxxx` | 导出任务 | `50001` | 项目未完成无法导出<br>`50002` 文件尚未生成完成 |
| `9xxxx` | 系统级 | `90001` | 限流<br>`90002` 熔断 |

HTTP 状态码仅表传输层状态（如 401 未授权、404 资源不存在、429 限流、5xx 服务异常），业务码与 HTTP 码分离。新增业务错误码必须对号入座到对应段位。

## Form Schema 向后兼容规则

模板修改后必须遵循以下兼容规则，避免破坏存量材料实例：

| 变更类型 | 兼容策略 | 说明 |
|----------|----------|------|
| 新增字段 | ✅ 允许 | 旧实例显示空值，不阻塞提交 |
| 删除字段 | ✅ 允许 | 旧实例保留旧值，前端忽略不渲染 |
| 改名字段 | ❌ 禁止 | 必须新增字段并行，逐步迁移 |
| 改类型 | ❌ 禁止 | 必须升 `schema_version`（如 `1.0.0` → `1.1.0`），新旧实例各按各的版本渲染 |
| 改必填 | ⚠️ 谨慎 | 新增必填字段需给默认值，避免阻塞旧实例 |

`MaterialInstance.schema_version` 字段在创建时锁定，后端必须按此版本返回 schema，不能"漂移"到最新版本。

## 接口版本演进策略

- 接口路径前缀 `/api/v1/`，v2 上线时 v1 **至少保留 6 个月**并行
- v1 弃用前在响应 Header 加 `Deprecation: true` 和 `Sunset: <RFC1123 date>`
- 字段新增只能加在 `data` 末尾，禁止插队
- 字段类型变更必须升 schema_version，不允许在原字段上改

## 离线同步策略

- 前端优先本地存储（IndexedDB / 小程序 storage）
- 联网后**逐字段 PUT** 保存（调 `PUT /materials/{id}/steps/{step_id}/form`）
- **不提供**批量同步接口（避免事务复杂度，逐字段保存足够简单可靠）
- 网络中断时本地保留所有已填内容，恢复后自动重试 PUT

## Mock 服务器行为约定

业务部门联调时，Mock 服务器按以下规则响应：

| 场景 | Mock 行为 |
|------|----------|
| `POST /api/v1/auth/wx-login` | 任意非空 code 返回固定 session_token；任意非空 token 视为有效 |
| `POST /api/v1/materials/{id}/export` | 立即返回 `status: processing, progress: 0` |
| `GET /api/v1/export-tasks/{id}` 轮询 | 第 1 次返回 30%，第 2 次返回 70%，第 3 次返回 100% completed |
| `GET /api/v1/export-tasks` 列表 | 返回 3 条示例任务（不同状态各 1 条） |
| `POST /quality-check` | 延迟 5 秒返回，随机 passed / failed |
| `POST /files` 上传 | 忽略实际文件内容，返回固定 mock URL |
| `Authorization` Header 缺失 | 返回 401 + code=10001 |
| 超过 32 并发调用 `/quality-check` | 返回 429 + `Retry-After: 30` + code=40002 |
| `POST` 接口携带相同 `Idempotency-Key` | 返回首次响应结果，不重复执行业务逻辑 |
| 超过限流配额（见下方限流策略） | 返回 429 + `Retry-After` + `X-RateLimit-*` Header + code=90001 |

## 数据隔离

- 所有业务接口通过 OpenID 隔离，不同用户的材料实例互不可见
- 后端从 session_token 解析 OpenID，跨用户访问返回 403
- Mock 服务器可对不同 token 返回不同数据集，便于联调验证

## 限流策略

### 限流维度

按 `OpenID + 接口` 双维度限流，防止单用户滥用：

| 接口类别 | 配额（建议值，后端可调） | 超限响应 |
|---------|------------------------|---------|
| `POST /auth/wx-login` | 10 次/分钟 | 429 + code=90001 |
| `POST /materials`（创建实例） | 10 次/分钟 | 429 + code=90001 |
| `POST /files`（上传） | 30 次/分钟 | 429 + code=90001 |
| `POST /quality-check` | 32 并发（全局） | 429 + code=40002 |
| `POST /export` | 5 次/分钟 | 429 + code=90001 |
| 其他 GET / PUT / DELETE | 60 次/分钟 | 429 + code=90001 |

### 限流响应头

所有限流响应（429）必须携带以下标准 Header，便于前端实现重试退避：

| Header | 说明 | 示例 |
|--------|------|------|
| `Retry-After` | 建议重试等待秒数 | `30` |
| `X-RateLimit-Limit` | 当前接口配额（每分钟最大请求数） | `60` |
| `X-RateLimit-Remaining` | 当前窗口剩余可用请求数 | `0` |
| `X-RateLimit-Reset` | 限流窗口重置时间（Unix 时间戳，秒） | `1720466400` |

### 前端重试策略

- 收到 429 后必须等待 `Retry-After` 秒数再重试，**禁止立即重试**
- 建议采用指数退避（1s → 2s → 4s → 8s），最大重试 3 次
- 超过最大重试次数后向用户展示"网络繁忙，请稍后再试"提示

## 幂等性

### 适用接口

仅 **POST 创建类**接口需要幂等性保护，防止网络重试导致重复创建：

| 接口 | 是否需要 | 原因 |
|------|---------|------|
| `POST /auth/wx-login` | ❌ 不需要 | 同一 code 5 分钟内天然返回相同 token |
| `POST /materials` | ✅ 需要 | 防止重复点击创建多份材料实例 |
| `POST /materials/{id}/steps/{step_id}/goto` | ❌ 不需要 | 跳转是幂等操作 |
| `POST /materials/{id}/steps/{step_id}/validate` | ❌ 不需要 | 校验是幂等操作 |
| `POST /materials/{id}/steps/{step_id}/files` | ✅ 需要 | 防止重传生成重复文件 |
| `POST /materials/{id}/steps/{step_id}/quality-check` | ✅ 需要 | 防止重复触发质检任务 |
| `POST /materials/{id}/export` | ✅ 需要 | 防止重复创建导出任务 |

### Idempotency-Key 使用约定

- **客户端**：每次发起上述 POST 请求时，生成 UUID v4 放入 `Idempotency-Key` Header
- **服务端**：以 `(OpenID, Idempotency-Key)` 为键记录首次响应结果，24 小时内相同键的请求直接返回首次结果（不重复执行业务逻辑）
- **键格式**：UUID v4，正则校验 `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`
- **键失效**：24 小时后自动失效，可重新使用
- **Mock 行为**：Mock 服务器记录最近 100 个 Idempotency-Key，相同键返回首次结果

### 示例

```http
POST /api/v1/materials HTTP/1.1
Authorization: Bearer eyJhbGciOi...
Idempotency-Key: a3f4b8c2-1d5e-4f7a-9b6c-8e2d1f9a0b3c
Content-Type: application/json

{
  "template_id": "tpl_pesticide_001"
}
```

网络重试时携带**相同的** Idempotency-Key，后端返回首次创建的 material_id，不会创建新实例。

## 负责人

后端 + 前端共同维护
