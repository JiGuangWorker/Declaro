// Copyright (c) 2026 Declaro. All rights reserved.

// Package errcode 定义业务错误码段位与统一错误类型。
//
// 约定（对齐 project_memory 与 openapi.yaml ErrorResponse）：
//
//	code = 0           成功
//	1xxxx 鉴权/通用     10001 未授权、10002 token过期、10003 越权、10004 不存在 …
//	2xxxx 步骤          20001 前置未完成、20002 步骤锁定 …
//	3xxxx 文件          30001 超出数量上限、30002 文件不存在 …
//	4xxxx 质检          40001 质检超时、40002 质检繁忙 …
//	5xxxx 导出          50001 存在未完成项目、50002 文件未就绪 …
//	9xxxx 系统级        90000 内部异常、90001 微信服务异常 …
//
// HTTP 状态码仅表传输层状态，业务码走 body.code，两者分离。
package errcode

// Segment 错误码段位（万位）。
type Segment int

const (
	SegCommon  Segment = 10000 // 鉴权/通用
	SegStep    Segment = 20000 // 步骤
	SegFile    Segment = 30000 // 文件
	SegQuality Segment = 40000 // 质检
	SegExport  Segment = 50000 // 导出
	SegSystem  Segment = 90000 // 系统级
)

// Error 业务错误。handler/service 返回 *Error，由 response 统一翻译成响应体。
type Error struct {
	Code       int    // 业务错误码
	Msg        string // 错误文案（面向用户）
	HTTPStatus int    // 对应 HTTP 状态码
}

func (e *Error) Error() string { return e.Msg }

// New 构造一个业务错误。httpStatus 为 0 时由 response 层兜底为 200。
func New(code int, msg string, httpStatus int) *Error {
	return &Error{Code: code, Msg: msg, HTTPStatus: httpStatus}
}

// WithMsg 基于已有错误码换一条文案（保留 Code/HTTPStatus），用于同一码不同上下文。
func (e *Error) WithMsg(msg string) *Error {
	return &Error{Code: e.Code, Msg: msg, HTTPStatus: e.HTTPStatus}
}

// SegmentOf 返回某错误码所属段位。
func SegmentOf(code int) Segment { return Segment(code / 10000 * 10000) }

// 预定义错误。新增错误码请落到对应段位，不要复用已有码。
var (
	// 1xxxx 鉴权/通用
	ErrUnauthorized        = New(10001, "未授权或 token 已过期", 401)
	ErrTokenExpired        = New(10002, "token 已过期，请重新登录", 401)
	ErrForbidden           = New(10003, "无操作权限", 403)
	ErrNotFound            = New(10004, "资源不存在", 404)
	ErrValidation          = New(10005, "参数校验失败", 422)
	ErrConflict            = New(10006, "资源状态冲突", 409)
	ErrTooManyRequests     = New(10007, "请求过于频繁", 429)
	ErrIdempotencyConflict = New(10008, "幂等键冲突", 409)

	// 2xxxx 步骤
	ErrStepNotCompleted = New(20001, "请先完成当前步骤", 403)
	ErrStepLocked       = New(20002, "步骤已锁定", 403)

	// 3xxxx 文件
	ErrFileQuotaExceeded = New(30001, "上传数量已达上限", 409)
	ErrFileNotFound      = New(30002, "文件不存在", 404)

	// 4xxxx 质检
	ErrQualityTimeout = New(40001, "检测失败，请检查网络后重试", 504)
	ErrQualityBusy    = New(40002, "质检服务繁忙", 429)

	// 5xxxx 导出
	ErrExportIncomplete = New(50001, "存在未完成项目，无法导出", 409)
	ErrExportNotReady   = New(50002, "文件尚未生成完成", 409)

	// 9xxxx 系统级
	ErrInternal       = New(90000, "服务内部异常", 500)
	ErrWechatService  = New(90001, "微信服务异常", 500)
	ErrDBOperation    = New(90010, "数据库操作失败", 500)
	ErrRedisOperation = New(90020, "缓存操作失败", 500)
)
