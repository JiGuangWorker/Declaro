// Copyright (c) 2026 Declaro. All rights reserved.

// Package middleware 提供路由级中间件：鉴权、日志、限流、跨域等。
package middleware

import (
	"errors"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/declaro/server/pkg/errcode"
	"github.com/declaro/server/pkg/response"
)

const (
	// CtxKeyOpenID JWT 中间件注入的 OpenID 键。service/repository 通过 OpenID(c) 取用。
	CtxKeyOpenID = "ctx_openid"
	bearerPrefix = "Bearer "
)

// Claims JWT 载荷。OpenID 是数据隔离的唯一用户标识。
type Claims struct {
	OpenID string `json:"openid"`
	jwt.RegisteredClaims
}

// SignToken 签发 session_token。expire 单位为秒。
func SignToken(secret, issuer, openid string, expire int) (string, error) {
	now := time.Now()
	claims := Claims{
		OpenID: openid,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(expire) * time.Second)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString([]byte(secret))
}

// JWT 鉴权中间件。对齐 openapi BearerAuth：
//   - 未带 token / 签名无效 → 401 + code 10001
//   - token 过期 → 401 + code 10002
//
// 鉴权接口（如 wx-login）通过路由组不挂此中间件实现 security:[] 豁免。
func JWT(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if !strings.HasPrefix(auth, bearerPrefix) {
			response.AbortError(c, errcode.ErrUnauthorized)
			return
		}
		tokenStr := strings.TrimPrefix(auth, bearerPrefix)

		claims := &Claims{}
		tok, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrTokenSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil {
			if errors.Is(err, jwt.ErrTokenExpired) {
				response.AbortError(c, errcode.ErrTokenExpired)
				return
			}
			response.AbortError(c, errcode.ErrUnauthorized)
			return
		}
		if !tok.Valid || claims.OpenID == "" {
			response.AbortError(c, errcode.ErrUnauthorized)
			return
		}

		c.Set(CtxKeyOpenID, claims.OpenID)
		c.Next()
	}
}

// OpenID 从 gin.Context 取出当前用户 OpenID。未鉴权场景返回空串。
// service/repository 调用此函数获取数据隔离谓词，禁止信任请求体里的 openid 字段。
func OpenID(c *gin.Context) string {
	if v, ok := c.Get(CtxKeyOpenID); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
