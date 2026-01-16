<script setup>
import { ref, onMounted, nextTick } from 'vue';
import gsap from 'gsap';
import axios from 'axios';

const services = ref([]);

const sectionRef = ref(null);
// 使用 ref 陣列來收集所有卡片元素
const cardsRef = ref([]);

// 卡片展開動畫相關狀態
const activeService = ref(null);
const isExpanded = ref(false);
const overlayRef = ref(null);
const backdropRef = ref(null);
let activeIndex = -1;

const handleCardClick = (service, index) => {
  if (isExpanded.value) return;
  
  activeIndex = index;
  activeService.value = service;
  isExpanded.value = true;
  
  // 鎖定背景滾動
  document.body.style.overflow = 'hidden';

  const cardEl = cardsRef.value[index];
  const rect = cardEl.getBoundingClientRect();
  
  // 隱藏原始卡片
  gsap.to(cardEl, { opacity: 0, duration: 0.2 });

  nextTick(() => {
    if (!overlayRef.value) return;

    // 判斷是否為手機版
    const isMobile = window.innerWidth < 768;

    // 初始狀態：設定為卡片的位置和大小
    gsap.set(overlayRef.value, {
      position: 'fixed',
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      zIndex: 9999,
      borderRadius: '24px',
      opacity: 1,
      margin: 0
    });
    
    gsap.set(backdropRef.value, {
      display: 'block',
      opacity: 0
    });

    // 動畫展開
    const tl = gsap.timeline();
    
    // 根據裝置決定展開樣式
    const targetVars = isMobile ? {
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      maxWidth: 'none',
      maxHeight: 'none',
      borderRadius: '0px', // 手機版全螢幕不留圓角
      xPercent: 0,
      yPercent: 0,
      duration: 0.5,
      ease: 'power4.out'
    } : {
      top: '50%',
      left: '50%',
      width: '90%',
      maxWidth: '600px',
      height: 'auto',
      maxHeight: '85vh',
      borderRadius: '24px',
      xPercent: -50,
      yPercent: -50,
      duration: 0.5,
      ease: 'power4.out'
    };

    tl.to(backdropRef.value, {
      opacity: 1,
      duration: 0.3
    })
    .to(overlayRef.value, targetVars, 0);
  });
};

const closeCard = () => {
  if (!isExpanded.value || activeIndex === -1) return;
  
  const cardEl = cardsRef.value[activeIndex];
  // 重新獲取位置以防滾動
  const rect = cardEl.getBoundingClientRect(); 

  const tl = gsap.timeline({
    onComplete: () => {
      isExpanded.value = false;
      activeService.value = null;
      gsap.set(backdropRef.value, { display: 'none' });
      // 解除背景滾動鎖定
      document.body.style.overflow = '';
      // 恢復原始卡片
      gsap.to(cardEl, { opacity: 1, duration: 0.2 });
    }
  });
  
  tl.to(overlayRef.value, {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    borderRadius: '24px', // 縮回時恢復圓角
    xPercent: 0,
    yPercent: 0,
    duration: 0.4,
    ease: 'power3.inOut'
  })
  .to(backdropRef.value, {
    opacity: 0,
    duration: 0.3
  }, 0);
};

const fetchServices = () => {
  axios.get(`${import.meta.env.VITE_API_URL || ''}/services`)
    .then(response => {
      if (response.data && response.data.length > 0) {
        services.value = response.data;
      }
    })
    .catch(error => {
      console.error('Error fetching services:', error);
    });
};

const initAnimations = () => {
  // 確保元素存在才執行動畫
  if (cardsRef.value.length > 0) {
    // 標題進場動畫
    gsap.from('.service-title-group', {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    });

    // 卡片依序進場動畫
    gsap.from(cardsRef.value, {
      y: 100,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      delay: 0.3,
      ease: 'back.out(1.7)',
      clearProps: 'all' // 動畫結束後清除屬性，避免干擾
    });

    // Workflow 區域滾動觸發動畫
    const workflowObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          gsap.from('.step-content', {
            y: 60,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: 'power3.out',
            clearProps: 'all'
          });
          workflowObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    const workflowSection = document.querySelector('.workflow-section');
    if (workflowSection) {
      workflowObserver.observe(workflowSection);
    }
  }
};

