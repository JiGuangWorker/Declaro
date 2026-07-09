# Module 编写规范

> 本文件是后端业务模块的编写指南。新增模块前先通读，照 `auth/` 样板抄写。
> 对齐 `docs/design/task-breakdown-v1.0.0.md` 与 `docs/api/openapi.yaml`。

## 1. 目录约定

每个业务模块位于 `server/internal/module/<name>/`，按 openapi.yaml 的 tag 划分：

| 模块 | 对应 openapi tag | 目录 | 对应 Issue |
|------|------------------|------|-----------|
| auth | 鉴权 | `auth/` | #4 |
| template | 模板管理 | `template/` | #6 |
| material | 材料实例 | `material/` | #7 |
| step | 步骤进度 | `step/` | #8 |
| form | 表单填报 | `form/` | #10 |
| file | 文件上传 | `file/` | #12 |
| quality | AI质检 | `quality/` | #14 |
| export | 导出管理 | `export/` | #16 |

每个模块按层拆为子包，父包 `<name>.go` 负责装配：

```
module/<name>/
├── <name>.go        # package <name>    — New() 装配三层 + Handler 类型别名
├── model/           # package model      — 数据实体（GORM model）
├── repository/      # package repository — 数据访问层（仅与 DB 交互）
├── service/         # package service    — 业务逻辑层（不依赖 gin）
└── handler/         # package handler    — HTTP 层（解析入参、调 service）
```

> **为什么子包 + 父包封装**：模块复杂后单文件撑不住，按层拆子包可独立扩展；
> 父包 `New()` 收口装配，`compositor` 只导入父包（唯一命名），避免 8 个模块的 `model`/`repository` 同名包冲突。
> 模块极简时（如 health 只读自检）可只保留单个 `handler.go`，不必强凑四层。

## 2. 分层职责

| 层 | 职责 | 允许依赖 | 禁止 |
|----|------|----------|------|
| model | 定义实体与表名 | gorm | 业务逻辑、DB 操作 |
| repository | CRUD、查询谓词 | gorm、model | 业务规则、gin、返回业务错误码 |
| service | 业务规则、编排、外部调用 | repository、model、config、errcode、middleware(仅工具) | gin、直接操作 DB |
| handler | 入参解析、调 service、返回 (data,error) | gin、service、errcode、response | 业务规则、直接 DB、直接 c.JSON |

**核心红线：**

- **service 不依赖 gin**：方法签名收 `context.Context`，不收 `*gin.Context`。这样可单测、可复用。
- **handler 不直接 c.JSON**：返回 `(data, error)`，由 `response.Wrap` 统一翻译响应。
- **repository 不含业务规则**：只做数据读写，错误用原生 error 向上抛，由 service 转成 `*errcode.Error`。
- **禁止跨层调用**：handler 不直接调 repository；service 不直接操作 DB（通过 repository）。

## 3. 新增模块步骤（以 template 为例）

### 步骤 1：创建子包目录与父包

```
server/internal/module/template/
├── template.go      # package template — New() 装配 + Handler 类型别名
├── model/
│   └── template.go  # package model — Template 实体
├── repository/
│   └── repository.go # package repository
├── service/
│   └── service.go   # package service
└── handler/
    └── handler.go   # package handler
```

照 `auth/` 抄写，改包名、改实体、改方法。各子包内文件可按实体拆分（如 `model/user.go`、`model/session.go`）以支撑复杂场景。model 实体字段对齐 openapi.yaml 中对应 schema（如 `Template`）。

父包 `template.go` 固定写法：

```go
package template

import (
    "gorm.io/gorm"
    "go.uber.org/zap"
    "github.com/declaro/server/internal/config"
    "github.com/declaro/server/internal/module/template/handler"
    "github.com/declaro/server/internal/module/template/repository"
    "github.com/declaro/server/internal/module/template/service"
)

// Handler 对外暴露的 handler 类型别名，避免外部包直接导入 handler 子包。
type Handler = handler.Handler

// New 装配 template 模块：repo → service → handler。
func New(cfg *config.Config, db *gorm.DB, logger *zap.Logger) *handler.Handler {
    repo := repository.New(db)
    svc := service.New(repo, cfg, logger)
    return handler.New(svc)
}
```

### 步骤 2：在 compositor 装配

`server/internal/compositor/compositor.go`，只需导入父包并调用 `New()`：

```go
import "github.com/declaro/server/internal/module/template"

type Compositor struct {
    Health   *health.Handler
    Auth     *auth.Handler
    Template *template.Handler   // 新增
}

func New(cfg *config.Config, db *gorm.DB, rdb *redis.Client, logger *zap.Logger) *Compositor {
    return &Compositor{
        Health:   health.NewHandler(db, rdb),
        Auth:     auth.New(cfg, db, logger),
        Template: template.New(cfg, db, logger),   // 新增
    }
}
```

### 步骤 3：在 router 注册路由

`server/internal/router/router.go`，在 `biz` 组内（需鉴权的接口）：

```go
biz := r.Group("/api/v1")
biz.Use(middleware.JWT(cfg.JWT.Secret))
{
    biz.GET("/templates", response.Wrap(c.Template.List))
    biz.GET("/templates/:template_id", response.Wrap(c.Template.Get))
}
```

