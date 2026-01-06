<script setup>
import { onMounted, ref, onUnmounted, computed, watch } from 'vue';
import axios from 'axios';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// API 基礎 URL
const API_URL = 'http://localhost:8080';

const infoRef = ref(null);
let ctx;

// --- 表單資料狀態 ---
const formName = ref('');
const formEmail = ref('');
const formMessage = ref('');

// --- 表單提交狀態 ---
const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref('');
const responseMessage = ref('');

// --- 服務選擇狀態 ---
const services = ref([
  { id: 'inquiry', title: 'General Inquiry', price: 0, desc: 'Questions, collaborations, or just saying hi.' },
  { id: 'consult', title: 'Tech Consultation', price: 50, desc: '1-hour deep dive into your technical challenges.' },
  { id: 'deposit', title: 'Project Deposit', price: 500, desc: 'Secure your slot and start the project immediately.' }
]);
const selectedService = ref(services.value[0]);

const selectService = (service) => {
  selectedService.value = service;
  // 如果切換到免費服務，重置信用卡表單
  if (service.price === 0) {
    isCardFlipped.value = false;
  }
};

// --- 信用卡狀態 ---
const cardName = ref("");
const cardNumber = ref("");
const cardMonth = ref("");
const cardYear = ref("");
const cardCvv = ref("");
const minCardYear = ref(new Date().getFullYear());
const amexCardMask = "#### ###### #####";
const otherCardMask = "#### #### #### ####";
const isCardFlipped = ref(false);
const focusElementStyle = ref(null);
const isInputFocused = ref(false);

// 焦點元素定位的 Refs
const cardNumberLabel = ref(null);
const cardNameLabel = ref(null);
const cardDateLabel = ref(null);
const focusElement = ref(null);

// 計算屬性
const getCardType = computed(() => {
  let number = cardNumber.value;
  let re = new RegExp("^4");
  if (number.match(re) != null) return "visa";

  re = new RegExp("^(34|37)");
  if (number.match(re) != null) return "amex";

  re = new RegExp("^5[1-5]");
  if (number.match(re) != null) return "mastercard";

  re = new RegExp("^6011");
  if (number.match(re) != null) return "discover";
  
  return "visa"; // 預設類型
});

const generateCardNumberMask = computed(() => {
  return getCardType.value === "amex" ? amexCardMask : otherCardMask;
});

const minCardMonth = computed(() => {
  if (parseInt(cardYear.value) === minCardYear.value) return new Date().getMonth() + 1;
  return 1;
});

const formattedCardName = computed(() => {
  return cardName.value.replace(/\s\s+/g, ' ');
});

// 監聽器
watch(cardYear, () => {
  if (cardMonth.value < minCardMonth.value) {
    cardMonth.value = "";
  }
});

// 方法
const flipCard = (status) => {
  isCardFlipped.value = status;
};

const focusInput = (e) => {
  isInputFocused.value = true;
  let targetRefName = e.target.dataset.ref;
  let target = null;

  if (targetRefName === 'cardNumber') target = cardNumberLabel.value;
  else if (targetRefName === 'cardName') target = cardNameLabel.value;
  else if (targetRefName === 'cardDate') target = cardDateLabel.value;

  if (target) {
    focusElementStyle.value = {
      width: `${target.offsetWidth}px`,
      height: `${target.offsetHeight}px`,
      transform: `translateX(${target.offsetLeft}px) translateY(${target.offsetTop}px)`
    }
  }
};

const blurInput = () => {
  setTimeout(() => {
    if (!isInputFocused.value) {
      focusElementStyle.value = null;
    }
  }, 300);
  isInputFocused.value = false;
};

const formatCardNumber = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    let mask = generateCardNumberMask.value;
    let formatted = '';
    let valueIdx = 0;
    
    for (let i = 0; i < mask.length; i++) {
        if (valueIdx >= value.length) break;
        if (mask[i] === '#') {
            formatted += value[valueIdx];
            valueIdx++;
        } else {
            formatted += mask[i];
        }
    }
    cardNumber.value = formatted;
};

