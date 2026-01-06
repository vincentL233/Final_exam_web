<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref(null);
let ctx = null;
let animationFrameId = null;
let particles = [];
const mouse = { x: null, y: null, radius: 150 };

// 軌道粒子系統 (桌面版)
class Particle {
    constructor(baseRadius, ringIndex) {
        this.ringIndex = ringIndex;
        // 減少隨機分佈寬度，讓圓圈線條更清晰，不再雜亂
        this.baseRadius = baseRadius + (Math.random() * 80 - 5); 
        this.angle = Math.random() * Math.PI * 2;
        
        // 轉速：內圈快，外圈慢
        this.speed = (0.002 - ringIndex * 0.0002) + Math.random() * 0.0002;
        
        this.baseSize = Math.random() * 3 + 1.5; // 稍微加大一點點讓粒子明顯
        this.size = this.baseSize;
        
        // 顏色參數 (HSLA) - 鎖定在藍色/青色系
        this.baseHue = 195 + Math.random() * 15; 
        this.baseLightness = 60 + Math.random() * 20; // 稍微亮一點
        this.opacity = Math.random() * 0.5 + 0.3;
        
        // 個體呼吸參數
        this.breathOffset = Math.random() * Math.PI * 2;
        // 形狀變形參數 (控制點 -> 棒狀的變化)
        this.morphOffset = Math.random() * Math.PI * 2;
    }

