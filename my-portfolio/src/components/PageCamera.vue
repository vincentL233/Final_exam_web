<script setup>
// ============================================================
// PageCamera.vue - 3D 相機模型展示頁面
// ============================================================
// 此組件使用 Three.js 載入並展示 3D 模型，搭配 GSAP 實現滾動動畫效果
// 主要功能：
// 1. 載入 GLB 格式的 3D 模型
// 2. 應用卡通著色器（Toon Shading）效果
// 3. 滾動觸發的旋轉、縮放、爆炸視圖動畫
// ============================================================

import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// 註冊 GSAP 的 ScrollTrigger 插件，用於滾動觸發動畫
gsap.registerPlugin(ScrollTrigger);

// ============================================================
// 響應式變數（Reactive References）
// ============================================================
const canvasRef = ref(null);       // WebGL 畫布的 DOM 參考
const containerRef = ref(null);    // 容器元素的 DOM 參考
const loadingError = ref(null);    // 載入錯誤訊息
const isLoading = ref(true);       // 載入狀態
const showScrollHint = ref(true);  // 滾動提示顯示狀態

// ============================================================
// Three.js 核心物件
// ============================================================
let scene, camera, renderer, model, mixer;
const originalPositions = new Map(); // 儲存每個零件的原始位置，用於爆炸視圖重置
const originalColors = new Map(); // 儲存每個零件的原始材質顏色

// 需透過滾動控制（倒播）的零件名稱清單
// 只要動畫軌跡中包含這些零件名稱，該動畫就會被暫停並交由滾動控制
const SCROLL_CONTROLLED_PARTS = [
    'back_shell_dwon',
    'back_shell_up',
    'fm_shell_l',
    'fm_shell_r',
    'frontdown',
    'frontup',
    'm_shell_down',
    'm_shell_up'
];

// ============================================================
// 設定參數
// ============================================================
const MODEL_PATH = '/models/camerra.glb';  // 3D 模型檔案路徑

// ============================================================
// 自訂卡通著色器
// ============================================================

/**
 * 應用卡通材質到 Mesh 物件
 * 使用自訂 ShaderMaterial 實現 Blender Toon EVEE 風格
 * 包含三色調：陰影（深藍）、基本色（橘棕）、高光（粉紅）
 * 
 * @param {THREE.Object3D} object - 要套用材質的 3D 物件
 */
const applyToonMaterial = (object) => {
    if (object.isMesh) {
        // --------- 1. 建立自訂卡通著色器 ---------
        // 頂點著色器
        const vertexShader = `
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        // 片段著色器 - 實現三色調卡通效果
        const fragmentShader = `
            uniform vec3 uShadowColor;    // 陰影色（深藍）
            uniform vec3 uBaseColor;      // 基本色（橘棕）
            uniform vec3 uHighlightColor; // 高光色（粉紅）
            uniform vec3 uLightDirection;
            uniform float uExposure;
            
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
                // 計算光照強度
                vec3 lightDir = normalize(uLightDirection);
                float NdotL = dot(vNormal, lightDir);
                
                // 應用曝光調整
                float intensity = NdotL * pow(2.0, uExposure);
                
                // 三階色階分割
                vec3 color;
                if (intensity < 0.3) {
                    // 陰影區域
                    color = uShadowColor;
                } else if (intensity < 0.7) {
                    // 中間調區域
                    color = uBaseColor;
                } else {
                    // 高光區域
                    color = uHighlightColor;
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        // 建立 ShaderMaterial
        const newMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uShadowColor: { value: new THREE.Color('#2563eb') },     // 藍色陰影
                uBaseColor: { value: new THREE.Color('#60a5fa') },       // 中藍色基調
                uHighlightColor: { value: new THREE.Color('#dbeafe') },  // 淺藍色高光
                uLightDirection: { value: new THREE.Vector3(5, 5, 5).normalize() },
                uExposure: { value: 0.2 }  // 調整曝光度以適應白色背景
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.FrontSide,
        });
        
        object.material = newMaterial;
        object.castShadow = true;
        object.receiveShadow = true;

        // --------- 2. 建立輪廓線（反轉外殼法）---------
        const outlineGeometry = object.geometry.clone();
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,           // 黑色輪廓
            side: THREE.BackSide,
            transparent: true,         // 啟用透明度
            opacity: 1.0               // 初始完全不透明
        });
        const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);

        const scaleFactor = 1.008;
        outlineMesh.scale.multiplyScalar(scaleFactor);
        object.add(outlineMesh);
    }
};