const formatCardCvv = (e) => {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 4) value = value.slice(0, 4);
  cardCvv.value = value;
};

const handleSubmit = async () => {
  // 重置狀態
  submitError.value = '';
  submitSuccess.value = false;
  responseMessage.value = '';
  
  // 驗證表單
  if (!formName.value.trim() || !formEmail.value.trim() || !formMessage.value.trim()) {
    submitError.value = 'Please fill in all required fields.';
    return;
  }
  
  if (selectedService.value.price > 0) {
    // 這裡驗證信用卡詳細資訊
    if (!cardNumber.value || !cardName.value || !cardCvv.value) {
      submitError.value = 'Please fill in payment details.';
      return;
    }
  }
  
  // 開始提交
  isSubmitting.value = true;
  
  try {
    // 準備要發送的資料
    const contactData = {
      name: formName.value.trim(),
      email: formEmail.value.trim(),
      message: formMessage.value.trim(),
      service: selectedService.value.title,
      servicePrice: selectedService.value.price
    };
    
    console.log('Sending contact data:', contactData);
    
    // 使用 axios 發送 POST 請求到後端
    const response = await axios.post(`${API_URL}/contact`, contactData);
    
    console.log('Server response:', response.data);
    
    if (response.data.success) {
      // 取得新建立的聯絡記錄 ID
      const contactId = response.data.data._id;
      
      // 跳轉到後端的 EJS 成功頁面
      window.location.href = `${API_URL}/contact-success/${contactId}`;
      return; // 跳轉後不需要執行後續程式碼
    } else {
      submitError.value = response.data.message || 'Something went wrong. Please try again.';
    }
    
  } catch (error) {
    console.error('Error submitting contact form:', error);
    submitError.value = error.response?.data?.message || 'Network error. Please check your connection and try again.';
  } finally {
    isSubmitting.value = false;
  }
};

const initAnimations = () => {
    ctx = gsap.context(() => {
    // 標題動畫
    gsap.from(".contact-title span", {
      y: 100,
      opacity: 0,
      duration: 1,
      stagger: 0.1,
      ease: "power4.out",
    });

    // 服務卡片交錯動畫
    gsap.from(".service-card", {
      y: 30,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out",
      delay: 0.3,
      clearProps: "all"
    });

    // 表單淡入向上動畫
    gsap.from(".contact-form-wrapper", {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
      delay: 0.6,
    });
  });
}

onMounted(() => {
  cardNumber.value = ""; // 初始化
  initAnimations();
});

onUnmounted(() => {
  if (ctx) ctx.revert();
});
</script>

