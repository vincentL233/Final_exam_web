<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import gsap from 'gsap';

const router = useRouter();
const route = useRoute();

const links = ref([
  { name: 'Home', path: '/' },
  { name: 'Services', path: '/service' },
  { name: 'Portfolio', path: '/portfolio' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' }
]);

// --- 狀態管理 ---
const isScrolled = ref(false);
const activeIndex = ref(0); // 當前選中的項目索引
const isMouseDown = ref(false); // 是否正在按住滑鼠
const navItems = ref([]); // 儲存所有 li 元素
const pillRef = ref(null); // 膠囊元素

// --- 核心邏輯：更新膠囊位置 (使用 GSAP) ---
const updatePillPosition = (index) => {
  if (!navItems.value[index] || !pillRef.value) return;
  
  const target = navItems.value[index];
  
  // 如果元素隱藏 (例如在手機版)，則不更新位置，避免計算錯誤
  if (target.offsetParent === null) return;

  const parent = target.parentElement;
  
  // 計算位置
  const targetRect = target.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  
  const newLeft = targetRect.left - parentRect.left;
  const newWidth = targetRect.width;

  // GSAP 動畫：液體彈性效果
  gsap.to(pillRef.value, {
    left: newLeft,
    width: newWidth,
    opacity: 1, // 確保膠囊顯示
    duration: 0.6,
    ease: "elastic.out(1, 0.7)", // 彈性係數，越小越彈
    overwrite: 'auto' // 改為 auto，避免覆蓋掉 scale 動畫
  });
};

// 監聽路由變化，自動更新 activeIndex
watch(() => route.path, (newPath) => {
  const index = links.value.findIndex(link => link.path === newPath || (link.path !== '/' && newPath.startsWith(link.path)));
  if (index !== -1) {
    activeIndex.value = index;
  } else {
    // 處理錨點或是首頁的情況
    if (newPath === '/') activeIndex.value = 0;
  }
}, { immediate: true }); // immediate: true 表示組件載入時立即執行一次

// 監聽 activeIndex 變化，確保膠囊跟隨 (例如從手機版操作後切回電腦版)
watch(activeIndex, (newVal) => {
  // 使用 nextTick 確保 DOM 更新後再計算 (雖然 resize 會處理，但雙重保險)
  nextTick(() => {
    updatePillPosition(newVal);
  });
});

// 處理視窗大小調整
const handleResize = () => {
  updatePillPosition(activeIndex.value);
};


// --- 互動事件 ---

// 1. 按下 (開始拖曳)
const handleMouseDown = (index) => {
  isMouseDown.value = true;
  activeIndex.value = index;
  updatePillPosition(index);
  
  // 按下時變高變瘦，模擬受力擠壓
  // scaleY 加大到 1.6 以便超過 UL 邊界
  gsap.to(pillRef.value, {
    scaleX: 0.8, // 變瘦
    scaleY: 1.6, // 變高 (超過容器)
    duration: 0.2,
    ease: "power2.out"
  });

  // 字體變大
  if (navItems.value[index]) {
    const text = navItems.value[index].querySelector('a');
    gsap.to(text, {
      scale: 1.2,
      duration: 0.2,
      ease: "power2.out"
    });
  }
};

// 2. 滑入 (如果正在拖曳，就切換過去)
const handleMouseEnter = (index) => {
  if (isMouseDown.value) {
    activeIndex.value = index;
    updatePillPosition(index);
    
    // 滑動時經過的項目字體也要變大
    navItems.value.forEach((el, i) => {
      const text = el.querySelector('a');
      if (i === index) {
        gsap.to(text, { scale: 1.2, duration: 0.2 });
      } else {
        gsap.to(text, { scale: 1, duration: 0.2 });
      }
    });
  }
};

// 3. 點擊 (直接切換)
const handleClick = (index) => {
  activeIndex.value = index;
  updatePillPosition(index);
  const target = links.value[index];
  if (target.path) {
    router.push(target.path);
  }
};

// 4. 全域放開滑鼠 (停止拖曳)
const handleGlobalMouseUp = () => {
  if (isMouseDown.value) {
    isMouseDown.value = false;
    // 放開時彈回來
    gsap.to(pillRef.value, {
      scaleX: 1,
      scaleY: 1,
      duration: 0.4,
      ease: "elastic.out(1, 0.5)"
    });

    // 所有字體恢復大小
    navItems.value.forEach(el => {
      const text = el.querySelector('a');
      gsap.to(text, {
        scale: 1,
        duration: 0.4,
        ease: "elastic.out(1, 0.5)"
      });
    });
  }
};

// 滾動偵測
const handleScroll = () => {
  isScrolled.value = window.scrollY > 50;
};

// --- 手機版選單邏輯 ---
const isMobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
  // 鎖定/解鎖背景滾動
  document.body.style.overflow = isMobileMenuOpen.value ? 'hidden' : '';
};