// ============================================================
// Three.js 初始化
// ============================================================

/**
 * 初始化 Three.js 場景
 * 設定：場景、相機、渲染器、燈光、載入模型
 */
const initThree = () => {
    if (!canvasRef.value) return;

    // --------- 1. 建立場景 ---------
    scene = new THREE.Scene();
    scene.background = null; // 透明背景，讓 CSS 背景顯示

    // --------- 2. 建立相機 ---------
    // PerspectiveCamera(視角, 寬高比, 近裁切面, 遠裁切面)
    camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);  // 相機初始位置：正前方，距離 10 單位（拉遠）

    // --------- 3. 建立渲染器 ---------
    renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.value,  // 使用 Vue ref 綁定的 canvas
        antialias: true,          // 開啟抗鋸齒
        alpha: true               // 允許透明背景
    });
    renderer.setSize(window.innerWidth, window.innerHeight);              // 設定渲染尺寸
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));         // 限制像素比例（效能考量）
    renderer.shadowMap.enabled = true;                                     // 開啟陰影

    // --------- 4. 設定燈光 ---------
    // 環境光：均勻照亮整個場景
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // 方向光：模擬太陽光，產生陰影
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);  // 燈光位置
    directionalLight.castShadow = true;       // 允許產生陰影
    scene.add(directionalLight);

    // --------- 5. 載入 3D 模型 ---------
    const loader = new GLTFLoader();
    loader.load(
        MODEL_PATH,
        // 載入成功回呼
        (gltf) => {
            isLoading.value = false; // 載入完成
            model = gltf.scene;
            
            // --- 置中模型 ---
            // 計算模型的邊界框（Bounding Box）
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());  // 取得中心點
            const size = box.getSize(new THREE.Vector3());      // 取得尺寸

            // 將模型移動到原點
            model.position.sub(center); 
            
            // --- 修正模型方向 ---
            // 模型匯出時前後反了，不需要額外旋轉
            model.rotation.y = 0;  // 保持原始方向 
            
            // --- 正規化縮放 ---
            // 讓模型適合畫面（目標尺寸約 4 單位）
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
                const scale = 4 / maxDim;
                model.scale.set(scale, scale, scale);
            } 

            // --- 套用卡通材質 ---
            const meshes = [];
            model.traverse((child) => {
                 if (child.isMesh) {
                     meshes.push(child);
                     // 儲存原始位置（用於爆炸視圖動畫的重置）
                     originalPositions.set(child.uuid, child.position.clone());
                 }
            });

            // 對每個 Mesh 套用自訂卡通著色器並保存原始顏色
            meshes.forEach((mesh) => {
                applyToonMaterial(mesh);
                // 保存原始材質顏色用於之後恢復
                if (mesh.material && mesh.material.uniforms) {
                    originalColors.set(mesh.uuid, {
                        shadow: mesh.material.uniforms.uShadowColor.value.clone(),
                        base: mesh.material.uniforms.uBaseColor.value.clone(),
                        highlight: mesh.material.uniforms.uHighlightColor.value.clone(),
                        exposure: mesh.material.uniforms.uExposure.value
                    });
                }
            });

            // 將模型加入場景
            scene.add(model);
            
            // 儲存受滾動控制的動畫動作
            const scrollActions = [];

            // --- 處理 GLTF 自帶動畫 ---
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                
                gltf.animations.forEach((clip) => {
                    // 判斷此動畫是否影響指定的零件 (檢查軌跡名稱)
                    // Track name 格式通常為 "NodeName.property"
                    const affectsTargetPart = clip.tracks.some(track => {
                        const trackNameLower = track.name.toLowerCase();
                        return SCROLL_CONTROLLED_PARTS.some(partName => 
                            trackNameLower.includes(partName.toLowerCase())
                        );
                    });
                    
                    const action = mixer.clipAction(clip);
                    action.play();

                    if (affectsTargetPart) {
                        // 滾動控制：暫停播放，交由 ScrollTrigger 控制時間
                        action.paused = true;
                        scrollActions.push({
                            action: action,
                            duration: clip.duration
                        });
                    }
                    // 否則自動播放 (已呼叫 play())
                });
            }

            // --- 入場動畫 ---
            // 從 0 縮放到正常大小，帶有彈性效果
            gsap.from(model.scale, { x: 0, y: 0, z: 0, duration: 1, ease: 'back.out(1.7)' });

            // 初始化滾動動畫
            initScrollAnimations(scrollActions);
        },
        // 載入進度回呼（未使用）
        undefined,
        undefined,
        // 載入錯誤回呼
        (error) => {
            console.error('載入模型時發生錯誤:', error);
            isLoading.value = false; // 載入完成（即使失敗）
            loadingError.value = "載入模型失敗: " + error.message;
        }
    );

    // --------- 6. 動畫迴圈 ---------
    const clock = new THREE.Clock(); // 用於計算 delta time
    
    // 每一幀重新渲染場景
    const tick = () => {
        const delta = clock.getDelta();
        
        // 更新 mixer (播放動畫)
        if (mixer) {
            mixer.update(delta);
        }
        
        renderer.render(scene, camera);
        window.requestAnimationFrame(tick);  // 遞迴呼叫，維持動畫
    };
    tick();
};

