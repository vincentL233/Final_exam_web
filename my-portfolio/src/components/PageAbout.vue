<script setup>
// ==========================================
// 模組與設定 (Imports & Config)
// ==========================================
import { onMounted, ref, onUnmounted, onBeforeUpdate } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(ScrollTrigger, Draggable);

// ==========================================
// 資料與內容 (Data & Content)
// ==========================================

const skills = [
  { name: "Frontend Development", items: ["Vue.js", "React", "GSAP", "Tailwind CSS"] },
  { name: "UI/UX Design", items: ["Figma", "Adobe XD", "Prototyping", "User Research"] },
  { name: "Backend & Tools", items: ["Node.js", "Git", "Webpack", "Vite"] }
];

const baseExperiences = [
  { year: "2023 - Present", role: "Senior Frontend Developer", company: "Tech Solutions Inc.", desc: "Leading the frontend team in building scalable web applications." },
  { year: "2021 - 2023", role: "UI/UX Designer", company: "Creative Studio", desc: "Designed intuitive user interfaces for mobile and web platforms." },
  { year: "2019 - 2021", role: "Junior Developer", company: "StartUp Hub", desc: "Collaborated with cross-functional teams to deliver MVP products." }
];

// 重複資料以實現無限循環效果
const experiences = ref([...baseExperiences, ...baseExperiences, ...baseExperiences, ...baseExperiences]);

// ==========================================
// DOM 元素參考 (Refs & DOM Elements)
// ==========================================

const horizontalWrapper = ref(null);
const scrollContainer = ref(null);
const cardRefs = ref([]);
const scannerRef = ref(null);

let ctx;
let updateScanner; // 定義在外部範圍以便稍後清理

// ==========================================
// 動畫函式 (Animation Functions)
// ==========================================

/**
 * 1. Hero 區塊的視差效果 (Hero Parallax Effect)
 */
const initHeroParallax = () => {
    gsap.to(".hero-image-wrapper", {
      yPercent: 50,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    gsap.to(".hero-content", {
      yPercent: -20,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });
};

/**
 * 2. 具備拖曳功能的無限水平滾動 (Infinite Horizontal Loop with Drag)
 */
const initInfiniteLoop = () => {
    if (!scrollContainer.value || !horizontalWrapper.value) return;

    const container = scrollContainer.value;
    const totalWidth = container.scrollWidth;
    const singleSetWidth = totalWidth / 4; 
      
    // 建立無限循環動畫
    const loopAnim = gsap.to(container, {
      x: -singleSetWidth,
      duration: 20, 
      ease: "none",
      repeat: -1,
      paused: false
    });

    // 拖曳代理元素
    const proxy = document.createElement("div");
      
    Draggable.create(proxy, {
      trigger: horizontalWrapper.value,
      type: "x",
      onPress() {
        loopAnim.pause();
        horizontalWrapper.value.style.cursor = "grabbing";
      },
      onDrag() {
        const pxPerSecond = singleSetWidth / 20;
        const timeDelta = -this.deltaX / pxPerSecond;
        loopAnim.totalTime(loopAnim.totalTime() + timeDelta);
      },
      onRelease() {
        loopAnim.play();
        horizontalWrapper.value.style.cursor = "grab";
      }
    });
};

/**
 * 3. 掃描器特效邏輯 (Scanner Effect Logic)
 */
const initScannerEffect = () => {
    updateScanner = () => {
      if (!scannerRef.value) return;
      
      const scannerRect = scannerRef.value.getBoundingClientRect();
      const scannerCenter = scannerRect.left + scannerRect.width / 2;
      const cards = Array.isArray(cardRefs.value) ? cardRefs.value : [];

      cards.forEach(card => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        
        // 計算交集位置
        let revealPercentage = 0;
        if (rect.right < scannerCenter) {
          revealPercentage = 100;
        } else if (rect.left > scannerCenter) {
          revealPercentage = 0;
        } else {
          const distancePastScanner = scannerCenter - rect.left;
          revealPercentage = (distancePastScanner / rect.width) * 100;
        }

        revealPercentage = Math.max(0, Math.min(100, revealPercentage));
        card.style.setProperty('--reveal-pos', `${revealPercentage}%`);
      });
    };

    gsap.ticker.add(updateScanner);
};

/**
 * 4. 浮動形狀視差 (Floating Shapes Parallax)
 */
const initFloatingShapes = () => {
    gsap.utils.toArray(".floating-shape").forEach((shape, i) => {
      gsap.to(shape, {
        y: (i + 1) * 200,
        rotation: 360,
        ease: "none",
        scrollTrigger: {
          trigger: ".about-page",
          start: "top top",
          end: "bottom top",
          scrub: 1
        }
      });
    });
};

/**
 * 5. 理念區塊 (Apple 風格文字揭示) (Philosophy Section)
 */
const initPhilosophySection = () => {
    const philosophyTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".philosophy-section",
        start: "top top",
        end: "+=3000", 
        pin: true,
        scrub: 1,
      }
    });

    const phrases = gsap.utils.toArray(".philosophy-text");
    
    phrases.forEach((phrase, i) => {
      philosophyTl.fromTo(phrase, 
        { opacity: 0, y: 100, filter: "blur(10px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, ease: "power2.out" }
      );
      
      philosophyTl.to(phrase, { duration: 1 }); 

      if (i < phrases.length - 1) {
        philosophyTl.to(phrase, 
          { opacity: 0, y: -100, filter: "blur(10px)", duration: 1, ease: "power2.in" }
        );
      }
    });
};