onMounted(async () => {
  await fetchServices();
  
  // 等待 DOM 更新後再執行進場動畫
  setTimeout(initAnimations, 300); // 增加延遲時間，確保資料已渲染
});
</script>

<template>
  <section class="service-section" ref="sectionRef">
    <!-- 背景動態裝飾 -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>

    <div class="container position-relative" style="z-index: 2;">
      <!-- 標題區塊 -->
      <div class="text-center mb-5 service-title-group">
        <h2 class="service-title">My Services</h2>
        <p class="service-subtitle text-secondary">
          Tailored solutions to elevate your digital presence.
        </p>
      </div>

      <!-- 服務卡片網格 -->
      <div class="services-grid">
        <div 
          v-for="(service, index) in services" 
          :key="service.id"
          :ref="el => cardsRef[index] = el"
          class="service-card"
          @click="handleCardClick(service, index)"
          style="cursor: pointer;"
        >
          <div class="icon-wrapper">
            <!-- SVG Icons -->
            <svg v-if="service.icon === 'code'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <svg v-if="service.icon === 'palette'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
            <svg v-if="service.icon === 'mobile'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            <svg v-if="service.icon === 'chart'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          
          <h3 class="card-title">{{ service.title }}</h3>
          <p class="card-desc">{{ service.description }}</p>
          
          <a href="#" class="learn-more">
            <span>Learn More</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
        </div>
      </div>

      <!-- 新增：工作流程區塊 (Workflow) -->
      <div class="workflow-section">
        <div class="text-center mb-5">
          <h3 class="workflow-title">How I Work</h3>
          <p class="text-secondary">A simple, transparent process to bring your ideas to life.</p>
        </div>
        
        <div class="steps-container">
          <div class="step-item">
            <div class="step-content">
              <div class="step-number-bg">01</div>
              <div class="step-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <h4 class="step-title">Discovery</h4>
              <p class="step-desc">We discuss your goals, target audience, and requirements to build a solid foundation.</p>
            </div>
          </div>
          
          <div class="step-connector">
            <div class="connector-line"></div>
          </div>
          
          <div class="step-item">
            <div class="step-content">
              <div class="step-number-bg">02</div>
              <div class="step-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
              </div>
              <h4 class="step-title">Strategy</h4>
              <p class="step-desc">I create a detailed roadmap and design plan tailored to your specific needs.</p>
            </div>
          </div>
          
          <div class="step-connector">
            <div class="connector-line"></div>
          </div>
          
          <div class="step-item">
            <div class="step-content">
              <div class="step-number-bg">03</div>
              <div class="step-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              </div>
              <h4 class="step-title">Development</h4>
              <p class="step-desc">I build your solution using the latest technologies with clean, efficient code.</p>
            </div>
          </div>
          
          <div class="step-connector">
            <div class="connector-line"></div>
          </div>
          
          <div class="step-item">
            <div class="step-content">
              <div class="step-number-bg">04</div>
              <div class="step-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>
              </div>
              <h4 class="step-title">Launch</h4>
              <p class="step-desc">After rigorous testing, we launch your project and ensure everything runs smoothly.</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 展開後的卡片 Overlay -->
    <Teleport to="body">
      <div ref="backdropRef" class="service-backdrop" @click="closeCard"></div>
      
      <div v-if="activeService" ref="overlayRef" class="service-overlay">
        <button class="close-btn" @click="closeCard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <div class="overlay-content">
            <div class="icon-wrapper-large">
                <svg v-if="activeService.icon === 'code'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                <svg v-if="activeService.icon === 'palette'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                <svg v-if="activeService.icon === 'mobile'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                <svg v-if="activeService.icon === 'chart'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            
            <h2 class="overlay-title">{{ activeService.title }}</h2>
            <p class="overlay-desc">{{ activeService.description }}</p>
            
            <div class="overlay-details">
                <h3>Service Features</h3>
                <ul>
                    <li>Customized Strategy</li>
                    <li>Professional Implementation</li>
                    <li>24/7 Support</li>
                    <li>Performance Tracking</li>
                </ul>
                <button class="overlay-cta">Get Started</button>
            </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.service-section {
  padding: 140px 0 100px; /* 頂部留白給 Fixed Header */
  background-color: #f8fafc; /* 淺灰藍底色 */
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px); /* 點狀背景 */
  background-size: 40px 40px;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 背景動態光暈 */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 1;
  opacity: 0.6;
  pointer-events: none;
}