<template>
  <div class="contact-page">
    <div class="container">
      <div class="contact-header">
        <h1 class="contact-title">
          <span>Let's</span> <span>start</span> <span>a</span><br>
          <span class="highlight">conversation.</span>
        </h1>
        <p class="header-subtitle">Choose how you'd like to move forward.</p>
      </div>

      <!-- Service Selection -->
      <div class="service-selection">
        <div 
          v-for="service in services" 
          :key="service.id" 
          class="service-card"
          :class="{ 'active': selectedService.id === service.id }"
          @click="selectService(service)"
        >
          <div class="service-header">
            <h3>{{ service.title }}</h3>
            <span class="price" v-if="service.price > 0">${{ service.price }}</span>
            <span class="price free" v-else>Free</span>
          </div>
          <p>{{ service.desc }}</p>
          <div class="check-icon" v-if="selectedService.id === service.id">✓</div>
        </div>
      </div>

      <div class="contact-content">
        <!-- Left Column: Info -->
        <div class="contact-info" ref="infoRef">
          <div class="contact-info-item">
            <h3>Contact Details</h3>
            <p>Fill out the form to get started. For paid services, payment is processed securely via Stripe (Demo).</p>
          </div>

          <div class="contact-info-item">
            <h3>Email Me</h3>
            <a href="mailto:hello@example.com" class="contact-link">hello@example.com</a>
          </div>

          <div class="contact-info-item">
            <h3>Socials</h3>
            <div class="social-links">
              <a href="#" class="social-link">LinkedIn</a>
              <a href="#" class="social-link">GitHub</a>
              <a href="#" class="social-link">Twitter</a>
            </div>
          </div>
        </div>

        <!-- Right Column: Form + Payment -->
        <div class="contact-form-wrapper">
          <form @submit.prevent="handleSubmit" class="main-form">
            <!-- Success Message -->
            <transition name="slide-fade-up">
              <div v-if="submitSuccess" class="success-message">
                <div class="success-icon">✓</div>
                <p>{{ responseMessage }}</p>
              </div>
            </transition>
            
            <!-- Error Message -->
            <transition name="slide-fade-up">
              <div v-if="submitError" class="error-message">
                <p>{{ submitError }}</p>
              </div>
            </transition>
            
            <!-- Basic Info -->
            <div class="form-section-title">Your Details</div>
            <div class="form-group">
              <label>Name</label>
              <input type="text" v-model="formName" placeholder="John Doe" required :disabled="isSubmitting">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" v-model="formEmail" placeholder="john@example.com" required :disabled="isSubmitting">
            </div>
            <div class="form-group">
              <label>Message</label>
              <textarea rows="4" v-model="formMessage" placeholder="Tell me about your project..." required :disabled="isSubmitting"></textarea>
            </div>

            <!-- Payment Section (Conditional) -->
            <transition name="slide-fade-up">
              <div v-if="selectedService.price > 0" class="payment-section">
                <div class="form-section-title">Payment Details</div>
                <div class="card-form">
                  <div class="card-list">
                    <div class="card-item" :class="{ '-active' : isCardFlipped }">
                      <div class="card-item__side -front">
                        <div class="card-item__focus" :class="{'-active' : focusElementStyle }" :style="focusElementStyle" ref="focusElement"></div>
                        <div class="card-item__cover">
                          <!-- CSS Gradient Background -->
                          <div class="card-bg-gradient"></div>
                        </div>
                        
                        <div class="card-item__wrapper">
                          <div class="card-item__top">
                            <!-- CSS Chip -->
                            <div class="card-item__chip">
                              <div class="chip-line"></div>
                              <div class="chip-line"></div>
                              <div class="chip-line"></div>
                              <div class="chip-line"></div>
                            </div>
                            <div class="card-item__type">
                              <!-- Text Logo -->
                              <span class="card-type-text">{{ getCardType }}</span>
                            </div>
                          </div>
                          <label for="cardNumber" class="card-item__number" ref="cardNumberLabel">
                            <template v-if="getCardType === 'amex'">
                             <span v-for="(n, $index) in amexCardMask" :key="$index">
                              <transition name="slide-fade-up">
                                <div class="card-item__numberItem" v-if="$index > 4 && $index < 14 && cardNumber.length > $index && n.trim() !== ''">*</div>
                                <div class="card-item__numberItem" :class="{ '-active' : n.trim() === '' }" :key="$index" v-else-if="cardNumber.length > $index">{{cardNumber[$index]}}</div>
                                <div class="card-item__numberItem" :class="{ '-active' : n.trim() === '' }" v-else :key="$index + 1">{{n}}</div>
                              </transition>
                            </span>
                            </template>
                            <template v-else>
                              <span v-for="(n, $index) in otherCardMask" :key="$index">
                                <transition name="slide-fade-up">
                                  <div class="card-item__numberItem" v-if="$index > 4 && $index < 15 && cardNumber.length > $index && n.trim() !== ''">*</div>
                                  <div class="card-item__numberItem" :class="{ '-active' : n.trim() === '' }" :key="$index" v-else-if="cardNumber.length > $index">{{cardNumber[$index]}}</div>
                                  <div class="card-item__numberItem" :class="{ '-active' : n.trim() === '' }" v-else :key="$index + 1">{{n}}</div>
                                </transition>
                              </span>
                            </template>
                          </label>
                          <div class="card-item__content">
                            <label for="cardName" class="card-item__info" ref="cardNameLabel">
                              <div class="card-item__holder">Card Holder</div>
                              <transition name="slide-fade-up">
                                <div class="card-item__name" v-if="cardName.length" key="1">
                                  <transition-group name="slide-fade-right">
                                    <span class="card-item__nameItem" v-for="(n, $index) in formattedCardName" :key="$index + 1">{{n}}</span>
                                  </transition-group>
                                </div>
                                <div class="card-item__name" v-else key="2">Full Name</div>
                              </transition>
                            </label>
                            <div class="card-item__date" ref="cardDateLabel">
                              <label for="cardMonth" class="card-item__dateTitle">Expires</label>
                              <label for="cardMonth" class="card-item__dateItem">
                                <transition name="slide-fade-up">
                                  <span v-if="cardMonth" :key="cardMonth">{{cardMonth}}</span>
                                  <span v-else key="2">MM</span>
                                </transition>
                              </label>
                              /
                              <label for="cardYear" class="card-item__dateItem">
                                <transition name="slide-fade-up">
                                  <span v-if="cardYear" :key="cardYear">{{String(cardYear).slice(2,4)}}</span>
                                  <span v-else key="2">YY</span>
                                </transition>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="card-item__side -back">
                        <div class="card-item__cover">
                          <div class="card-bg-gradient"></div>
                        </div>
                        <div class="card-item__band"></div>
                        <div class="card-item__cvv">
                            <div class="card-item__cvvTitle">CVV</div>
                            <div class="card-item__cvvBand">
                              <span v-for="(n, $index) in cardCvv" :key="$index">*</span>
                          </div>
                            <div class="card-item__type">
                                <span class="card-type-text">{{ getCardType }}</span>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="card-form__inner">
                    <div class="card-input">
                      <label for="cardNumber" class="card-input__label">Card Number</label>
                      <input type="text" id="cardNumber" class="card-input__input" :value="cardNumber" @input="formatCardNumber" @focus="focusInput" @blur="blurInput" data-ref="cardNumber" autocomplete="off">
                    </div>
                    <div class="card-input">
                      <label for="cardName" class="card-input__label">Card Holders</label>
                      <input type="text" id="cardName" class="card-input__input" v-model="cardName" @focus="focusInput" @blur="blurInput" data-ref="cardName" autocomplete="off">
                    </div>
                    <div class="card-form__row">
                      <div class="card-form__col">
                        <div class="card-form__group">
                          <label for="cardMonth" class="card-input__label">Expiration Date</label>
                          <select class="card-input__input -select" id="cardMonth" v-model="cardMonth" @focus="focusInput" @blur="blurInput" data-ref="cardDate">
                            <option value="" disabled selected>Month</option>
                            <option :value="n < 10 ? '0' + n : n" v-for="n in 12" :disabled="n < minCardMonth" :key="n">
                                {{n < 10 ? '0' + n : n}}
                            </option>
                          </select>
                          <select class="card-input__input -select" id="cardYear" v-model="cardYear" @focus="focusInput" @blur="blurInput" data-ref="cardDate">
                            <option value="" disabled selected>Year</option>
                            <option :value="$index + minCardYear" v-for="(n, $index) in 12" :key="n">
                                {{$index + minCardYear}}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div class="card-form__col -cvv">
                        <div class="card-input">
                          <label for="cardCvv" class="card-input__label">CVV</label>
                          <input type="text" class="card-input__input" id="cardCvv" maxlength="4" :value="cardCvv" @input="formatCardCvv" @focus="flipCard(true)" @blur="flipCard(false)" autocomplete="off">
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>

            <div class="form-group submit-group">
              <button type="submit" class="submit-btn" :disabled="isSubmitting" :class="{ 'loading': isSubmitting }">
                <span v-if="isSubmitting" class="spinner"></span>
                <span v-else-if="selectedService.price > 0">Pay ${{ selectedService.price }} & Send</span>
                <span v-else>Send Message</span>
                <span v-if="!isSubmitting" class="arrow">→</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-page {
  background-color: #f8fafc;
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 40px 40px;
  color: #0f172a;
  min-height: 100vh;
  padding: 120px 0;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* Header */
.contact-header {
  margin-bottom: 4rem;
  text-align: center;
}

.contact-title {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #0f172a;
  margin-bottom: 1rem;
}

.contact-title span {
  display: inline-block;
}

.highlight {
  background: linear-gradient(120deg, #0ea5e9, #6366f1);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-subtitle {
  font-size: 1.2rem;
  color: #64748b;
}

/* Service Selection */
.service-selection {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 5rem;
}

.service-card {
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.service-card:hover {
  transform: translateY(-5px);
  border-color: #cbd5e1;
  box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}

.service-card.active {
  border-color: #0ea5e9;
  background: #f0f9ff;
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.service-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.price {
  font-weight: 800;
  font-size: 1.2rem;
  color: #0f172a;
}

.price.free {
  color: #10b981;
}

.service-card p {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
}

.check-icon {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #0ea5e9;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
}

/* Content Grid */
.contact-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 4rem;
}

/* Info Column */
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.contact-info-item h3 {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.contact-info-item p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #334155;
}

.contact-link {
  font-size: 1.2rem;
  color: #0f172a;
  text-decoration: none;
  border-bottom: 1px solid rgba(15, 23, 42, 0.2);
  padding-bottom: 2px;
  transition: all 0.3s ease;
}

.contact-link:hover {
  border-color: #0f172a;
}

.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.social-link {
  color: #0f172a;
  text-decoration: none;
  font-size: 1rem;
  position: relative;
}

/* Form Column */
.contact-form-wrapper {
  background: #fff;
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
}

.form-section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.form-group label {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.8rem 1rem;
  color: #0f172a;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s ease;
  resize: none;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0ea5e9;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.submit-btn {
  background: #0f172a;
  border: none;
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 50px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  font-weight: 600;
}

.submit-btn:hover {
  background: #1e293b;
  transform: translateY(-2px);
}

.submit-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  transform: none;
}

.submit-btn.loading {
  background: #64748b;
}

/* Spinner Animation */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Success Message */
.success-message {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
}

.success-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
}

.success-message p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
}

/* Error Message */
.error-message {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
}

.error-message p {
  margin: 0;
  font-size: 0.95rem;
}
.payment-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 2px dashed #e2e8f0;
}

