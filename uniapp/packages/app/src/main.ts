// Copyright (c) 2026 Declaro. All rights reserved.

import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  return { app }
}