const handleMobileLinkClick = (index) => {
  activeIndex.value = index;
  toggleMobileMenu();
  const target = links.value[index];
  if (target.path) {
    router.push(target.path);
  }
};

// --- GSAP Mobile Menu Animations ---
const onEnter = (el, done) => {
  // 1. 背景下滑
  gsap.fromTo(el, 
    { y: '-100%' },
    { 
      y: '0%', 
      duration: 0.6, 
      ease: 'power3.out' 
    }
  );

  // 2. 文字依序浮現 (Stagger)
  const links = el.querySelectorAll('.mobile-nav-link');
  gsap.fromTo(links,
    { y: 50, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      stagger: 0.1,
      delay: 0.2,
      ease: 'back.out(1.7)',
      onComplete: done
    }
  );
};

const onLeave = (el, done) => {
  // 1. 文字先消失
  const links = el.querySelectorAll('.mobile-nav-link');
  gsap.to(links, {
    y: -20,
    opacity: 0,
    duration: 0.3,
    stagger: 0.05,
    ease: 'power2.in'
  });

  // 2. 背景上收
  gsap.to(el, {
    y: '-100%',
    duration: 0.5,
    delay: 0.2, // 等文字消失一點再收背景
    ease: 'power3.in',
    onComplete: done
  });
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('mouseup', handleGlobalMouseUp);
  window.addEventListener('resize', handleResize);
  
  // 初始化膠囊位置 (等待 DOM 渲染完畢)
  nextTick(() => {
    if (navItems.value[0] && pillRef.value) {
      // 初始設定 (無動畫)
      updatePillPosition(activeIndex.value);
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('mouseup', handleGlobalMouseUp);
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <nav 
    class="navbar position-fixed top-0 start-0 w-100 z-3 transition-all"
    :class="{ 
      'scrolled-nav': isScrolled && !isMobileMenuOpen, 
      'transparent-nav': !isScrolled && !isMobileMenuOpen,
      'mobile-open': isMobileMenuOpen
    }"
  >
    <div class="container-fluid px-4">
      <div class="d-flex justify-content-between align-items-center w-100 position-relative" style="height: 60px;">
        
        <!-- Logo (網站名稱) -->
        <a href="#page-top" class="text-decoration-none z-3 d-flex align-items-center">
          <div class="brand-text">
            MyPortfolio
          </div>
        </a>

        <!-- 電腦版選單：液體玻璃膠囊 -->
        <div class="d-none d-lg-block position-absolute start-50 translate-middle-x z-1">
          <!-- 選單容器 (深色磨砂) -->
          <ul class="list-unstyled d-flex m-0 p-1 align-items-center glass-menu rounded-pill position-relative">
            
            <!-- 移動的膠囊 (亮色磨砂 + 液體動畫) -->
            <div 
              ref="pillRef"
              class="liquid-pill position-absolute rounded-pill"
            ></div>

            <!-- 選單項目 -->
            <li 
              v-for="(link, index) in links" 
              :key="index"
              ref="navItems"
              class="position-relative z-1 nav-item-wrapper"
              @mousedown="handleMouseDown(index)"
              @mouseenter="handleMouseEnter(index)"
              @click="handleClick(index)"
            >
              <a 
                href="javascript:void(0)" 
                class="nav-link-custom"
                :class="{ 'active-text': activeIndex === index }"
              >
                {{ link.name }}
              </a>
            </li>
          </ul>
        </div>



        <!-- 手機版漢堡選單 -->
        <button 
          class="hamburger-btn d-lg-none p-0 border-0 z-3 bg-transparent position-relative me-5"
          @click="toggleMobileMenu"
          aria-label="Toggle navigation"
        >
          <div class="hamburger-icon" :class="{ 'active': isMobileMenuOpen }">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>

      </div>
    </div>

    <!-- 手機版全螢幕選單 -->
    <transition 
      @enter="onEnter"
      @leave="onLeave"
      :css="false"
    >
      <div 
        v-if="isMobileMenuOpen" 
        class="mobile-menu-overlay d-lg-none position-fixed top-0 start-0 w-100 h-100 z-2"
      >
        <div class="mobile-menu-bg"></div>
        <ul class="list-unstyled d-flex flex-column align-items-center justify-content-start h-100 m-0 p-0 z-3 pt-5 mt-5">
          <li 
            v-for="(link, index) in links" 
            :key="index" 
            class="mb-4 mobile-nav-item"
          >
            <a 
              href="javascript:void(0)" 
              class="mobile-nav-link justify-content-center"
              :class="{ 'active': activeIndex === index }"
              @click="handleMobileLinkClick(index)"
            >
              {{ link.name }}
            </a>
          </li>
        </ul>
      </div>
    </transition>
  </nav>
  
  <div style="height: 76px;"></div>
</template>

<style scoped>
ul {
  list-style-type: none;
}

/* --- 核心動畫設定 --- */

/* 1. 選單容器：深色磨砂玻璃 */
.glass-menu {
  background: rgba(255, 255, 255, 0.05); /* 改為極淡的白色，增加通透感 */
  backdrop-filter: blur(16px); /* 增加模糊度 */
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); /* 更柔和的陰影 */
  padding: 6px !important; /* 增加內距，讓膠囊有更多空間 */
}

/* 2. 移動膠囊：透明玻璃質感 */
.liquid-pill {
  height: calc(100% - 12px); /* 配合 padding 調整高度 */
  top: 6px;
  border-radius: 50px; /* 確保圓潤 */
  
  /* 透明玻璃質感 (增強邊框與背景可視度) */
  background: rgba(255, 255, 255, 0.1); /* 更淡的背景，更像玻璃 */
  backdrop-filter: blur(12px); /* 膠囊本身的磨砂 */
  border: 1px solid rgba(255, 255, 255, 0.6); /* 邊框更亮更細 */
  box-shadow: 
    0 4px 20px rgba(255, 255, 255, 0.15), /* 白色光暈 */
    inset 0 0 15px rgba(255, 255, 255, 0.2); /* 內部高光增強 */

  /* 移除 CSS transition，改用 GSAP */
  pointer-events: none;
  opacity: 0; /* 初始隱藏，由 GSAP 顯示 */
}

/* 3. 文字樣式 */
.nav-item-wrapper {
  cursor: pointer;
  user-select: none; /* 防止拖曳時選取到文字 */
}

.nav-link-custom {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  padding: 10px 36px; /* 增加間距，讓整體 UL 更寬 */
  border-radius: 30px; /* 增加圓角 */
  font-size: 15px; /* 字體稍微加大 */
  font-weight: 500;
  transition: all 0.3s ease;
  display: block;
  transform: scale(1);
}

/* 激活狀態的文字：改為純白，增加發光感 */
.active-text {
  color: #ffffff !important; /* 純白 */
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.6); /* 白色光暈 */
  transform: scale(1.1); /* 稍微放大 */
  font-weight: 600;
}

/* --- 其他通用樣式 (Logo, 按鈕等) --- */
.transition-all {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.transparent-nav {
  background-color: #212529;
  backdrop-filter: blur(5px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 10px 0;
}

.scrolled-nav {
  background-color: #0a0f1e; /* 滾動後變為純黑 (與手機版選單一致) */
  backdrop-filter: none; /* 移除模糊，保持一致的實心質感 */
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.8);
}

.mobile-open {
  background-color: transparent !important;
  backdrop-filter: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
}

/* 網站名稱樣式 */
.brand-text {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  /* 漸層文字效果 */
  background: linear-gradient(135deg, #ffffff 0%, #a5f3fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  display: flex;
  align-items: center;
}

.hamburger-btn {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px; /* 增加點擊區域 */
  height: 48px;
  outline: none;
}

.hamburger-icon {
  width: 24px;
  height: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 10;
}
.hamburger-icon span {
  display: block;
  height: 2px;
  width: 100%;
  background: white;
  border-radius: 2px;
  transition: all 0.3s ease;
  transform-origin: center;
}

/* 漢堡按鈕動畫狀態 */
.hamburger-icon.active span:nth-child(1) {
  transform: translateY(9px) rotate(45deg);
}

.hamburger-icon.active span:nth-child(2) {
  opacity: 0;
}

.hamburger-icon.active span:nth-child(3) {
  transform: translateY(-9px) rotate(-45deg);
}

/* --- 手機版選單樣式 --- */
.mobile-menu-overlay {
  background-color: #0a0f1e; /* 純黑背景，解決卡頓並遮擋雜亂背景 */
  will-change: transform;
}

.mobile-nav-link {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.3);
  text-decoration: none;
  display: block;
  text-align: center;
  letter-spacing: 2px;
  text-transform: uppercase;
  
  /* 非當前頁面：灰色 */
  color: rgba(255, 255, 255, 0.35); 
  text-shadow: none;
    
  transition: color 0.3s ease;
  
  /* 移除 CSS 動畫，改由 GSAP 控制 */
  opacity: 0; 
  will-change: transform, opacity;
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  color: #ffffff; /* 當前頁面：純白 */
  text-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
  transform: scale(1.05);
}
</style>