// ============================================================
// 滾動動畫
// ============================================================

/**
 * 初始化滾動觸發動畫
 * 使用 GSAP Timeline 整合所有滾動動畫，取代原本分散的 ScrollTrigger 與 if-else 邏輯
 * @param {Array} scrollActions - 受滾動控制的動畫動作列表
 */
const initScrollAnimations = (scrollActions = []) => {
    if (!model) return;

    // 0. 初始狀態設定
    const INITIAL_ROTATION = 0;
    model.rotation.set(0, INITIAL_ROTATION, 0);
    camera.position.z = 5;

    // 確保材質初始狀態正確 (對應 progress = 0)
    updateMaterialEffect(0);

    // 輔助函式：設定受控零件的可見度
    const setPartsVisibility = (visible) => {
        model.traverse((child) => {
            if (child.isMesh) {
                const isControlled = SCROLL_CONTROLLED_PARTS.some(partName => 
                    child.name.toLowerCase().includes(partName.toLowerCase())
                );
                if (isControlled) {
                    child.visible = visible;
                }
            }
        });
    };
    
    // 初始設為可見
    setPartsVisibility(true);

    // 1. 建立主時間軸
    // 綁定到整個容器的滾動，scrub: 1 讓動畫跟隨滾動並帶有平滑緩衝
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: containerRef.value,
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
        },
        defaults: { ease: "none" } // 滾動驅動通常使用線性 ease
    });

    // ============================================================
    // Section 1: 介紹區塊 (0% ~ 25% 滾動進度)
    // 動作：模型旋轉 -90度，相機先拉遠(10)再拉近(5)，播放動畫(正播)
    // ============================================================
    
    // 1.1 模型旋轉
    tl.to(model.rotation, {
        y: INITIAL_ROTATION - Math.PI * 0.5,
        duration: 1
    }, "section1");

    // 1.2 相機移動 (使用 keyframes 讓它在同一個 duration 內完成往返)
    tl.to(camera.position, {
        keyframes: [
            { z: 10, duration: 0.5 }, // 前半段拉遠
            { z: 5, duration: 0.5 }   // 後半段拉近
        ],
        duration: 1
    }, "section1");

    // 1.3 播放 GLTF 動畫 (正播)
    if (scrollActions.length > 0) {
        const animProgress1 = { value: 0 };
        tl.to(animProgress1, {
            value: 1,
            duration: 1,
            onUpdate: () => {
                scrollActions.forEach(item => {
                    if (item.action) {
                        item.action.time = animProgress1.value * item.duration;
                    }
                });
            }
        }, "section1");
    }


    // ============================================================
    // Section 2: 側面與線稿 (25% ~ 50% 滾動進度)
    // 動作：相機拉遠(8)，模型轉側面，材質變線稿，隱藏特定零件
    // ============================================================
    
    // 2.1 隱藏零件 (使用數值代理來確保 scrub 狀態正確)
    const visibilityProxy = { value: 1 }; // 1: visible, 0: hidden
    tl.to(visibilityProxy, {
        value: 0,
        duration: 0.01, // 瞬間切換
        onUpdate: () => setPartsVisibility(visibilityProxy.value > 0.5)
    }, "section2");

    // 2.2 相機拉遠 & 模型轉向
    tl.to(camera.position, { z: 8, duration: 1 }, "section2");
    tl.to(model.rotation, {
        x: Math.PI / 8,
        y: INITIAL_ROTATION + Math.PI / 2,
        z: 0,
        duration: 1
    }, "section2");

    // 2.3 材質變化 (從 0:Original 變到 1:Wireframe)
    const materialProgress = { value: 0 };
    tl.to(materialProgress, {
        value: 1,
        duration: 1,
        onUpdate: () => updateMaterialEffect(materialProgress.value)
    }, "section2");


    // ============================================================
    // Section 3: 爆炸展開 (50% ~ 75% 滾動進度)
    // 動作：材質恢復，相機拉更遠(12)，零件爆炸 (特定零件保持隱藏)
    // ============================================================
    
    // 3.1 材質恢復 (從 1:Wireframe 變回 0:Original)
    tl.to(materialProgress, {
        value: 0,
        duration: 0.5, // 前半段恢復材質
        onUpdate: () => updateMaterialEffect(materialProgress.value)
    }, "section3");

    // 3.2 相機拉遠
    tl.to(camera.position, { z: 12, duration: 1 }, "section3");

    // 3.3 爆炸效果
    const explosionProgress = { value: 0 };
    tl.to(explosionProgress, {
        value: 1,
        duration: 1,
        onUpdate: () => updateExplosion(explosionProgress.value)
    }, "section3");


    // ============================================================
    // Section 4: 組裝與結尾 (75% ~ 100% 滾動進度)
    // 動作：旋轉，組裝，相機拉近(6)，轉正面朝下，顯示零件並倒播動畫
    // ============================================================
    
    // 4.1 組裝回去 (前半段 0~0.5)
    // 先將零件組裝回原位，避免與後續的 GLTF 動畫衝突
    tl.to(explosionProgress, {
        value: 0,
        duration: 0.5,
        onUpdate: () => updateExplosion(explosionProgress.value)
    }, "section4");

    // 同時旋轉 (保持動感)
    tl.to(model.rotation, {
        y: "+=" + Math.PI, 
        x: -Math.PI / 6,
        duration: 0.5
    }, "section4");

    // 4.2 顯示零件 (在倒播開始前)
    tl.to(visibilityProxy, {
        value: 1,
        duration: 0.01,
        onUpdate: () => setPartsVisibility(visibilityProxy.value > 0.5)
    }, "section4+=0.5");

    // 4.3 播放 GLTF 動畫 (倒播) (後半段 0.5~1.0)
    // 在組裝完成後才開始播放動畫
    if (scrollActions.length > 0) {
        const animProgress2 = { value: 1 }; 
        tl.to(animProgress2, {
            value: 0,
            duration: 0.5,
            onUpdate: () => {
                scrollActions.forEach(item => {
                    if (item.action) {
                        item.action.time = animProgress2.value * item.duration;
                    }
                });
            }
        }, "section4+=0.5");
    }

    // 4.4 相機與角度歸位 (後半段 0.5~1.0)
    tl.to(camera.position, { z: 6, duration: 0.5 }, "section4+=0.5");
    
    tl.to(model.rotation, {
        y: 0,              // 回到正面
        x: Math.PI / 2,    // 90度朝下
        duration: 0.5
    }, "section4+=0.5");
};

