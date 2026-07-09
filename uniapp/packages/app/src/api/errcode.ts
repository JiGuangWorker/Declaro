// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 业务错误码段位定义（前端镜像 server/pkg/errcode/errcode.go）。
 *
 * 约定（对齐 project_memory 与 openapi.yaml ErrorResponse）：
 *   code = 0            成功
 *   1xxxx 鉴权/通用
 *   2xxxx 步骤
 *   3xxxx 文件
 *   4xxxx 质检
 *   5xxxx 导出
 *   9xxxx 系统级
 *
 * HTTP 状态码仅表传输层，业务码走 body.code，两者分离。
 */

export enum ErrSegment {
  Common = 10000,
  Step = 20000,
  File = 30000,
  Quality = 40000,
  Export = 50000,
  System = 90000,
}

/** 返回某业务码所属段位（万位） */
export function segmentOf(code: number): ErrSegment {
  return (Math.floor(code / 10000) * 10000) as ErrSegment
}

/** 段位对应的可读名称（用于日志/埋点，不直接展示给用户） */
export const SEGMENT_LABEL: Record<ErrSegment, string> = {
  [ErrSegment.Common]: '鉴权/通用',
  [ErrSegment.Step]: '步骤',
  [ErrSegment.File]: '文件',
  [ErrSegment.Quality]: '质检',
  [ErrSegment.Export]: '导出',
  [ErrSegment.System]: '系统',
}

/**
 * 统一业务错误。请求封装 reject 时抛出，调用方可按 code/segment 分支处理。
 */
export class ApiError extends Error {
  readonly code: number
  readonly segment: ErrSegment
  readonly httpStatus: number
  readonly msg: string
  /** 429 限流场景服务端建议的重试秒数 */
  readonly retryAfter?: number

  constructor(params: {
    code: number
    msg: string
    httpStatus: number
    retryAfter?: number
  }) {
    super(params.msg)
    this.name = 'ApiError'
    this.code = params.code
    this.msg = params.msg
    this.httpStatus = params.httpStatus
    this.segment = segmentOf(params.code)
    this.retryAfter = params.retryAfter
  }
}
