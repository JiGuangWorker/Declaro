// Copyright (c) 2026 Declaro. All rights reserved.

// Package health 提供服务自检接口，供 k8s/部署探针与运维监控使用。
package health

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Handler 健康检查 handler。只读依赖，无 service/repository 分层必要。
type Handler struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewHandler(db *gorm.DB, rdb *redis.Client) *Handler {
	return &Handler{db: db, rdb: rdb}
}

// Status 自检结果。status=ok 表示全部依赖正常；degraded 表示部分降级。
type Status struct {
	Status string `json:"status"` // ok / degraded
	DB     string `json:"db"`     // ok / fail / skip
	Redis  string `json:"redis"`  // ok / fail / skip
	Time   string `json:"time"`
}

// Check GET /api/v1/health
// 探针友好的实现：始终返回 200，细节在 body；如需严格探针可改为 503。
func (h *Handler) Check(c *gin.Context) (interface{}, error) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	st := Status{Status: "ok", Time: time.Now().Format(time.RFC3339)}

	if h.db != nil {
		sqlDB, err := h.db.DB()
		if err == nil && sqlDB.PingContext(ctx) == nil {
			st.DB = "ok"
		} else {
			st.DB = "fail"
			st.Status = "degraded"
		}
	} else {
		st.DB = "skip"
	}

	if h.rdb != nil {
		if h.rdb.Ping(ctx).Err() == nil {
			st.Redis = "ok"
		} else {
			st.Redis = "fail"
			st.Status = "degraded"
		}
	} else {
		st.Redis = "skip"
	}

	return st, nil
}
