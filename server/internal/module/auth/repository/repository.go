// Copyright (c) 2026 Declaro. All rights reserved.

// Package repository 提供 auth 模块的数据访问层。
// 只负责与 DB 交互，不含业务规则、不依赖 gin。
// 错误用原生 error 向上抛，由 service 转成 *errcode.Error。
package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/declaro/server/internal/module/auth/model"
)

// Repository auth 模块数据访问对象。
type Repository struct {
	db *gorm.DB
}

// New 构造 Repository。db 为 nil 时方法会返回 gorm 错误，由上层降级处理。
func New(db *gorm.DB) *Repository { return &Repository{db: db} }

// FindByOpenID 按 OpenID 查询用户。未找到返回 (nil, nil)，由 service 决定建档逻辑。
func (r *Repository) FindByOpenID(ctx context.Context, openid string) (*model.User, error) {
	var u model.User
	err := r.db.WithContext(ctx).Where("openid = ?", openid).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// Create 创建用户。首次登录时调用。
func (r *Repository) Create(ctx context.Context, u *model.User) error {
	return r.db.WithContext(ctx).Create(u).Error
}