/**
 * 6. Hero 與通用進場動畫 (Hero & General Animations)
 */
const initHeroAnimation = () => {
    gsap.from(".hero-title", {
      y: 100,
      opacity: 0,
      duration: 1,
      ease: "power4.out",
      delay: 0.2
    });

    gsap.from(".hero-image", {
      scale: 0.8,
      opacity: 0,
      duration: 1.2,
      ease: "power2.out",
      delay: 0.4
    });
};

const initFadeUpAnimations = () => {
    gsap.utils.toArray('.fade-up').forEach(el => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none reverse"
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out"
      });
    });
};

// ==========================================
// 生命週期鉤子 (Lifecycle Hooks)
// ==========================================

onMounted(() => {
  ctx = gsap.context(() => {
    initHeroParallax();
    initInfiniteLoop();
    initScannerEffect();
    initFloatingShapes();
    initPhilosophySection();
    initHeroAnimation();
    initFadeUpAnimations();
  });
});

onBeforeUpdate(() => {
  cardRefs.value = [];
});

onUnmounted(() => {
  ctx && ctx.revert();
  if (updateScanner) {
    gsap.ticker.remove(updateScanner);
  }
});
</script>

<template>
  <div class="about-page">
    <!-- 浮動背景形狀 -->
    <div class="floating-shape shape-1"></div>
    <div class="floating-shape shape-2"></div>
    <div class="floating-shape shape-3"></div>

    <div class="container">
      
      <!-- 主視覺區塊 (Hero Section) -->
      <section class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">
            Crafting digital <br>
            <span class="highlight">experiences</span> with <br>
            passion & code.
          </h1>
          <p class="hero-subtitle fade-up">
            I am a creative developer based in Taiwan, dedicated to building accessible and immersive web experiences.
          </p>
        </div>
        <div class="hero-image-wrapper">
          <img src="https://placehold.co/600x800/1e293b/cbd5e1?text=Profile+Photo" alt="Profile" class="hero-image" />
        </div>
      </section>

      <!-- 個人簡介區塊 (Bio Section) -->
      <section class="bio-section fade-up">
        <div class="section-header">
          <span class="section-label">01 / Biography</span>
          <h2>Who I Am</h2>
        </div>
        <div class="bio-content">
          <p>
            With over 5 years of experience in the digital industry, I bridge the gap between design and engineering. 
            I believe that great software is not just about code, but about how it makes people feel.
          </p>
          <p>
            My journey started with a curiosity for how things work on the web, which led me to master modern frontend technologies.
            When I'm not coding, you can find me exploring photography, reading sci-fi novels, or brewing the perfect cup of coffee.
          </p>
        </div>
      </section>

    </div>

    <!-- 設計哲學區塊 (Philosophy Section) -->
    <section class="philosophy-section">
      <div class="philosophy-content">
        <h2 class="philosophy-text">Design is not just what it looks like.</h2>
        <h2 class="philosophy-text">Design is how it <span class="highlight-text">works</span>.</h2>
        <h2 class="philosophy-text">Simplicity is the ultimate <span class="highlight-text">sophistication</span>.</h2>
        <h2 class="philosophy-text">I build experiences that <span class="highlight-text">matter</span>.</h2>
      </div>
    </section>

    <!-- 經歷區塊 (Experience Section - 包含水平滾動) -->
    <section class="experience-section">
      <!-- 掃描線特效 -->
      <div class="scanner" ref="scannerRef"></div>

      <div class="container section-header-wrapper">
        <div class="section-header">
          <span class="section-label">02 / Experience</span>
          <h2>My Journey</h2>
          <p class="scroll-hint">Scroll down to explore &rarr;</p>
        </div>
      </div>
      
      <div class="horizontal-scroll-wrapper" ref="horizontalWrapper">
        <div class="horizontal-scroll-container" ref="scrollContainer">
          <div 
            v-for="(exp, index) in experiences" 
            :key="index" 
            class="exp-card"
            ref="cardRefs"
          >
            <!-- 一般層 (UI 顯示) -->
            <div class="card-normal">
              <div class="exp-year">{{ exp.year }}</div>
              <div class="exp-content">
                <h3>{{ exp.role }}</h3>
                <h4>{{ exp.company }}</h4>
                <p>{{ exp.desc }}</p>
              </div>
              <div class="exp-number">0{{ index + 1 }}</div>
            </div>

            <!-- 揭示層 (程式碼/ASCII 風格) -->
            <div class="card-revealed">
              <div class="code-content">
                <pre>
{
  "role": "{{ exp.role }}",
  "company": "{{ exp.company }}",
  "year": "{{ exp.year }}",
  "desc": "{{ exp.desc }}",
  "status": "COMPLETED"
}
                </pre>
              </div>
              <div class="matrix-overlay"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="container">
      <!-- 技能區塊 (Skills Section) -->
      <section class="skills-section fade-up">
        <div class="section-header">
          <span class="section-label">03 / Skills</span>
          <h2>What I Do</h2>
        </div>
        <div class="skills-grid">
          <div v-for="(skillGroup, index) in skills" :key="index" class="skill-card fade-up">
            <h3>{{ skillGroup.name }}</h3>
            <div class="skill-tags">
              <span v-for="item in skillGroup.items" :key="item" class="skill-tag">{{ item }}</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.about-page {
  background-color: #f8fafc;
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 40px 40px;
  color: #0f172a;
  min-height: 100vh;
  padding-top: 120px;
  padding-bottom: 100px;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  position: relative;
}