.card-form {
  max-width: 100%;
  margin: auto;
  width: 100%;
}

.card-form__inner {
  background: #fff;
  /* box-shadow: 0 30px 60px 0 rgba(90, 116, 148, 0.4); */
  /* border-radius: 10px; */
  padding: 0;
  padding-top: 160px; /* Space for the card */
}

.card-form__row {
  display: flex;
  align-items: flex-start;
}

.card-form__col {
  flex: auto;
  margin-right: 35px;
}

.card-form__col:last-child {
  margin-right: 0;
}

.card-form__col.-cvv {
  max-width: 150px;
}

.card-form__group {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}

.card-form__group .card-input__input {
  flex: 1;
  margin-right: 15px;
}

.card-form__group .card-input__input:last-child {
  margin-right: 0;
}

.card-item {
  max-width: 400px;
  height: 250px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  z-index: 2;
  width: 100%;
}

.card-item.-active .card-item__side.-front {
  transform: perspective(1000px) rotateY(180deg) rotateX(0deg) rotateZ(0deg);
}

.card-item.-active .card-item__side.-back {
  transform: perspective(1000px) rotateY(0) rotateX(0deg) rotateZ(0deg);
}

.card-item__focus {
  position: absolute;
  z-index: 3;
  border-radius: 5px;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transition: all 0.35s cubic-bezier(0.71, 0.03, 0.56, 0.85);
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.65);
}

