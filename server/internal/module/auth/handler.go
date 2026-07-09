// Copyright (c) 2026 Declaro. All rights reserved.

package auth

import (
	"github.com/gin-gonic/gin"

	"github.com/declaro/server/pkg/errcode"
)

// Handler HTTP 层。只做：解析入参 → 调 service → 返回 (data, error)。
// 不写业务规则、不直接操作 DB、不直接 c.JSON（交给 response.Wrap 统一处理）。
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// WxLogin POST /api/v1/auth/wx-login （security: [] 豁免鉴权）
func (h *Handler) WxLogin(c *gin.Context) (interface{}, error) {
	var in WxLoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		return nil, errcode.ErrValidation.WithMsg(err.Error())
	}
	return h.svc.WxLogin(c.Request.Context(), &in)
}
