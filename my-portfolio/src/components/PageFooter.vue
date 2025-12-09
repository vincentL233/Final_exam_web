<script setup>
import { ref, onMounted } from 'vue';
import gsap from 'gsap';

const currentYear = new Date().getFullYear();
const ctaTitleRef = ref(null);

onMounted(() => {
  // GSAP Gradient Text Flow Animation
  gsap.to(ctaTitleRef.value, {
    backgroundPosition: "200% center",
    duration: 3, // Faster for more visible effect
    repeat: -1,
    ease: "none"
  });
});

const socialLinks = [
  { name: 'GitHub', url: '#' },
  { name: 'LinkedIn', url: '#' },
  { name: 'Twitter', url: '#' },
  { name: 'Instagram', url: '#' }
];

const footerLinks = [
  'Home', 'Services', 'Portfolio', 'About', 'Contact'
];
</script>

<template>
  <footer class="footer-wrapper">
    <!-- 海浪動畫效果 -->
    <div class="waves-container">
      <svg class="waves" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="0 24 150 28" preserveAspectRatio="none" shape-rendering="auto">
        <defs>
          <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
        </defs>
        <g class="parallax">
          <!-- 改為帶有藍色調的半透明波浪，增加可見度與層次感 -->
          <use xlink:href="#gentle-wave" x="48" y="0" fill="rgba(56, 189, 248, 0.1)" />
          <use xlink:href="#gentle-wave" x="48" y="3" fill="rgba(56, 189, 248, 0.2)" />
          <use xlink:href="#gentle-wave" x="48" y="5" fill="rgba(56, 189, 248, 0.3)" />
          <!-- 最底層保持與 Footer 背景一致 -->
          <use xlink:href="#gentle-wave" x="48" y="7" fill="#0a0f1e" />
        </g>
      </svg>
    </div>

    <div class="container position-relative z-1">
      <!-- CTA Section -->
      <div class="cta-section text-center">
        <h2 class="cta-title" ref="ctaTitleRef">Ready to create something extraordinary?</h2>
        <p class="cta-text text-white-50 mb-4">Let's turn your ideas into reality.</p>
        <a href="mailto:hello@example.com" class="cta-button">
          Start a Conversation
        </a>
      </div>

      <hr class="footer-divider">

      <div class="footer-content">
        <div class="row align-items-center justify-content-between gy-4">
            <!-- Brand -->
            <div class="col-md-4 text-center text-md-start">
                <a href="#page-top" class="text-decoration-none">
                  <div class="brand-text">MyPortfolio</div>
                </a>
                <div class="social-links mt-3 d-flex justify-content-center justify-content-md-start gap-3">
                    <a v-for="social in socialLinks" :key="social.name" :href="social.url" class="social-link">
                      {{ social.name }}
                    </a>
                </div>
            </div>
            
            <!-- Links & Copyright -->
            <div class="col-md-8 text-center text-md-end">
                <nav class="footer-nav mb-3">
                    <a v-for="link in footerLinks" :key="link" href="#" class="footer-nav-link">{{ link }}</a>
                </nav>
                <p class="copyright m-0 text-white-50 small">&copy; {{ currentYear }} MyPortfolio. All rights reserved.</p>
            </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-wrapper {
  background-color: #0a0f1e; /* Match Header Black */
  padding: 0 0 40px; /* Remove top padding as waves take space */
  color: white;
  position: relative;
  margin-top: 0; /* Remove margin, let waves overlap naturally */
  z-index: 2; /* Ensure footer waves sit on top of main content */
}

/* Waves Animation */
.waves-container {
  position: absolute;
  top: -100px; /* Move waves up to sit on top of footer */
  left: 0;
  width: 100%;
  height: 100px;
  overflow: hidden;
  line-height: 0;
}

.waves {
  position: relative;
  width: 100%;
  height: 100%;
  margin-bottom: -7px; /* Fix for safari gap */
}

.parallax > use {
  animation: move-forever 25s cubic-bezier(.55,.5,.45,.5) infinite;
}
.parallax > use:nth-child(1) {
  animation-delay: -2s;
  animation-duration: 7s;
}
.parallax > use:nth-child(2) {
  animation-delay: -3s;
  animation-duration: 10s;
}
.parallax > use:nth-child(3) {
  animation-delay: -4s;
  animation-duration: 13s;
}
.parallax > use:nth-child(4) {
  animation-delay: -5s;
  animation-duration: 20s;
}

@keyframes move-forever {
  0% {
   transform: translate3d(-90px,0,0);
  }
  100% { 
    transform: translate3d(85px,0,0);
  }
}

/* CTA Section */
.cta-section {
  margin-bottom: 80px;
  padding-top: 80px; /* Increased spacing from waves */
}

.cta-title {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -1px;
  margin-bottom: 2.5rem; /* Increased margin */
  padding-bottom: 0.2em; /* Prevent descender clipping */
  
  /* Cool Gradient Animation - High Contrast */
  background: linear-gradient(
    90deg, 
    #ffffff 0%, 
    #38bdf8 25%, 
    #ffffff 50%, 
    #38bdf8 75%, 
    #ffffff 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  /* Animation handled by GSAP */
}

/* Removed @keyframes text-flow since we use GSAP now */

.cta-text {
  font-size: 1.2rem;
  max-width: 600px;
  margin: 0 auto;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  padding: 16px 32px;
  background: white;
  color: #0a0f1e;
  border-radius: 50px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  margin-top: 2rem;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(255, 255, 255, 0.15);
  background: #f8fafc;
}

/* Divider */
.footer-divider {
  border-color: rgba(255, 255, 255, 0.1);
  margin-bottom: 40px;
}

/* Brand */
.brand-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  letter-spacing: -0.5px;
}

/* Social Links */
.social-link {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2rem;
  transition: color 0.2s;
}

.social-link:hover {
  color: white;
}

/* Footer Nav */
.footer-nav-link {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  margin-left: 2rem;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.footer-nav-link:first-child {
  margin-left: 0;
}

.footer-nav-link:hover {
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .footer-wrapper {
    margin-top: 0; /* Remove margin to let waves overlap content */
  }
  
  .waves-container {
    height: 60px;
    top: -59px; /* Slightly adjust to avoid gap line */
  }

  .cta-title {
    font-size: 2.5rem;
  }

  .footer-nav-link {
    display: inline-block;
    margin: 0 10px;
  }
  
  .footer-nav-link:first-child {
    margin-left: 10px;
  }
}
</style>