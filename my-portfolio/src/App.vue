<script setup>
  // 引入全局組件
  import Header from './components/PageHeader.vue'
  import Footer from './components/PageFooter.vue'
</script>

<template>
  <!-- 頁首導航 -->
  <Header></Header>
  <!-- 路由視圖：頁面內容將渲染於此 -->
  <router-view />
  <!-- 頁尾資訊 -->
  <Footer></Footer>
</template>

<style>
/* Global Reset */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
  background-color: #0a0f1e; /* Match the dark theme */
}

#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

<style scoped>
/* 這裡寫 CSS，scoped 代表只影響這個檔案 */

</style>