.blob-1 {
  top: -10%;
  right: -5%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(255, 255, 255, 0) 70%);
  animation: float 10s ease-in-out infinite;
}

.blob-2 {
  bottom: -10%;
  left: -10%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(255, 255, 255, 0) 70%);
  animation: float 15s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -30px); }
}

/* 標題樣式 */
.service-title {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -1px;
  /* 漸層文字 */
  background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}

.service-subtitle {
  font-size: 1.25rem;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* 網格佈局 */
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2.5rem;
  padding: 3rem 0;
}

/* 卡片樣式 */
.service-card {
  background: rgba(255, 255, 255, 0.85); /* 半透明白 */
  backdrop-filter: blur(12px); /* 毛玻璃效果 */
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* 卡片 Hover 背景光暈 */
.service-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: -1;
}

/* Hover 互動效果 */
.service-card:hover {
  transform: translateY(-12px); /* 上浮 */
  box-shadow: 0 20px 50px rgba(56, 189, 248, 0.15); /* 藍色光暈陰影 */
  border-color: rgba(56, 189, 248, 0.3);
}

.service-card:hover::before {
  opacity: 1;
}

/* Icon 容器 */
.icon-wrapper {
  width: 64px;
  height: 64px;
  background: rgba(240, 249, 255, 1); /* 淺藍底 */
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: #0284c7;
  transition: all 0.4s ease;
}

.service-card:hover .icon-wrapper {
  background: #0284c7; /* 變深藍 */
  color: #ffffff; /* Icon 變白 */
  transform: scale(1.1) rotate(-5deg); /* 旋轉放大 */
  box-shadow: 0 10px 20px rgba(2, 132, 199, 0.3);
}

.icon-wrapper svg {
  width: 32px;
  height: 32px;
}

/* 卡片內容 */
.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1rem;
}

.card-desc {
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 2rem;
  flex-grow: 1; /* 讓按鈕對齊底部 */
}

/* Learn More 按鈕 */
.learn-more {
  color: #0284c7;
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.learn-more svg {
  transition: transform 0.3s ease;
}

.learn-more:hover {
  color: #0ea5e9;
  gap: 12px; /* 拉開間距 */
}

.learn-more:hover svg {
  transform: translateX(3px);
}

/* RWD */
@media (max-width: 768px) {
  .service-title {
    font-size: 2.5rem;
  }
  
  .service-section {
    padding: 100px 0 60px;
  }
  
  .services-grid {
    grid-template-columns: 1fr; /* 手機版單欄 */
    padding: 1rem 0;
  }
  
  .steps-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .step-connector {
    width: 100%;
    height: 40px;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
  }

  .connector-line {
    width: 2px;
    height: 100%;
    background: repeating-linear-gradient(
      180deg,
      #cbd5e1,
      #cbd5e1 6px,
      transparent 6px,
      transparent 12px
    );
  }
  
  .cta-content h2 {
    font-size: 2rem;
  }
}

/* Workflow 樣式 */
.workflow-section {
  margin-top: 8rem;
  margin-bottom: 6rem;
}

.workflow-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1rem;
}

