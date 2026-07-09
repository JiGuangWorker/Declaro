// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, expect, it } from 'vitest'
import { ApiError, ErrSegment, SEGMENT_LABEL, segmentOf } from '../../api/errcode'

describe('ErrSegment', () => {
  it('段位基准值为万位整数（对齐 server/pkg/errcode）', () => {
    expect(ErrSegment.Common).toBe(10000)
    expect(ErrSegment.Step).toBe(20000)
    expect(ErrSegment.File).toBe(30000)
    expect(ErrSegment.Quality).toBe(40000)
    expect(ErrSegment.Export).toBe(50000)
    expect(ErrSegment.System).toBe(90000)
  })
})

describe('segmentOf', () => {
  it('成功码 0 不归任何段位（segmentOf(0)=0；request.ts 中 code=0 走成功路径，不触发段位路由）', () => {
    expect(segmentOf(0)).toBe(0)
  })
  it('按万位正确分段', () => {
    expect(segmentOf(10001)).toBe(ErrSegment.Common)
    expect(segmentOf(19999)).toBe(ErrSegment.Common)
    expect(segmentOf(20001)).toBe(ErrSegment.Step)
    expect(segmentOf(25000)).toBe(ErrSegment.Step)
    expect(segmentOf(30001)).toBe(ErrSegment.File)
    expect(segmentOf(39999)).toBe(ErrSegment.File)
    expect(segmentOf(40001)).toBe(ErrSegment.Quality)
    expect(segmentOf(50001)).toBe(ErrSegment.Export)
    expect(segmentOf(90001)).toBe(ErrSegment.System)
    expect(segmentOf(99999)).toBe(ErrSegment.System)
  })
  it('负数走 Math.floor 向下取整（request.ts fail 路径 code=-1 的边界行为）', () => {
    // Math.floor(-1/10000) = -1；-1 * 10000 = -10000
    // 该值不属于任何枚举段位，SEGMENT_FALLBACK_MSG[-10000]=undefined → 兜底文案
    expect(segmentOf(-1)).toBe(-10000)
  })
})

describe('SEGMENT_LABEL', () => {
  it('每个段位都有可读名称', () => {
    expect(SEGMENT_LABEL[ErrSegment.Common]).toBe('鉴权/通用')
    expect(SEGMENT_LABEL[ErrSegment.Step]).toBe('步骤')
    expect(SEGMENT_LABEL[ErrSegment.File]).toBe('文件')
    expect(SEGMENT_LABEL[ErrSegment.Quality]).toBe('质检')
    expect(SEGMENT_LABEL[ErrSegment.Export]).toBe('导出')
    expect(SEGMENT_LABEL[ErrSegment.System]).toBe('系统')
  })
})

describe('ApiError', () => {
  it('构造时自动计算 segment', () => {
    const err = new ApiError({
      code: 30001,
      msg: '文件不存在',
      httpStatus: 404,
    })
    expect(err.code).toBe(30001)
    expect(err.segment).toBe(ErrSegment.File)
    expect(err.httpStatus).toBe(404)
    expect(err.msg).toBe('文件不存在')
    expect(err.message).toBe('文件不存在') // Error 基类
    expect(err.name).toBe('ApiError')
    expect(err.retryAfter).toBeUndefined()
  })

  it('retryAfter 可选（429 场景透传）', () => {
    const err = new ApiError({
      code: 0,
      msg: '限流',
      httpStatus: 429,
      retryAfter: 5,
    })
    expect(err.retryAfter).toBe(5)
  })

  it('是 Error 实例（可被 try/catch 捕获）', () => {
    const err = new ApiError({
      code: 10001,
      msg: 'x',
      httpStatus: 401,
    })
    expect(err).toBeInstanceOf(Error)
  })
})
