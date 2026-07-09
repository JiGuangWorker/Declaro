// Copyright (c) 2026 Declaro. All rights reserved.

// Package handler 提供 auth 模块的 HTTP 层。
// 只做：解析入参 → 调 service → 返回 (data, error)。
// 不写业务规则、不直接操作 DB、不直接 c.JSON（交给 response.Wrap 统一处理）。
package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/declaro/server/internal/module/auth/service"
	"github.com/declaro/server/pkg/errcode"
)

// Handler auth 模块 HTTP handler。
type Handler struct {
	svc *service.Service
}

// New 构造 Handler。
func New(svc *service.Service) *Handler { return &Handler{svc: svc} }

// WxLogin POST /api/v1/auth/wx-login （security: [] 豁免鉴权）
func (h *Handler) WxLogin(c *gin.Context) (interface{}, error) {
	var in service.WxLoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, errcode.ErrValidation.WithMsg(err.Error())
	}
	return h.svc.WxLogin(c.Request.Context(), &in)
}
