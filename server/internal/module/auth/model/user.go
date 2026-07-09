// Copyright (c) 2026 Declaro. All rights reserved.

// Package model 定义 auth 模块的数据实体（GORM model）。
// 仅描述表结构与字段，不含业务规则与 DB 操作。
package model

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