.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
}

/* Floating Shapes */
.floating-shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.6;
}

.shape-1 {
  top: 10%;
  left: -10%;
  width: 400px;
  height: 400px;
  background: #bae6fd;
}

.shape-2 {
  top: 40%;
  right: -5%;
  width: 300px;
  height: 300px;
  background: #e0f2fe;
}

.shape-3 {
  bottom: 10%;
  left: 20%;
  width: 250px;
  height: 250px;
  background: #f0f9ff;
}

/* Hero Section */
.hero-section {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 4rem;
  align-items: center;
  margin-bottom: 15rem; /* Increased for parallax space */
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 5rem;
  line-height: 1.1;
  font-weight: 800;
  margin-bottom: 2rem;
  letter-spacing: -0.02em;
}

.highlight {
  color: #0284c7;
  position: relative;
  display: inline-block;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #64748b;
  max-width: 500px;
  line-height: 1.6;
}

.hero-image-wrapper {
  position: relative;
  height: 600px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-image {
  width: 100%;
  height: 100%;
  background-image: url('https://placehold.co/600x800/1e293b/cbd5e1?text=Profile+Photo');
  background-size: cover;
  background-position: center;
  border-radius: 24px;
  box-shadow: 20px 20px 0px #cbd5e1;
}

/* Bio Section */
.bio-section {
  margin-bottom: 10rem;
  position: relative;
  z-index: 1;
}

.bio-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 6rem;
  align-items: start;
}

.bio-text h2 {
  font-size: 3rem;
  margin-bottom: 2rem;
  font-weight: 700;
}

.bio-text p {
  font-size: 1.2rem;
  line-height: 1.8;
  color: #475569;
  margin-bottom: 1.5rem;
}

.bio-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  background: #fff;
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.05);
}

.stat-number {
  display: block;
  font-size: 4rem;
  font-weight: 800;
  color: #0284c7;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 500;
}

/* Philosophy Section */
.philosophy-section {
  height: 100vh;
  background: #0f172a; /* Dark background for contrast */
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  margin-bottom: 0; /* Remove margin as it's full screen */
  z-index: 10; /* Ensure it stays on top when pinned */
}

.philosophy-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.philosophy-text {
  position: absolute;
  font-size: 4rem;
  font-weight: 800;
  text-align: center;
  max-width: 800px;
  line-height: 1.2;
  opacity: 0; /* Start hidden */
  padding: 0 2rem;
}

