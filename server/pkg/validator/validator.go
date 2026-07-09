// Copyright (c) 2026 Declaro. All rights reserved.

// Package validator 封装 go-playground/validator，注册业务自定义校验规则。
//
// 用法：
//   - struct tag: `binding:"required"` 由 Gin 自动校验；
//   - 自定义类型: `binding:"phone"` / `binding:"id_card"` 等在此注册。
package validator

import (
	"regexp"
	"sync"

	"github.com/go-playground/validator/v10"
)

var (
	once     sync.Once
	validate *validator.Validate
)

// V 返回单例 validator（懒加载注册自定义规则）。
func V() *validator.Validate {
	once.Do(func() {
		validate = validator.New()
		_ = validate.RegisterValidation("phone", isPhone)
		_ = validate.RegisterValidation("id_card", isIDCard)
	})
	return validate
}

// Validate 校验结构体，返回第一个错误。
func Validate(s interface{}) error { return V().Struct(s) }

var (
	rePhone  = regexp.MustCompile(`^1[3-9]\d{9}$`)
	reIDCard = regexp.MustCompile(`^\d{17}[\dXx]$`)
)

func isPhone(fl validator.FieldLevel) bool  { return rePhone.MatchString(fl.Field().String()) }
func isIDCard(fl validator.FieldLevel) bool { return reIDCard.MatchString(fl.Field().String()) }