    update(centerX, centerY, time) {
        // 1. 公轉
        this.angle += this.speed;
        
        // 2. 規律呼吸 (整體縮放)
        const breathing = Math.sin(time * 1 + this.ringIndex) * 5;
        
        // 保持圓形的半徑
        const currentRadius = this.baseRadius + breathing;
        
        // 3. 計算基礎位置 (稍微壓扁 Y 軸變成橢圓，增加透視感)
        let x = centerX + Math.cos(this.angle) * currentRadius;
        let y = centerY + Math.sin(this.angle) * (currentRadius ); // 0.75 壓扁係數

        // 4. 整體上下波動 (Wave)
        // 讓整個圓環隨著時間上下浮動
        const waveY = Math.sin(time * 1.2 + x * 0.002) * 70;
        y += waveY;

        this.x = x;
        this.y = y;

        // 5. 個體呼吸 (大小與顏色微調)
        const breath = Math.sin(time * 2 + this.breathOffset);
        this.size = this.baseSize + breath * 1.0; 
        
        // 6. 形狀變形 (Morphing): 點 -> 棒 -> 點
        // 使用 sin 波控制拉伸比例，讓粒子在圓點與短棒之間循環變化
        const morph = Math.sin(time * 2 + this.morphOffset);
        // 映射到 1.0 (圓) ~ 4.0 (棒)
        this.stretch = 1 + (morph + 1) * 1.5; 
        
        const currentHue = this.baseHue + breath * 10; 
        const currentLightness = this.baseLightness + breath * 10;
        
        this.color = `hsla(${currentHue}, 85%, ${currentLightness}%, ${this.opacity})`;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        // 旋轉以切線方向排列 (沿著軌道方向)
        // this.angle 是相對於中心的角度，加 90 度即為切線方向
        ctx.rotate(this.angle + Math.PI / 2);
        
        ctx.beginPath();
        // 使用 ellipse 繪製，x 軸根據 stretch 拉伸
        // size 是短軸半徑 (厚度)，size * stretch 是長軸半徑 (長度)
        ctx.ellipse(0, 0, Math.max(0.1, this.size * this.stretch), Math.max(0.1, this.size), 0, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

// 手機版浮動粒子系統 (Bokeh Effect) - 夢幻氣泡
class MobileParticle {
    constructor(width, height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // 隨機大小，製造景深感
        this.radius = Math.random() * 15 + 5; 
        
        // 緩慢漂浮
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        
        // 顏色參數
        this.hue = 195 + Math.random() * 30; 
        this.opacity = Math.random() * 0.3 + 0.1;
        
        // 閃爍參數
        this.pulseSpeed = Math.random() * 0.03 + 0.01;
        this.pulseOffset = Math.random() * Math.PI * 2;
    }

    update(width, height, time) {
        this.x += this.vx;
        this.y += this.vy;

        // 邊界反彈
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = height + this.radius;
        if (this.y > height + this.radius) this.y = -this.radius;

        // 呼吸閃爍效果
        this.currentOpacity = this.opacity + Math.sin(time * 2 + this.pulseOffset) * 0.05;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 85%, 60%, ${Math.max(0, this.currentOpacity)})`;
        ctx.fill();
    }
}

// 初始化粒子
let currentMouseX = 0;
let currentMouseY = 0;
let time = 0;
const ringCount = 7; // 增加圈數 (5 -> 9)
let isMobile = false;

const initParticles = (width, height) => {
  particles = [];
  isMobile = width < 768; // 判斷是否為手機版

  if (isMobile) {
      // 手機版：生成浮動氣泡
      const count = 35; // 粒子數量適中
      for (let i = 0; i < count; i++) {
          particles.push(new MobileParticle(width, height));
      }
  } else {
      // 桌面版：原有軌道粒子
      currentMouseX = width / 2;
      currentMouseY = height / 2;
      
      const startRadius = 120; // 稍微縮小內圈半徑，讓更多圈能塞進畫面
      const gap = 80; // 稍微縮小環距
      
      for (let r = 0; r < ringCount; r++) {
          // 密度控制
          const particleCount = 40 + r * 30; 
          const radius = startRadius + r * gap;
          
          for (let i = 0; i < particleCount; i++) {
              particles.push(new Particle(radius, r));
          }
      }
  }
};

// 動畫迴圈
const animate = () => {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  time += 0.01;
  
  if (isMobile) {
      // 手機版動畫
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(width, height, time);
        particles[i].draw(ctx);
      }
  } else {
      // 桌面版動畫
      // 滑鼠平滑跟隨 (增加慣性，像在水中拖曳)
      let targetX = mouse.x != null ? mouse.x : width / 2;
      let targetY = mouse.y != null ? mouse.y : height / 2;
      
      // 降低係數 0.08 -> 0.03，讓跟隨變得慵懶、有液體阻力感
      currentMouseX += (targetX - currentMouseX) * 0.03;
      currentMouseY += (targetY - currentMouseY) * 0.03;

      // 繪製軌道痕跡 (更淡，並加入浮動效果)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
      ctx.lineWidth = 1;
      for(let r=0; r<ringCount; r++) {
          // 配合粒子的呼吸幅度
          const radius = 120 + r * 80 + Math.sin(time * 1 + r) * 30;
          
          // 計算波動高度，取中心點附近的波動值
          const waveY = Math.sin(time * 1.5 + currentMouseX * 0.005) * 15;
          
          ctx.beginPath();
          // 畫橢圓，位置跟隨波動，並保持 0.75 的壓扁比例
          ctx.ellipse(currentMouseX, currentMouseY + waveY, radius, radius * 0.75, 0, 0, Math.PI * 2);
          ctx.stroke();
      }

      for (let i = 0; i < particles.length; i++) {
        particles[i].update(currentMouseX, currentMouseY, time);
        particles[i].draw(ctx);
      }
  }
  
  animationFrameId = requestAnimationFrame(animate);
};

const handleResize = () => {
    if(canvasRef.value) {
        canvasRef.value.width = window.innerWidth;
        canvasRef.value.height = window.innerHeight;
        initParticles(window.innerWidth, window.innerHeight);
    }
}

const handleMouseMove = (e) => {
    // 取得 canvas 相對於視窗的位置，確保滑鼠座標正確
    if (canvasRef.value) {
        const rect = canvasRef.value.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    }
}

const handleMouseLeave = () => {
    mouse.x = null;
    mouse.y = null;
}

const initCanvas = () => {
    if (canvasRef.value) {
        ctx = canvasRef.value.getContext('2d');
        canvasRef.value.width = window.innerWidth;
        canvasRef.value.height = window.innerHeight;
        initParticles(window.innerWidth, window.innerHeight);
        animate();
    }
};

const addEventListeners = () => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);
};

const removeEventListeners = () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseout', handleMouseLeave);
};

onMounted(() => {
    initCanvas();
    addEventListeners();
});

onUnmounted(() => {
    removeEventListeners();
    cancelAnimationFrame(animationFrameId);
});
</script>

<template>
    <main class="main-content">
        <!-- Canvas 互動背景 -->
        <canvas ref="canvasRef" class="particles-canvas"></canvas>

        <section class="intro-section">
            <div class="container text-center position-relative z-1">
                <h1 class="intro-title mb-4">Welcome to My Portfolio</h1>
                <p class="intro-text text-secondary mb-5">Discover my projects, skills, and experiences.</p>
                <div class="d-flex justify-content-center gap-3 action-buttons">
                    <a href="#portfolio" class="custom-btn btn-primary-glow">View Work</a>
                    <a href="#contact" class="custom-btn btn-outline-glow">Contact Me</a>
                </div>
            </div>
            
            <!-- Background Glow -->
            <div class="glow-bg"></div>
        </section>
    </main>
</template>

<style scoped>
.main-content {
    background: #ffffff;
    min-height: 85vh;
    display: flex;
    align-items: center;
    position: relative;
    /* overflow: hidden;  <-- 移除這行，因為它會裁切掉 Footer 向上延伸的海浪 */
    padding-bottom: 100px; /* 留出空間給 Footer 的海浪覆蓋 */
    z-index: 1; /* 確保內容層級 */
}

/* Canvas 背景 */
.particles-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0; /* 在內容之下 */
    pointer-events: none; /* 讓滑鼠事件穿透到下方 (如果需要點擊背景下的東西)，但這裡我們需要滑鼠互動，所以 JS 會監聽 window */
}

.intro-section {
    width: 100%;
    padding: 100px 0;
}

.intro-title {
    font-size: 4rem;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -1px;
    /* 增加更多色彩的漸層並加入動畫 */
    background: linear-gradient(to right, #0284c7, #38bdf8, #6366f1, #0284c7);
    background-size: 300% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 1.5rem;
    animation: textShine 6s linear infinite;
}

@keyframes textShine {
    to {
        background-position: 300% center;
    }
}

.intro-text {
    font-size: 1.25rem;
    max-width: 600px;
    margin: 0 auto;
}

/* Custom Buttons */
.custom-btn {
    display: inline-block;
    padding: 12px 32px;
    border-radius: 50px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    font-size: 1.1rem;
    position: relative;
    z-index: 1;
}

.btn-primary-glow {
    /* 改為漸層背景 */
    background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
    color: #ffffff;
    border: none;
    box-shadow: 0 4px 15px rgba(56, 189, 248, 0.4);
    overflow: hidden;
}

/* 按鈕光澤掃過效果 */
.btn-primary-glow::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: 0.5s;
}

.btn-primary-glow:hover::before {
    left: 100%;
    transition: 0.5s;
}

.btn-primary-glow:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(56, 189, 248, 0.6);
}

.btn-outline-glow {
    background: transparent;
    color: #0f172a;
    border: 2px solid rgba(15, 23, 42, 0.2);
}

.btn-outline-glow:hover {
    border-color: #38bdf8;
    color: #0284c7;
    background: rgba(56, 189, 248, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
}

/* Glow Effect */
.glow-bg {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
}

@media (max-width: 768px) {
    .intro-title {
        font-size: 2.5rem;
        margin-bottom: 1rem;
    }
    
    .intro-text {
        font-size: 1.1rem;
        padding: 0 20px;
        margin-bottom: 2rem !important;
    }

    .action-buttons {
        flex-direction: column;
        align-items: center;
        gap: 1rem !important;
    }

    .custom-btn {
        width: 80%;
        max-width: 280px;
        text-align: center;
        padding: 14px 32px; /* Slightly larger touch target */
    }

    .main-content {
        padding-top: 40px;
        align-items: center; /* Ensure vertical center */
    }
}
</style>