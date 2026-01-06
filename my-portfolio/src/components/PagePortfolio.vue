<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || '';

// 預設資料 (當後端沒有資料時使用)
const defaultProjects = [
  {
    id: 1,
    title: "E-Commerce Redesign",
    category: "Web Design / Development",
    year: "2024",
    image: "https://placehold.co/1200x800/1e293b/38bdf8?text=E-Commerce",
    description: "A complete overhaul of a fashion retailer's online presence, focusing on user experience and conversion optimization."
  },
  {
    id: 2,
    title: "Fintech Dashboard",
    category: "UI/UX Design",
    year: "2023",
    image: "https://placehold.co/1200x800/064e3b/34d399?text=Fintech",
    description: "Real-time data visualization platform for financial analysts, featuring dark mode and customizable widgets."
  },
  {
    id: 3,
    title: "Travel App",
    category: "Mobile App",
    year: "2023",
    image: "https://placehold.co/1200x800/4c1d95/a78bfa?text=Travel+App",
    description: "An AI-powered travel companion that helps users discover hidden gems and plan their perfect itinerary."
  },
  {
    id: 4,
    title: "Smart Home Hub",
    category: "IoT Interface",
    year: "2022",
    image: "https://placehold.co/1200x800/7c2d12/fdba74?text=Smart+Home",
    description: "Centralized control interface for smart home devices with voice integration and energy monitoring."
  }
];

const projects = ref(defaultProjects);
const wrapper = ref(null);
let ctx;

// 從後端獲取作品集資料
const fetchPortfolio = async () => {
  try {
    const response = await axios.get(`${API_URL}/portfolio`);
    if (response.data && response.data.length > 0) {
      projects.value = response.data;
      console.log('Portfolio data loaded from server:', response.data);
    } else {
      console.log('Using default portfolio data (server returned empty)');
    }
  } catch (error) {
    console.log('Using default portfolio data due to fetch error:', error.message);
  }
};

const initAnimations = () => {
  ctx = gsap.context(() => {
    const slides = gsap.utils.toArray('.slide');
    const totalSlides = slides.length;

    // 初始化幻燈片：隱藏除第一張以外的所有幻燈片
    gsap.set(slides, { autoAlpha: 0, zIndex: (i) => i });
    gsap.set(slides[0], { autoAlpha: 1 });

    // 為整個固定區域建立單一主時間軸
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper.value,
        start: "top top",
        end: `+=${totalSlides * 100}%`,
        pin: true,
        scrub: 1, // 平滑滾動
      }
    });

    slides.forEach((slide, i) => {
      if (i === totalSlides - 1) return; // 最後一張幻燈片保持可見

      const nextSlide = slides[i + 1];
      
      // 定義此過渡在主時間軸中的開始時間
      // 我們在時間軸中使用絕對定位來依序堆疊它們
      const startTime = i; 

      // 1. 當前幻燈片退出
      // 移除：不要淡出當前幻燈片圖片。
      // 保持完全可見以確保網格翻轉過渡期間無空隙。
      tl.to(slide.querySelector('.text-wrapper'), {
        y: -50,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in'
      }, startTime);
      
      // 2. 下一張幻燈片揭示
      // 在過渡開始時立即顯示下一張幻燈片
      tl.set(nextSlide, { autoAlpha: 1 }, startTime);
      
      // 初始隱藏真實圖片
      tl.set(nextSlide.querySelector('.project-img'), { opacity: 0 }, startTime);
      
      const gridCells = nextSlide.querySelectorAll('.grid-cell');
      
      // 動畫化網格單元
      tl.fromTo(gridCells, 
        { 
          opacity: 0,
          rotationY: 90, // 從邊緣 (90度) 開始，以便它們立即出現
          scale: 0.5 // 初始稍微縮小
        },
        { 
          opacity: 1,
          rotationY: 0,
          scale: 1,
          duration: 1,
          stagger: {
            amount: 0.8,
            grid: [10, 10],
            from: "random"
          },
          ease: 'back.out(1.7)'
        }, 
        startTime
      )
      // 最後淡入真實圖片
      .to(nextSlide.querySelector('.project-img'), { opacity: 1, duration: 0.2 }, startTime + 0.9);

      // 3. 下一張幻燈片內容進入
      tl.fromTo(nextSlide.querySelector('.text-wrapper'), 
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out'
        }, 
        startTime + 0.4
      );

    });

  }, wrapper.value);
};

onMounted(async () => {
  // 先嘗試從後端獲取資料
  await fetchPortfolio();
  
  // 初始化動畫
  initAnimations();
});

onUnmounted(() => {
  ctx && ctx.revert();
});
</script>

