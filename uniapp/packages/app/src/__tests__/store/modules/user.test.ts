// Copyright (c) 2026 Declaro. All rights reserved.

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '../../../store/modules/user'
import { clearToken, setToken } from '../../../utils/storage'

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearToken()
  })

  it('初始 token 为 null（从 storage 读取）', () => {
    const store = useUserStore()
    expect(store.token).toBeNull()
  })

  it('setSession 写入 token + 更新视图', () => {
    const store = useUserStore()
    store.setSession('sess123', 3600)
    expect(store.token).toBe('sess123')
  })

  it('logout 清除 token + 视图', () => {
    const store = useUserStore()
    store.setSession('sess123', 3600)
    store.logout()
    expect(store.token).toBeNull()
  })

  it('refresh 从 storage 重新读取（外部写入后同步视图）', () => {
    const store = useUserStore()
    setToken('external-tok', 3600) // 模拟 401 handler 等外部变更
    store.refresh()
    expect(store.token).toBe('external-tok')
  })

  it('isLogged 依赖 token 有效性（30s buffer）', () => {
    const store = useUserStore()
    expect(store.isLogged).toBe(false)
    store.setSession('sess', 3600)
    expect(store.isLogged).toBe(true)
    store.logout()
    expect(store.isLogged).toBe(false)
  })
})
