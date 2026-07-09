<!-- Copyright (c) 2026 Declaro. All rights reserved. -->
<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { clearToken, getToken, isTokenValid } from './utils/storage'

onLaunch(() => {
  // 应用启动时校验 token 有效期：存在但已过期则清除，避免带过期 token 请求触发 401
  if (getToken() && !isTokenValid()) {
    clearToken()
  }
})
</script>
