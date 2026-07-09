// Copyright (c) 2026 Declaro. All rights reserved.

import { request } from './request'

/**
 * 微信登录接口：code → session_token。
 * 对齐 openapi.yaml `wxLogin` operationId。
 * skipAuth 跳过 token 注入（登录接口自身不带 token）。
 */
export function wxLogin(data: { code: string }) {
  return request<{
    session_token: string
    expires_in: number
    openid?: string
  }>({
    url: '/api/v1/auth/wx-login',
    method: 'POST',
    data: data as unknown as Record<string, unknown>,
    skipAuth: true,
  })
}
