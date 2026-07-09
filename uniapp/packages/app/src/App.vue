<!-- Copyright (c) 2026 Declaro. All rights reserved. -->
<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { silentLogin } from './store/modules/auth'

onLaunch(() => {
  // 应用启动静默登录：成功跳首页，失败跳登录页（提供重试）
  silentLogin().then((ok) => {
    if (ok) {
      uni.reLaunch({ url: '/pages/index/index' })
    } else {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  })
})
</script>
