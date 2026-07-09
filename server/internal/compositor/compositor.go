// Copyright (c) 2026 Declaro. All rights reserved.

// Package compositor 负责依赖组装：把 DB/Redis/Config/Logger 注入各 module，
// 并按 repository → service → handler 顺序完成三层装配。
//
// 新增 module 时只需两步：
//  1. 在 Compositor 增加字段，在 New 中按顺序装配；
//  2. 在 router.New 中注册该 module 的路由。
package compositor

import (
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/declaro/server/internal/config"
	"github.com/declaro/server/internal/module/auth"
	"github.com/declaro/server/internal/module/health"
)

// Compositor 聚合所有 module 的 handler，供 router 统一注册路由。
type Compositor struct {
	Health *health.Handler
	Auth   *auth.Handler

	// 后续模块按 openapi tag 逐步挂载：
	// Template / Material / Step / Form / File / Quality / Export
}

// New 装配全部 module。各模块通过自身的 New() 完成 repo → service → handler 内部装配，
// compositor 只负责按依赖顺序调用并持有 handler 引用。
func New(cfg *config.Config, db *gorm.DB, rdb *redis.Client, logger *zap.Logger) *Compositor {
	return &Compositor{
		Health: health.NewHandler(db, rdb),
		Auth:   auth.New(cfg, db, logger),
	}
}
