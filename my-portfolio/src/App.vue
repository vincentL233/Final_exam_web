<script setup>
// 這裡就像以前你在 <script> 裡寫的 setup() 或 data/methods
  import Header from './components/PageHeader.vue'
  import Footer from './components/PageFooter.vue'
</script>

<template>
  <!-- 這裡就是 HTML 模板 -->
  <Header></Header>
  <!-- 這是路由出口，之後切換頁面內容會顯示在這裡 -->
  <router-view />
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
