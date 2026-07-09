// Copyright (c) 2026 Declaro. All rights reserved.

package auth

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

// Repository 数据访问层。只负责与 DB 交互，不包含业务规则、不依赖 gin。
// 跨模块复用的通用查询能力（如分页、OpenID 谓词）建议沉淀到 pkg/，而非在此堆砌。
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// FindByOpenID 按 OpenID 查询用户。未找到返回 (nil, nil)，由 service 决定建档逻辑。
func (r *Repository) FindByOpenID(ctx context.Context, openid string) (*User, error) {
	var u User
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
func (r *Repository) Create(ctx context.Context, u *User) error {
	return r.db.WithContext(ctx).Create(u).Error
}
