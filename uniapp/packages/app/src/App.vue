<!-- Copyright (c) 2026 Declaro. All rights reserved. -->
<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { silentLogin } from './store/modules/auth'

onLaunch(() => {
  silentLogin().then((ok) => {
    if (ok) {
      uni.reLaunch({ url: '/pages/index/index' })
    } else {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  })
})
</script>