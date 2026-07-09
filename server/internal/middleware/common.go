// Copyright (c) 2026 Declaro. All rights reserved.

package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/declaro/server/pkg/errcode"
	"github.com/declaro/server/pkg/response"
)

const (
	// CtxKeyRequestID 请求追踪 ID 键。
	CtxKeyRequestID = "ctx_request_id"
	headerRequestID = "X-Request-Id"
)

// RequestID 为每个请求注入唯一追踪 ID。优先沿用客户端传入的 X-Request-Id。
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := c.GetHeader(headerRequestID)
		if rid == "" {
			rid = uuid.NewString()
		}
		c.Set(CtxKeyRequestID, rid)
		c.Header(headerRequestID, rid)
		c.Next()
	}
}

// RequestIDOf 从 context 读取请求 ID。
func RequestIDOf(c *gin.Context) string {
	if v, ok := c.Get(CtxKeyRequestID); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// Recovery 兜底 panic，记录堆栈并返回系统内部异常，避免进程崩溃。
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				if logger != nil {
					logger.Error("panic recovered",
						zap.Any("recover", rec),
						zap.String("method", c.Request.Method),
						zap.String("path", c.Request.URL.Path),
						zap.String("request_id", RequestIDOf(c)),
					)
				}
				response.AbortError(c, errcode.ErrInternal)
			}
		}()
		c.Next()
	}
}

// Logger 访问日志。记录方法、路径、状态码、耗时、请求 ID。
func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		if logger == nil {
			return
		}
		logger.Info("request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Int("size", c.Writer.Size()),
			zap.Duration("latency", time.Since(start)),
			zap.String("request_id", RequestIDOf(c)),
		)
	}
}

// CORS 跨域。v1.0.0 主要服务小程序；v1.1.0 web 后台启用后按需收紧白名单。
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization,Content-Type,Idempotency-Key,X-Request-Id")
		c.Header("Access-Control-Expose-Headers", "X-Request-Id,Retry-After,X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
