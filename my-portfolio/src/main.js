import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 只引入 Bootstrap 的 Grid 系統和 Utilities (彈性佈局等)，不引入組件樣式
import 'bootstrap/dist/css/bootstrap-grid.min.css'
import 'bootstrap/dist/css/bootstrap-utilities.min.css'

const app = createApp(App)

app.use(router)

app.mount('#app')