/**
 * 輔助函式：更新材質效果
 * @param {number} progress - 0: 原始卡通材質, 1: 線稿/灰階材質
 */
const updateMaterialEffect = (progress) => {
    model.traverse((child) => {
        if (child.isMesh && child.material.uniforms) {
            const original = originalColors.get(child.uuid);
            if (!original) return;

            // 定義線稿模式的目標顏色 (灰階)
            const wireframeShadow = new THREE.Color(0.3, 0.3, 0.3);
            const wireframeBase = new THREE.Color(0.8, 0.8, 0.8);
            const wireframeHighlight = new THREE.Color(1.0, 1.0, 1.0);

            // 顏色插值
            child.material.uniforms.uShadowColor.value.copy(original.shadow).lerp(wireframeShadow, progress);
            child.material.uniforms.uBaseColor.value.copy(original.base).lerp(wireframeBase, progress);
            child.material.uniforms.uHighlightColor.value.copy(original.highlight).lerp(wireframeHighlight, progress);
            
            // 曝光度插值 (假設原始約 0.2，線稿模式約 1.0)
            child.material.uniforms.uExposure.value = THREE.MathUtils.lerp(original.exposure, 1.0, progress);

            // 輪廓線控制
            if (child.children && child.children.length > 0) {
                child.children.forEach(outline => {
                    if (outline.isMesh && outline.material && outline.material.transparent !== undefined) {
                        // 透明度：原始 0.3 -> 線稿 1.0
                        outline.material.opacity = THREE.MathUtils.lerp(0.3, 1.0, progress);
                        
                        // 縮放：原始 1.008 -> 線稿 1.012 (稍微變粗)
                        const s = THREE.MathUtils.lerp(1.008, 1.012, progress);
                        outline.scale.set(s, s, s);
                    }
                });
            }
        }
    });
};

