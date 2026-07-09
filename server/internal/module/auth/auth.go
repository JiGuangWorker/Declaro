// Copyright (c) 2026 Declaro. All rights reserved.

// Package auth 鉴权模块：微信小程序登录、session_token 签发。
//
// 本模块采用子包按层拆分，父包负责依赖装配，compositor 只需导入本包：
//
//	auth/model       —— 数据实体（GORM model）
//	auth/repository  —— 数据访问层（仅与 DB 交互，不含业务规则）
//	auth/service     —— 业务逻辑层（不依赖 gin，只收 context.Context）
//	auth/handler     —— HTTP 层（解析入参、调 service、组装出参）
//
// 装配顺序：repository → service → handler。
// 抄写步骤见 server/internal/module/README.md。
package auth

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/declaro/server/internal/config"
	"github.com/declaro/server/internal/module/auth/handler"
	"github.com/declaro/server/internal/module/auth/repository"
	"github.com/declaro/server/internal/module/auth/service"
)

// Handler 是 auth 模块对外暴露的 handler 类型别名，供 compositor/router 引用，
// 避免外部包直接导入 auth/handler 子包。
type Handler = handler.Handler

// New 装配 auth 模块：repo → service → handler。
// 调用方只需此一个入口，无需感知内部分层。
func New(cfg *config.Config, db *gorm.DB, logger *zap.Logger) *handler.Handler {
	repo := repository.New(db)
	svc := service.New(repo, cfg, logger)
	return handler.New(svc)
}
