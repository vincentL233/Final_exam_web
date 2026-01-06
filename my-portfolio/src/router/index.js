import { createRouter, createWebHistory } from 'vue-router'
import PageMainContent from '../components/PageMainContent.vue'
import PageService from '../components/PageService.vue'
import PagePortfolio from '@/components/PagePortfolio.vue'
import PageAbout from '@/components/PageAbout.vue' 
import PageContact from '@/components/PageContact.vue'
import PageCamera from '@/components/PageCamera.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 滾動行為設定：切換路由時自動捲動到頂部
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      // 如果是用瀏覽器的上一頁/下一頁，則回到之前的位置
      return savedPosition
    } else {
      // 否則一律捲動到頂部
      return { top: 0 }
    }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: PageMainContent
    },
    {
      path: '/service',
      name: 'service',
      component: PageService
    },
    {
      path: '/portfolio',
      name: 'portfolio',
      component: PagePortfolio
    },
    {
      path: '/about',
      name: 'about',
      component: PageAbout
    },
    {
      path:'/contact',
      name:'contact',
      component: PageContact
    },
    {
        path: '/camera',
        name: 'camera',
        component: PageCamera
    }
  ],
})

export default router
