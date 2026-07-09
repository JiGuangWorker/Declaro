// Copyright (c) 2026 Declaro. All rights reserved.

// Package auth 鉴权模块：微信小程序登录、session_token 签发。
//
// 本模块同时作为后端业务模块的三层编写样板：
//
//	model.go      —— 数据实体（GORM model）
//	repository.go —— 数据访问层（仅与 DB 交互，不含业务规则）
//	service.go    —— 业务逻辑层（不依赖 gin，只收 context.Context）
//	handler.go    —— HTTP 层（解析入参、调 service、组装出参）
//
// 抄写步骤见 server/internal/module/README.md。
package auth

import (
	"time"

	"gorm.io/gorm"
)

// User 用户实体。OpenID 是全平台数据隔离的唯一用户标识。
// 首次 wx-login 时按 OpenID 自动建档（无显式注册流程）。
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	OpenID    string         `gorm:"uniqueIndex;size:64;not null" json:"openid"`
	UnionID   string         `gorm:"size:64;index" json:"unionid,omitempty"`
	Nickname  string         `gorm:"size:64" json:"nickname,omitempty"`
	AvatarURL string         `gorm:"size:512" json:"avatar_url,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 显式表名，避免按复数约定生成。
func (User) TableName() string { return "users" }
