// Copyright (c) 2026 Declaro. All rights reserved.

// Command server 启动 Declaro 后端服务。
//
// 启动链路：加载配置 → 初始化日志 → 连接 DB/Redis → 组装 module → 注册路由 → 启动 HTTP。
// DB/Redis 连接失败不阻断启动（仅 warn），依赖它们的模块运行时不可用，health 接口仍可用。
// 这样开发期无需全部中间件即可拉起服务查看 /health。
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/declaro/server/internal/compositor"
	"github.com/declaro/server/internal/config"
	"github.com/declaro/server/internal/router"
)

func main() {
	// 1. 加载配置（默认 config/config.yaml，可用 DECLARO_CONFIG 覆盖）
	cfgPath := "config/config.yaml"
	if p := os.Getenv("DECLARO_CONFIG"); p != "" {
		cfgPath = p
	}
	cfg, err := config.Load(cfgPath)
	if err != nil {
		fmt.Printf("load config failed: %v\n", err)
		os.Exit(1)
	}

	// 2. 初始化日志
	logger, err := config.NewLogger(&cfg.Log)
	if err != nil {
		fmt.Printf("init logger failed: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = logger.Sync() }()

	// 3. 连接 DB（失败不阻断启动）
	db, err := config.NewDB(&cfg.Database, cfg.Server.Mode)
	if err != nil {
		logger.Warn("connect db failed; DB-dependent modules unavailable at runtime", zap.Error(err))
		db = nil
	} else {
		logger.Info("db connected")
	}

	// 4. 连接 Redis（失败不阻断启动）
	rdb, err := config.NewRedis(&cfg.Redis)
	if err != nil {
		logger.Warn("connect redis failed; Redis-dependent features unavailable at runtime", zap.Error(err))
		rdb = nil
	} else {
		logger.Info("redis connected")
	}

	// 5. 组装 module（依赖注入）
	comp := compositor.New(cfg, db, rdb, logger)

	// 6. 注册路由
	engine := router.New(cfg, comp, logger)

	// 7. 启动 HTTP 服务（支持优雅关闭）
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      engine,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	go func() {
		logger.Info("server starting", zap.Int("port", cfg.Server.Port), zap.String("mode", cfg.Server.Mode))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server listen failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server shutdown error", zap.Error(err))
	}
	logger.Info("server exited")
}
