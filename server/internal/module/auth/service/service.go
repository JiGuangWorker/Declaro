// Copyright (c) 2026 Declaro. All rights reserved.

// Package service 提供 auth 模块的业务逻辑层。
// 不依赖 gin，方法签名收 context.Context，便于单测与复用。
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/declaro/server/internal/config"
	"github.com/declaro/server/internal/middleware"
	"github.com/declaro/server/internal/module/auth/model"
	"github.com/declaro/server/internal/module/auth/repository"
	"github.com/declaro/server/pkg/errcode"
)

// Service auth 模块业务逻辑层。
type Service struct {
	repo   *repository.Repository
	cfg    *config.Config
	logger *zap.Logger
	client *http.Client
}

// New 构造 Service。
func New(repo *repository.Repository, cfg *config.Config, logger *zap.Logger) *Service {
	return &Service{
		repo:   repo,
		cfg:    cfg,
		logger: logger,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// WxLoginInput 登录入参，对齐 openapi.yaml POST /api/v1/auth/wx-login requestBody。
type WxLoginInput struct {
	Code string `json:"code" binding:"required"`
}

// WxLoginResult 登录出参，对齐 openapi.yaml 响应。
type WxLoginResult struct {
	SessionToken string `json:"session_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// code2sessionResp 微信 jscode2session 响应体。
type code2sessionResp struct {
	OpenID     string `json:"openid"`
	SessionKey string `json:"session_key"`
	UnionID    string `json:"unionid"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

// WxLogin 微信登录：code → OpenID → 建档（首次）→ 签发 session_token。
// 对齐 PRD §6 与 openapi wxLogin：
//   - code 无效/过期 → 401 + code 10001
//   - 微信服务异常 → 500 + code 90001
func (s *Service) WxLogin(ctx context.Context, in *WxLoginInput) (*WxLoginResult, error) {
	openid, _, err := s.code2Session(ctx, in.Code)
	if err != nil {
		s.logger.Warn("wechat code2session failed", zap.Error(err), zap.String("code", in.Code))
		return nil, errcode.ErrWechatService.WithMsg("微信服务调用失败")
	}
	if openid == "" {
		return nil, errcode.ErrUnauthorized.WithMsg("code 无效或已过期")
	}

	// 首次登录自动建档
	u, err := s.repo.FindByOpenID(ctx, openid)
	if err != nil {
		s.logger.Error("find user by openid", zap.Error(err), zap.String("openid", openid))
		return nil, errcode.ErrDBOperation
	}
	if u == nil {
		u = &model.User{OpenID: openid}
		if err := s.repo.Create(ctx, u); err != nil {
			s.logger.Error("create user", zap.Error(err), zap.String("openid", openid))
			return nil, errcode.ErrDBOperation
		}
	}

	token, err := middleware.SignToken(s.cfg.JWT.Secret, s.cfg.JWT.Issuer, openid, s.cfg.JWT.Expire)
	if err != nil {
		s.logger.Error("sign token", zap.Error(err))
		return nil, errcode.ErrInternal
	}
	return &WxLoginResult{SessionToken: token, ExpiresIn: s.cfg.JWT.Expire}, nil
}

// code2Session 调用微信 jscode2session 换取 OpenID。
// 注意：session_key 暂不持久化；如后续启用水印/解密能力，建议存 Redis 并按 openid 设 TTL。
func (s *Service) code2Session(ctx context.Context, code string) (openid, sessionKey string, err error) {
	url := fmt.Sprintf("%s?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
		s.cfg.Wechat.Code2SessionURL, s.cfg.Wechat.AppID, s.cfg.Wechat.Secret, code)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, http.NoBody)
	if err != nil {
		return "", "", err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}
	var r code2sessionResp
	if err := json.Unmarshal(body, &r); err != nil {
		return "", "", err
	}
	if r.ErrCode != 0 {
		return "", "", fmt.Errorf("wechat errcode=%d msg=%s", r.ErrCode, r.ErrMsg)
	}
	return r.OpenID, r.SessionKey, nil
}
