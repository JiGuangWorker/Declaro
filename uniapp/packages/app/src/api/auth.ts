// Copyright (c) 2026 Declaro. All rights reserved.

import { request } from './request'

export function wxLogin(data: { code: string }) {
  return request<{
    session_token: string
    expires_in: number
    openid?: string
  }>({
    url: '/api/v1/auth/wx-login',
    method: 'POST',
    data: data as unknown as Record<string, unknown>,
    noAuth: true,
  })
}
