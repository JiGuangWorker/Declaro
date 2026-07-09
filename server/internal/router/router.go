// Copyright (c) 2026 Declaro. All rights reserved.

// Package router 负责路由注册与中间件挂载。
//
// 路由分两组：
//   - pub：公开路由（对齐 openapi security:[]），如 health、wx-login
//   - biz：受保护路由（对齐 openapi 全局 BearerAuth），挂 JWT 中间件
//
// 新增接口：在对应分组内 `pub/biz.METHOD(path, response.Wrap(c.<Module>.<Method>))`。
package router

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/declaro/server/internal/compositor"
	"github.com/declaro/server/internal/config"
	"github.com/declaro/server/internal/middleware"
	"github.com/declaro/server/pkg/response"
)

// New 构建 gin.Engine，挂全局中间件并注册全部路由。
func New(cfg *config.Config, c *compositor.Compositor, logger *zap.Logger) *gin.Engine {
	gin.SetMode(cfg.Server.Mode)
	r := gin.New()

	// 全局中间件：顺序为 RequestID → CORS → Recovery → Logger
	r.Use(
		middleware.RequestID(),
		middleware.CORS(),
		middleware.Recovery(logger),
		middleware.Logger(logger),
	)

	// ===== 公开路由（security: []，豁免鉴权）=====
	pub := r.Group("/api/v1")
	pub.GET("/health", response.Wrap(c.Health.Check))
	pub.POST("/auth/wx-login", response.Wrap(c.Auth.WxLogin))

	// ===== 受保护路由（全局 BearerAuth）=====
	// 后续模块按 openapi.yaml tag 逐步挂载到 biz 组，注册方式：
	//   biz.GET("/templates", response.Wrap(c.Template.List))
	// 待接入路由清单（对齐 openapi operationId）：
	//   - 模板管理 #6: GET /templates, GET /templates/:id, GET /templates/:id/schema
	//   - 材料实例 #7: POST /materials, GET /materials/:id
	//   - 步骤进度 #8: GET /materials/:id/progress, POST /materials/:id/steps/:sid/goto
	//   - 表单填报 #10: GET|PUT /materials/:id/steps/:sid/form, POST .../validate
	//   - 文件上传 #12: GET|POST|PUT|DELETE /materials/:id/steps/:sid/files[/:fid]
	//   - AI 质检 #14: POST|GET /materials/:id/steps/:sid/quality-check
	//   - 导出管理 #16: POST /materials/:id/export, GET /export-tasks[/:tid[/download]]
	biz := r.Group("/api/v1")
	biz.Use(middleware.JWT(cfg.JWT.Secret))

	return r
}
