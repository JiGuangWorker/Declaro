// Copyright (c) 2026 Declaro. All rights reserved.

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  clearToken,
  getToken,
  isTokenValid,
  setToken,
} from '../../utils/storage'

/**
 * 用户态 store：持有 session_token 的响应式视图，持久化由 storage 工具负责。
 *
 * - token 注入在请求拦截器（api/request.ts）完成；本 store 只供 UI 判断登录态
 * - 401 处理器清 token 后调用 refresh() 同步视图（见 App.vue 启动钩子同理）
 */
export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())

  /** 当前是否处于有效登录态（token 存在且未过期） */
  const isLogged = computed(() => isTokenValid())

  /** 写入会话（登录成功后调用） */
  function setSession(sessionToken: string, expiresInSec: number): void {
    setToken(sessionToken, expiresInSec)
    token.value = sessionToken
  }

  /** 登出：清本地 token 与响应式状态 */
  function logout(): void {
    clearToken()
    token.value = null
  }

  /** 与持久层同步（401 处理器清 token 等外部变更后刷新视图） */
  function refresh(): void {
    token.value = getToken()
  }

  return { token, isLogged, setSession, logout, refresh }
})