.card-item__focus.-active {
  opacity: 1;
}

.card-item__side {
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 20px 60px 0 rgba(14, 42, 90, 0.55);
  transform: perspective(2000px) rotateY(0deg) rotateX(0deg) rotate(0deg);
  transform-style: preserve-3d;
  transition: all 0.8s cubic-bezier(0.71, 0.03, 0.56, 0.85);
  backface-visibility: hidden;
  height: 100%;
  background: #1c1d27;
}

.card-item__side.-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transform: perspective(2000px) rotateY(-180deg) rotateX(0deg) rotate(0deg);
  z-index: 2;
  padding: 0;
  height: 100%;
}

.card-item__cover {
  height: 100%;
  background-color: #1c1d27;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  border-radius: 15px;
  overflow: hidden;
}

/* CSS Gradient Background for Card */
.card-bg-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  position: relative;
}

.card-bg-gradient::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
  transform: rotate(30deg);
}

.card-item__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 30px;
  padding: 0 10px;
}

/* CSS Chip */
.card-item__chip {
  width: 50px;
  height: 35px;
  background: linear-gradient(135deg, #d4af37 0%, #f9e076 50%, #d4af37 100%);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
}

.chip-line {
  position: absolute;
  background: rgba(0,0,0,0.1);
  border: 1px solid rgba(0,0,0,0.1);
}

.chip-line:nth-child(1) { top: 10%; left: 0; width: 100%; height: 1px; }
.chip-line:nth-child(2) { top: 60%; left: 0; width: 100%; height: 1px; }
.chip-line:nth-child(3) { top: 0; left: 30%; width: 1px; height: 100%; }
.chip-line:nth-child(4) { top: 0; left: 70%; width: 1px; height: 100%; }

.card-item__type {
  height: 45px;
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  max-width: 100px;
  margin-left: auto;
  width: 100%;
}

.card-type-text {
  color: #fff;
  font-weight: 800;
  font-style: italic;
  font-size: 1.5rem;
  text-transform: uppercase;
  opacity: 0.8;
  letter-spacing: 1px;
}

.card-item__info {
  color: #fff;
  width: 100%;
  max-width: calc(100% - 85px);
  padding: 10px 15px;
  font-weight: 500;
  display: block;
  cursor: pointer;
}

.card-item__holder {
  opacity: 0.7;
  font-size: 13px;
  margin-bottom: 6px;
}

.card-item__wrapper {
  font-family: "Source Code Pro", monospace;
  padding: 25px 15px;
  position: relative;
  z-index: 4;
  height: 100%;
  text-shadow: 0 1px 1px rgba(0,0,0,0.5);
  user-select: none;
}

.card-item__name {
  font-size: 18px;
  line-height: 1;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
}

.card-item__nameItem {
  display: inline-block;
  min-width: 8px;
  position: relative;
}

.card-item__number {
  font-weight: 500;
  line-height: 1;
  color: #fff;
  font-size: 24px;
  margin-bottom: 20px;
  display: inline-block;
  padding: 10px 15px;
  cursor: pointer;
  font-family: "Source Code Pro", monospace;
}

.card-item__numberItem {
  width: 14px;
  display: inline-block;
}

.card-item__numberItem.-active {
  width: 30px;
}

.card-item__content {
  color: #fff;
  display: flex;
  align-items: flex-start;
}

.card-item__date {
  flex-wrap: wrap;
  font-size: 18px;
  margin-left: auto;
  padding: 10px;
  display: inline-flex;
  width: 80px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}

.card-item__dateItem {
  position: relative;
}

.card-item__dateItem span {
  width: 22px;
  display: inline-block;
}

.card-item__dateTitle {
  opacity: 0.7;
  font-size: 13px;
  padding-bottom: 6px;
  width: 100%;
}

.card-item__band {
  background: rgba(0, 0, 19, 0.8);
  width: 100%;
  height: 50px;
  margin-top: 30px;
  position: relative;
  z-index: 2;
}

.card-item__cvv {
  text-align: right;
  position: relative;
  z-index: 2;
  padding: 15px;
}

.card-item__cvv .card-item__type {
  opacity: 0.7;
}

.card-item__cvvTitle {
  padding-right: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 5px;
}

.card-item__cvvBand {
  height: 45px;
  background: #fff;
  margin-bottom: 30px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  color: #1a3b5d;
  font-size: 18px;
  border-radius: 4px;
  box-shadow: 0px 10px 20px -7px rgba(32, 56, 117, 0.35);
}

.card-input {
  margin-bottom: 20px;
}

.card-input__label {
  font-size: 14px;
  margin-bottom: 5px;
  font-weight: 500;
  color: #1a3b5d;
  width: 100%;
  display: block;
  user-select: none;
}

.card-input__input {
  width: 100%;
  height: 50px;
  border-radius: 5px;
  box-shadow: none;
  border: 1px solid #ced6e0;
  transition: all 0.3s ease-in-out;
  font-size: 18px;
  padding: 5px 15px;
  background: #fff;
  color: #1a3b5d;
  font-family: "Source Sans Pro", sans-serif;
}

.card-input__input:hover,
.card-input__input:focus {
  border-color: #3d9cff;
}

.card-input__input:focus {
  box-shadow: 0px 10px 20px -13px rgba(32, 56, 117, 0.35);
}

.card-input__input.-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAeCAYAAABuUU38AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUxJREFUeNrM1sEJwkAQBdCsngXPHsQO9O5FS7AAMVYgdqAd2IGCDWgFnryLFQiCZ8EGnJUNimiyM/tnk4HNEAg/8y6ZmMRVqz9eUJvRaSbvutCZ347bXVJy/ZnvTmdJ862Me+hAbZCTs6GHpyUi1tTSvPnqTpoWZPUa7W7ncT3vK4h4zVejy8QzM3WhVUO8ykI6jOxoGA4ig3BLHcNFSCGqGAkig2yqgpEiMsjSfY9LxYQg7L6r0X6wS29YJiYQYecemY+wHrXD1+bklGhpAhBDeu/JfIVGxaAQ9sb8CI+CQSJ+QmJg0Ii/EE2MBiIXooHRQhRCkBhNhBcEhLkwf05ZCG8ICCOpk0MULmvDSY2M8UawIRExLIQIEgHDRoghihgRIgiigBEjgiFATBACAgFgghEwSAAGgoBCBBgYAg5hYKAIFYgHBo6w9RRgAFfy160QuV8NAAAAAElFTkSuQmCC');
  background-size: 12px;
  background-position: 90% center;
  background-repeat: no-repeat;
  padding-right: 30px;
}