/**
 * 輔助函式：更新爆炸效果
 * @param {number} progress - 0: 原始位置, 1: 完全爆炸
 */
const updateExplosion = (progress) => {
    model.children.forEach((child) => {
        if (child.isMesh || child.isGroup) {
            const originalPos = originalPositions.get(child.uuid);
            if (originalPos) {
                // 計算爆炸方向 (從中心向外)
                let direction = originalPos.clone().normalize();
                // 防止中心點物體方向為 0
                if (direction.length() < 0.01) {
                    direction = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
                }
                
                // 根據進度移動位置
                // Pos = Original + Direction * Distance * Progress
                child.position.x = originalPos.x + direction.x * 3 * progress;
                child.position.y = originalPos.y + direction.y * 3 * progress;
                child.position.z = originalPos.z + direction.z * 3 * progress;
            }
        }
    });
};

// ============================================================
// 視窗調整處理
// ============================================================

/**
 * 處理視窗大小變化
 * 更新相機的寬高比和渲染器尺寸
 */
const handleResize = () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;  // 更新寬高比
        camera.updateProjectionMatrix();                          // 重新計算投影矩陣
        renderer.setSize(window.innerWidth, window.innerHeight); // 更新渲染尺寸
    }
};

// ============================================================
// 生命週期鉤子
// ============================================================

// 組件掛載時：初始化 Three.js 並監聽視窗調整
onMounted(() => {
    initThree();
    window.addEventListener('resize', handleResize);

    // 監聽滾動事件，滾動後隱藏提示
    const handleScroll = () => {
        if (window.scrollY > 50) {
            showScrollHint.value = false;
            window.removeEventListener('scroll', handleScroll);
        }
    };
    window.addEventListener('scroll', handleScroll);
});

