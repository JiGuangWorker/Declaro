// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * HandlerRegistry — 可注册处理器注册表（与 ComponentRegistry 同构）。
 *
 * register/get/has 接口。启动单次 registerBuiltins 注册内置处理器。
 * 详见设计 §3.4 双注册表。
 */
import type { LinkageHandler } from './types'

export class HandlerRegistryImpl {
  private handlers = new Map<string, LinkageHandler>()

  register(handler: LinkageHandler): void {
    this.handlers.set(handler.name, handler)
  }

  get(name: string): LinkageHandler | undefined {
    return this.handlers.get(name)
  }

  has(name: string): boolean {
    return this.handlers.has(name)
  }

  /** 清空（测试隔离用） */
  clear(): void {
    this.handlers.clear()
  }
}

/** 全局单例 */
export const handlerRegistry = new HandlerRegistryImpl()

/** 测试/重建用工厂 */
export function createHandlerRegistry(): HandlerRegistryImpl {
  return new HandlerRegistryImpl()
}
