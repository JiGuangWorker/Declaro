// Copyright (c) 2026 Declaro. All rights reserved.

// Package pagination 提供分页请求解析与统一分页响应结构。
package pagination

import (
	"github.com/gin-gonic/gin"
)

const (
	DefaultPage     = 1
	DefaultPageSize = 20
	MaxPageSize     = 100
)

// Request 分页请求参数，从 query 绑定。
type Request struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
}

// Response 分页响应结构，对齐 openapi.yaml 中带分页的列表接口。
type Response struct {
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
	Total    int64       `json:"total"`
	Items    interface{} `json:"items"`
}

// From 从 gin.Context 解析分页参数并补默认值。
func From(c *gin.Context) Request {
	var r Request
	_ = c.ShouldBindQuery(&r)
	if r.Page < 1 {
		r.Page = DefaultPage
	}
	if r.PageSize < 1 {
		r.PageSize = DefaultPageSize
	}
	if r.PageSize > MaxPageSize {
		r.PageSize = MaxPageSize
	}
	return r
}

// Offset 计算数据库查询的 offset。
func (r Request) Offset() int { return (r.Page - 1) * r.PageSize }

// NewResp 构造分页响应。
func NewResp(r Request, total int64, items interface{}) Response {
	return Response{Page: r.Page, PageSize: r.PageSize, Total: total, Items: items}
}