// 組件卸載時：清理資源，避免記憶體洩漏
onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    renderer?.dispose();                              // 釋放渲染器資源
    ScrollTrigger.getAll().forEach(t => t.kill());   // 移除所有 ScrollTrigger
});
</script>

<template>
    <!-- 頁面容器 -->
    <div ref="containerRef" class="page-camera">
        <!-- 載入指示器 -->
        <div v-if="isLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <p class="loading-text">Loading 3D Model...</p>
        </div>

        <!-- 錯誤訊息提示（當模型載入失敗時顯示） -->
        <div v-if="loadingError" class="error-toast">{{ loadingError }}</div>

        <!-- WebGL 3D 畫布（固定在背景） -->
        <canvas ref="canvasRef" class="webgl"></canvas>

        <!-- 滾動提示 -->
        <div v-if="showScrollHint && !isLoading" class="scroll-hint">
            <div class="scroll-arrow"></div>
            <p>Scroll to explore</p>
        </div>

        <!-- 可滾動內容區塊 -->
        
        <!-- 區塊 1：旋轉與拉遠 -->
        <section id="section-1" class="content-section">
        </section>

        <!-- 區塊 2：拉近鏡頭 -->
        <section id="section-2" class="content-section">
        </section>

        <!-- 區塊 3：角度旋轉 -->
        <section id="section-3" class="content-section">
        </section>

        <!-- 區塊 4：爆炸視圖 -->
        <section id="section-4" class="content-section">
        </section>

        <!-- 區塊 5：結尾緩衝 -->
        <section class="content-section">
        </section>
    </div>
</template>

<style scoped>
/* ============================================================
   頁面容器
   ============================================================ */
.page-camera {
    position: relative;
    width: 100%;
    background: #ffffff; /* 白色背景 */
    /* 添加藍色粒子背景效果 */
    background-image: radial-gradient(circle at 20% 30%, rgba(56, 189, 248, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 80% 70%, rgba(147, 197, 253, 0.06) 0%, transparent 50%),
                      radial-gradient(circle at 40% 80%, rgba(56, 189, 248, 0.05) 0%, transparent 40%);
}

/* ============================================================
   WebGL 畫布
   固定在視窗，作為 3D 背景
   ============================================================ */
.webgl {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    outline: none;
    z-index: 0;  /* 確保在最底層 */
}

/* ============================================================
   滾動提示
   ============================================================ */
.scroll-hint {
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 10;
    animation: fadeInOut 3s ease-in-out infinite;
}

.scroll-hint p {
    color: #38bdf8;
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.scroll-arrow {
    width: 24px;
    height: 24px;
    border-left: 2px solid #38bdf8;
    border-bottom: 2px solid #38bdf8;
    transform: rotate(-45deg);
    animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
    0%, 100% {
        transform: rotate(-45deg) translateY(0);
    }
    50% {
        transform: rotate(-45deg) translateY(10px);
    }
}

@keyframes fadeInOut {
    0%, 100% {
        opacity: 0.3;
    }
    50% {
        opacity: 1;
    }
}

/* ============================================================
   內容區塊
   每個區塊佔滿整個視窗高度，作為滾動觸發區域
   ============================================================ */
.content-section {
    position: relative;
    height: 100vh;
    width: 100%;
}

/* ============================================================
   載入指示器
   ============================================================ */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.loading-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(56, 189, 248, 0.2);
    border-top: 4px solid #38bdf8;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-text {
    margin-top: 1.5rem;
    color: #38bdf8;
    font-size: 1.1rem;
    font-weight: 500;
}

/* ============================================================
   錯誤訊息樣式
   ============================================================ */
.error-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(239, 68, 68, 0.95);
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    z-index: 1000;
    font-weight: 600;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

/* ============================================================
   響應式設計 - 手機版優化
   ============================================================ */
@media (max-width: 768px) {
    .content-section {
        height: 100vh; /* 保持滾動區域高度 */
    }
}
</style>
