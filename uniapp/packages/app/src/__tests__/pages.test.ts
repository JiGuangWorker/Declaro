// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, expect, it } from 'vitest'
import pagesJson from '../pages.json'

/**
 * AC#6：路由骨架校验。
 * 验证 7 条基础路由存在，登录页使用自定义导航栏。
 */
describe('pages.json 路由骨架（AC#6）', () => {
  const paths: string[] = pagesJson.pages.map((p) => p.path)

  it('包含 7 条基础路由', () => {
    expect(paths).toHaveLength(7)
  })

  it('包含首页', () => {
    expect(paths).toContain('pages/index/index')
  })

  it('包含登录页', () => {
    expect(paths).toContain('pages/login/index')
  })

  it('包含模板列表页', () => {
    expect(paths).toContain('pages/templates/index')
  })

  it('包含材料创建页', () => {
    expect(paths).toContain('pages/material/create')
  })

  it('包含材料填写页', () => {
    expect(paths).toContain('pages/material/fill')
  })

  it('包含导出页', () => {
    expect(paths).toContain('pages/export/index')
  })

  it('包含任务中心页', () => {
    expect(paths).toContain('pages/export/tasks')
  })

  it('登录页使用自定义导航栏（navigationStyle: custom）', () => {
    const login = pagesJson.pages.find((p) => p.path === 'pages/login/index')
    expect(login?.style?.navigationStyle).toBe('custom')
  })
})