.steps-container {
  display: flex;
  justify-content: space-between;
  align-items: stretch; /* 讓卡片等高 */
  position: relative;
  gap: 1rem;
}

.step-item {
  flex: 1;
  text-align: center;
  padding: 1rem;
  position: relative;
  z-index: 2;
}

.step-content {
  position: relative;
  padding: 2rem 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
}

.step-item:hover .step-content {
  transform: translateY(-10px);
}

.step-number-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 8rem;
  font-weight: 900;
  color: rgba(203, 213, 225, 0.2);
  z-index: 0;
  line-height: 1;
  pointer-events: none;
  transition: all 0.4s ease;
}

.step-item:hover .step-number-bg {
  color: rgba(56, 189, 248, 0.15);
  transform: translate(-50%, -50%) scale(1.1);
}

.step-icon {
  width: 60px;
  height: 60px;
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0284c7;
  margin-bottom: 1.5rem;
  transition: all 0.4s ease;
  position: relative;
  z-index: 2;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.step-item:hover .step-icon {
  transform: scale(1.2);
  background: #0284c7;
  color: white;
  box-shadow: 0 10px 20px rgba(2, 132, 199, 0.3);
}

.step-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  color: #0f172a;
  position: relative;
  z-index: 2;
}

.step-desc {
  font-size: 1rem;
  color: #475569;
  line-height: 1.6;
  position: relative;
  z-index: 2;
  font-weight: 500;
}

.step-connector {
  flex-grow: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 35px; /* 對齊 Icon 中心 (70px/2) */
}

.connector-line {
  width: 100%;
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    #cbd5e1,
    #cbd5e1 6px,
    transparent 6px,
    transparent 12px
  );
  position: relative;
}

/* 動畫效果：線條流動 */
@keyframes dashMove {
  from { background-position: 0 0; }
  to { background-position: 24px 0; }
}

.steps-container:hover .connector-line {
  animation: dashMove 1s linear infinite;
  background: repeating-linear-gradient(
    90deg,
    #38bdf8,
    #38bdf8 6px,
    transparent 6px,
    transparent 12px
  );
}


/* Overlay 動畫相關樣式 */
.service-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  z-index: 9998;
  display: none;
}

.service-overlay {
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
}

/* 確保所有子元素都使用 border-box，避免 padding 撐大寬度 */
.service-overlay * {
  box-sizing: border-box;
}

.close-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(241, 245, 249, 0.8);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e2e8f0;
  transform: rotate(90deg);
}

.overlay-content {
  padding: 3rem;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .overlay-content {
    padding: 1.5rem; /* 手機版減少 padding */
  }
  
  .overlay-title {
    font-size: 1.8rem;
  }
  
  .overlay-desc {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
}

.icon-wrapper-large {
  width: 80px;
  height: 80px;
  background: #0284c7;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 2rem;
  box-shadow: 0 10px 25px rgba(2, 132, 199, 0.3);
}

.icon-wrapper-large svg {
  width: 40px;
  height: 40px;
}

.overlay-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 1rem;
}

.overlay-desc {
  font-size: 1.1rem;
  color: #64748b;
  line-height: 1.8;
  max-width: 600px;
  margin-bottom: 3rem;
}

.overlay-details {
  width: 100%;
  max-width: 500px;
  background: #f8fafc;
  padding: 2rem;
  border-radius: 20px;
  text-align: left;
}

.overlay-details h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #334155;
}

.overlay-details ul {
  list-style: none;
  padding: 0;
  margin-bottom: 2rem;
}

.overlay-details li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
}

.overlay-details li::before {
  content: '✓';
  color: #0284c7;
  font-weight: bold;
  margin-right: 10px;
}

.overlay-cta {
  width: 100%;
  background: #0284c7;
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.overlay-cta:hover {
  background: #0369a1;
}
</style>