/* Transitions */
.slide-fade-up-enter-active {
  transition: all 0.25s ease-in-out;
  transition-delay: 0.1s;
  position: relative;
}
.slide-fade-up-leave-active {
  transition: all 0.25s ease-in-out;
  position: absolute;
}
.slide-fade-up-enter-from {
  opacity: 0;
  transform: translateY(15px);
  pointer-events: none;
}
.slide-fade-up-leave-to {
  opacity: 0;
  transform: translateY(-15px);
  pointer-events: none;
}

.slide-fade-right-enter-active {
  transition: all 0.25s ease-in-out;
  transition-delay: 0.1s;
  position: relative;
}
.slide-fade-right-leave-active {
  transition: all 0.25s ease-in-out;
  position: absolute;
}
.slide-fade-right-enter-from {
  opacity: 0;
  transform: translateX(10px) rotate(45deg);
  pointer-events: none;
}
.slide-fade-right-leave-to {
  opacity: 0;
  transform: translateX(-10px) rotate(45deg);
  pointer-events: none;
}

/* Responsive */
@media (max-width: 1024px) {
  .contact-content {
    grid-template-columns: 1fr;
    gap: 4rem;
  }
  
  .service-selection {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .contact-title {
    font-size: 2.5rem;
  }
  
  .contact-page {
    padding: 80px 0;
  }
  
  .card-form__inner {
    padding: 0;
    padding-top: 165px;
  }
  
  .card-form__col {
    margin-right: 0;
    flex: unset;
    width: 100%;
    margin-bottom: 20px;
  }
  
  .card-form__col:last-child {
    margin-bottom: 0;
  }
  
  .card-form__col.-cvv {
    max-width: initial;
  }
  
  .card-form__row {
    flex-wrap: wrap;
  }
  
  .card-item {
    max-width: 310px;
    height: 220px;
    width: 90%;
  }
  
  .card-item__top {
    margin-bottom: 25px;
  }
  
  .card-item__number {
    font-size: 21px;
    margin-bottom: 15px;
  }
}
</style>