> 公开接口（如登录、健康检查）放 `pub` 组；需鉴权接口放 `biz` 组。与 openapi.yaml 的 `security` 声明一一对应。

### 步骤 4：自测 + 提交

```bash
make vet            # 静态检查
make build-server   # 编译
make dev-server     # 启动，curl 验证接口
```

提交 PR 标注 `Closes #Issue编号`。

## 4. 数据隔离（OpenID）

基于 OpenID 的 DataScope 是硬约束，跨用户访问必须 403。

**获取 OpenID**（handler 层）：

```go
func (h *Handler) Get(c *gin.Context) (interface{}, error) {
    openid := middleware.OpenID(c)   // 从 JWT 注入，禁止信任请求体字段
    return h.svc.Get(c.Request.Context(), openid, c.Param("material_id"))
}
```

**传递与查询**（service → repository，跨子包引用用 `model.` 限定）：

```go
// service/service.go — 把 openid 显式传给 repository
func (s *Service) Get(ctx context.Context, openid, id string) (*model.Material, error) {
    m, err := s.repo.FindByID(ctx, openid, id)
    if err != nil { return nil, errcode.ErrDBOperation }
    if m == nil { return nil, errcode.ErrNotFound }
    return m, nil
}

// repository/repository.go — 查询必须带 openid 谓词
func (r *Repository) FindByID(ctx context.Context, openid, id string) (*model.Material, error) {
    var m model.Material
    err := r.db.WithContext(ctx).
        Where("openid = ? AND id = ?", openid, id).   // 双谓词，缺一不可
        First(&m).Error
    if errors.Is(err, gorm.ErrRecordNotFound) { return nil, nil }
    return &m, err
}
```

**红线：**

- OpenID 只从 `middleware.OpenID(c)` 取，**永远不接受请求体/查询参数里的 openid**。
- 所有用户数据查询必须带 `WHERE openid = ?`。
- 跨用户访问返回 `errcode.ErrForbidden`（403 + code 10003）。

## 5. 错误处理

- service/repository 返回 `*errcode.Error`（用预定义常量），不要返回裸 `errors.New`。
- 同一错误码不同上下文：用 `errcode.ErrXxx.WithMsg("具体文案")`。
- 新增错误码：到 `pkg/errcode/errcode.go` 对应段位（1xxxx/2xxxx/...）补常量，不要复用已有码。
- handler 不需要处理 error，直接向上返回，`response.Wrap` 会统一翻译。

```go
// 正确
return nil, errcode.ErrNotFound.WithMsg("模板不存在")
return nil, errcode.ErrStepNotCompleted   // 直接用预定义

// 错误
return nil, errors.New("not found")       // 会被脱敏成 90000，丢失语义
return nil, fmt.Errorf("...")             // 同上
```

## 6. 响应约定

- handler 签名固定：`func (h *Handler) X(c *gin.Context) (interface{}, error)`。
- 路由注册固定：`biz.GET("/path", response.Wrap(c.Mod.X))`。
- 成功：返回 `(data, nil)` → `{"code":0,"msg":"ok","data":...}`。
- 失败：返回 `(nil, err)` → `{"code":<业务码>,"msg":"..."}` + 对应 HTTP 状态码。
- 创建类接口如需 201：handler 内无法直接控制，统一用 200 + code=0 即可（openapi 已对齐）。

## 7. 入参校验

- 用 Gin 的 `ShouldBindJSON` / `ShouldBindQuery` + struct tag `binding:"required"` 等。
- 校验失败返回 `errcode.ErrValidation.WithMsg(err.Error())`。
- 自定义类型（phone/id_card）用 `pkg/validator` 注册的 tag。

```go
type CreateInput struct {
    TemplateID string `json:"template_id" binding:"required"`
    Phone      string `json:"phone" binding:"omitempty,phone"`
}
```

## 8. 抄写清单

新增模块时照 `auth/` 抄，改这几处即可：

1. 父包 `<name>.go`：包名 `auth` → `<name>`，`New()` 内部装配保持不变
2. `model/` 子包：`User` 实体 → 对应 schema 实体（复杂时可拆多文件）
3. `repository/` 子包：`Repository` 方法 → 该模块的 CRUD
4. `service/` 子包：`Service` 业务方法 → 对应 openapi operationId
5. `handler/` 子包：`Handler` 方法 → 对应 HTTP 路由
6. compositor 加字段 + `New()` 调用
7. router 加路由

## 9. 参考

- 样板模块：[auth/](auth/)、[health/](health/)
- 错误码：[pkg/errcode/errcode.go](../../pkg/errcode/errcode.go)
- 统一响应：[pkg/response/response.go](../../pkg/response/response.go)
- 鉴权中间件：[internal/middleware/jwt.go](../middleware/jwt.go)
- 依赖组装：[internal/compositor/compositor.go](../compositor/compositor.go)
- 路由注册：[internal/router/router.go](../router/router.go)
- 任务拆解：[docs/design/task-breakdown-v1.0.0.md](../../../docs/design/task-breakdown-v1.0.0.md)
- 接口契约：[docs/api/openapi.yaml](../../../docs/api/openapi.yaml)
