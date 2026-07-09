// Copyright (c) 2026 Declaro. All rights reserved.

// Package response 提供统一响应体与 handler 包装器。
//
// 用法：业务 handler 不要直接写 c.JSON，而是返回 (data, error)，
// 由 Wrap 包裹后统一翻译为 {code, msg, data} 三段式响应。
// 错误经 errcode.*Error 映射到对应业务码与 HTTP 状态码。
package response

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/declaro/server/pkg/errcode"
)

// Body 统一响应体，对齐 openapi.yaml ErrorResponse。
// 成功：code=0, msg="ok", data=<业务数据>。
// 失败：code=<业务码>, msg=<文案>, data 省略。
type Body struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data,omitempty"`
}

// HandlerFunc 业务 handler 标准签名：返回 (data, error)。
// handler 只负责入参解析、调 service、组装出参；不直接操作 *gin.Context 写响应。
type HandlerFunc func(c *gin.Context) (interface{}, error)

// Wrap 把 HandlerFunc 包装成 gin.HandlerFunc，统一处理响应输出与错误翻译。
func Wrap(h HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		data, err := h(c)
		if err != nil {
			WriteError(c, err)
			return
		}
		WriteOK(c, data)
	}
}

// WriteOK 输出成功响应（HTTP 200）。
func WriteOK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Body{Code: 0, Msg: "ok", Data: data})
}

// WriteCreated 输出创建成功响应（HTTP 201）。
func WriteCreated(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, Body{Code: 0, Msg: "created", Data: data})
}

// WriteError 输出错误响应。已知 *errcode.Error 按其映射；未知错误归一为系统内部异常。
func WriteError(c *gin.Context, err error) {
	var e *errcode.Error
	if errors.As(err, &e) {
		status := e.HTTPStatus
		if status == 0 {
			status = http.StatusOK
		}
		c.JSON(status, Body{Code: e.Code, Msg: e.Msg})
		return
	}
	// 未识别的错误一律对外脱敏为系统内部异常，避免泄漏堆栈。
	c.JSON(http.StatusInternalServerError, Body{Code: errcode.ErrInternal.Code, Msg: errcode.ErrInternal.Msg})
}

// AbortError 在中间件场景中断并输出错误（不进入后续 handler）。
func AbortError(c *gin.Context, err error) {
	WriteError(c, err)
	c.Abort()
}