<template>
  <div class="portfolio-page">
    <!-- Slides Wrapper -->
    <div class="slides-wrapper" ref="wrapper">
      <div v-for="(project, index) in projects" :key="project.id" class="slide">
        <div class="slide-inner container">
          <div class="noise-overlay"></div>
          <div class="slide-content">
            <div class="image-wrapper">
              <img :src="project.image" class="project-img" :alt="project.title" />
              <!-- Grid Overlay for Transition -->
              <div class="grid-container">
                <div v-for="n in 100" :key="n" class="grid-cell" 
                     :style="{ 
                       backgroundImage: `url(${project.image})`,
                       backgroundPosition: `${((n-1)%10) * (100/9)}% ${Math.floor((n-1)/10) * (100/9)}%`
                     }">
                </div>
              </div>
            </div>
            
            <div class="text-wrapper">
              <div class="slide-meta">
                <span class="slide-number">0{{ index + 1 }}</span>
                <span class="slide-year">{{ project.year }}</span>
              </div>
              <h1 class="project-title">{{ project.title }}</h1>
              <h2 class="project-category">{{ project.category }}</h2>
              <p class="project-description">{{ project.description }}</p>
              <a href="#" class="project-link">View Case Study</a>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portfolio-page {
  background-color: #f8fafc; /* Light Theme */
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 40px 40px;
  color: #0f172a; /* Dark Text */
  font-family: 'Inter', sans-serif;
  overflow: hidden;
  min-height: 100vh;
}

/* Slides */
.slides-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: #f8fafc; /* Ensure solid background behind transparent slides */
}

.slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* background: #f8fafc; */ /* Removed to allow stacking */
  /* background-image: radial-gradient(#cbd5e1 1px, transparent 1px); */
  /* background-size: 40px 40px; */
  overflow: hidden;
}

.container {
  width: 90%;
  max-width: 1400px;
  margin: 0 auto;
}

.slide-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
}

.noise-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  opacity: 0;
  /* Blocky Noise SVG */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 50 -15'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-size: 128px 128px; /* Scale up for block effect */
  image-rendering: pixelated; /* Hard edges */
  mix-blend-mode: exclusion; /* High contrast visibility */
}

.slide-content {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 6rem;
  align-items: center;
  width: 100%;
}

/* Image Styles */
.image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1); /* Softer shadow */
  background: transparent; /* Changed from #fff to transparent to prevent blocking */
  padding: 10px; /* Frame effect */
}

.grid-container {
  position: absolute;
  top: 10px; /* Match padding */
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  z-index: 2;
  pointer-events: none;
  perspective: 1000px; /* Enable 3D effect */
}

.grid-cell {
  width: 100%;
  height: 100%;
  background-size: 1000% 1000%; /* 10x10 grid */
  background-repeat: no-repeat;
  opacity: 0; /* Hidden by default */
  transform: rotateY(90deg); /* Initial flip state */
  backface-visibility: hidden;
}

.project-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
  border-radius: 16px;
}

/* Text Styles */
.text-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.slide-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  font-family: monospace;
  color: #64748b;
}

.slide-number {
  font-size: 1.2rem;
  color: #0284c7; /* Primary Blue */
  font-weight: 700;
}

.slide-year {
  padding: 0.2rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #64748b;
}

.project-title {
  font-size: 4rem;
  line-height: 1.1;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: #0f172a;
  background: none;
  -webkit-text-fill-color: initial;
}

.project-category {
  font-size: 1.5rem;
  color: #64748b;
  margin-bottom: 2rem;
  font-weight: 500;
}

.project-description {
  font-size: 1.1rem;
  line-height: 1.7;
  color: #475569;
  margin-bottom: 3rem;
  max-width: 500px;
}

.project-link {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 1rem 2rem;
  background: #0f172a;
  border: 1px solid #0f172a;
  border-radius: 50px;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.project-link:hover {
  background: #0284c7;
  border-color: #0284c7;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(2, 132, 199, 0.2);
}

/* Responsive */
@media (max-width: 1024px) {
  .slide-content {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
  }

  .text-wrapper {
    align-items: center;
    order: 2; /* Text below image */
  }

  .image-wrapper {
    order: 1; /* Image on top */
    max-height: 50vh;
  }

  .project-title {
    font-size: 3rem;
  }
}

@media (max-width: 768px) {
  .container {
    width: 90%;
    padding: 0 1rem;
  }

  .slide-content {
    gap: 2rem;
    padding-top: 2rem;
  }

  .image-wrapper {
    max-height: 40vh;
    border-radius: 16px;
  }

  .project-title {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .project-category {
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .project-description {
    font-size: 1rem;
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .project-link {
    padding: 0.8rem 1.5rem;
    font-size: 0.9rem;
  }
}
</style>