.highlight-text {
  background: linear-gradient(120deg, #38bdf8, #818cf8);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Horizontal Scroll Experience Section */
.experience-section {
  position: relative;
  padding: 4rem 0;
  margin-bottom: 10rem;
  overflow: hidden;
  z-index: 1;
}

.section-header-wrapper {
  margin-bottom: 4rem;
}

.scroll-hint {
  margin-top: 1rem;
  color: #94a3b8;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.horizontal-scroll-wrapper {
  width: 100%;
  overflow: hidden;
  /* Increased padding to ensure shadows are fully visible */
  padding: 40px 0 80px 0; 
  cursor: grab; /* Indicate draggable */
}

.horizontal-scroll-wrapper:active {
  cursor: grabbing;
}

.horizontal-scroll-container {
  display: flex;
  flex-wrap: nowrap; /* Ensure no wrapping */
  gap: 4rem;
  width: max-content; /* Force width to fit content */
  padding-left: 5vw;
  padding-right: 5vw;
  box-sizing: border-box;
  will-change: transform;
}

/* Scanner */
.scanner {
  position: absolute;
  left: 50%;
  top: 30%; /* Shortened to fit better */
  bottom: 15%;
  width: 2px;
  background: #00ff41; /* Hacker Green */
  transform: translateX(-50%);
  z-index: 10;
  box-shadow: 0 0 15px #00ff41, 0 0 30px #00ff41;
  pointer-events: none;
  opacity: 0.8;
  animation: scannerPulse 1.5s infinite alternate;
}

.exp-card {
  width: 80vw;
  max-width: 600px;
  flex-shrink: 0;
  position: relative;
  height: 400px;
  background: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
}

.card-normal, .card-revealed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 4rem;
  border-radius: 32px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  transition: none;
}

.card-normal {
  background: #fff;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border: 1px solid #e2e8f0;
  z-index: 1;
}

.card-revealed {
  background: #0f172a; /* Dark Slate */
  border: 1px solid #334155;
  z-index: 2;
  clip-path: inset(0 calc(100% - var(--reveal-pos, 0%)) 0 0);
}

/* Code Content Styling */
.code-content {
  font-family: 'Courier New', monospace;
  color: #00ff41;
  font-size: 1rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow: hidden;
  opacity: 0.9;
  text-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
  display: flex;
  align-items: center;
  height: 100%;
  animation: textGlitch 3s infinite alternate;
}

@keyframes textGlitch {
  0% { opacity: 0.9; text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
  50% { opacity: 1; text-shadow: 0 0 10px rgba(0, 255, 65, 0.8), 2px 0 0 rgba(255,0,0,0.5); }
  100% { opacity: 0.9; text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
}

.code-content pre {
  margin: 0;
}

.matrix-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  background-size: 100% 2px, 3px 100%;
  pointer-events: none;
  z-index: 4;
  opacity: 0.3;
}

/* Scanner Pulse */
@keyframes scannerPulse {
  0% { box-shadow: 0 0 15px #00ff41, 0 0 30px #00ff41; opacity: 0.8; }
  100% { box-shadow: 0 0 20px #00ff41, 0 0 40px #00ff41; opacity: 1; }
}

.exp-year {
  font-family: monospace;
  color: #0284c7;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.exp-content h3 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  line-height: 1.1;
}

.exp-content h4 {
  font-size: 1.5rem;
  color: #64748b;
  margin-bottom: 2rem;
  font-weight: 500;
}

.exp-content p {
  font-size: 1.1rem;
  color: #475569;
  line-height: 1.6;
}

.exp-number {
  position: absolute;
  bottom: 0px; /* Fully visible bottom */
  right: 20px;
  font-size: 10rem;
  font-weight: 900;
  color: #f1f5f9;
  z-index: 0;
  pointer-events: none;
  line-height: 1;
  transform: translateY(10%); /* Slight offset to look grounded but not cut */
}

.exp-content {
  position: relative;
  z-index: 1;
}

/* Skills Section */
.skills-section {
  margin-bottom: 8rem;
  position: relative;
  z-index: 1;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.skill-card {
  background: #fff;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  transition: transform 0.3s ease;
}

.skill-card:hover {
  transform: translateY(-5px);
}

.skill-card h3 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 0.5rem;
  display: inline-block;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.skill-tag {
  background: #f1f5f9;
  color: #475569;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .hero-section {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 3rem;
    margin-bottom: 8rem;
  }

  .hero-title {
    font-size: 3.5rem;
  }

  .hero-subtitle {
    margin: 0 auto;
  }

  .hero-image-wrapper {
    max-width: 500px;
    height: 500px;
    margin: 0 auto;
  }

  .bio-grid {
    grid-template-columns: 1fr;
    gap: 4rem;
  }

  .bio-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .exp-card {
    width: 85vw; /* Slightly wider on tablet/mobile */
    padding: 2.5rem; /* Reduce padding on smaller screens */
    height: auto;
    min-height: 350px;
  }
  
  .horizontal-scroll-container {
    gap: 2rem; /* Reduce gap on smaller screens */
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .bio-stats {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .exp-card {
    width: 85vw;
    padding: 2rem;
  }
  
  .exp-content h3 {
    font-size: 1.8rem;
  }
}
</style>