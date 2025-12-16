<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'; 
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const mainWrapper = ref(null);
const stickySection = ref(null);
const canvasContainer = ref(null);
const canvasRef = ref(null);

let scene, camera, renderer;
let animationFrameId = null;
let parts = []; 
let mainGroup = null; 
const mouse = { x: 0, y: 0 };

// --- 輔助函式：亂數範圍 ---
const randomRange = (min, max) => Math.random() * (max - min) + min;

// --- 初始化 Three.js 場景 ---
const initThree = () => {
    if (!canvasRef.value || !canvasContainer.value) return;

    const width = canvasContainer.value.clientWidth;
    const height = canvasContainer.value.clientHeight;

    scene = new THREE.Scene();
    // 修改為亮色霧氣配合白色背景
    scene.fog = new THREE.FogExp2(0xffffff, 0.02); 
    
    // 調整相機位置，視模型大小可能需要微調
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 25); // [FIX] init Z changed from 8 to 25
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.value,
        alpha: true,
        antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 開啟陰影貼圖以增加立體感
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 色調映射，這對於金屬高光很重要
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5; // 再調亮曝光
    
    // --- 燈光設置 (Bright Lab - 明亮實驗室) ---
    // 大幅增加環境光，避免死黑
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); 
    scene.add(ambientLight);

    // 主光
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
    keyLight.position.set(5, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    
    // 補光 1
    const fillLight = new THREE.DirectionalLight(0xddeeff, 2.0);
    fillLight.position.set(-5, 5, 5);
    scene.add(fillLight);

    // 補光 2 (下方補光，照亮底部細節)
    const bottomLight = new THREE.DirectionalLight(0xffffff, 1.0);
    bottomLight.position.set(0, -5, 5);
    scene.add(bottomLight);

    // 輪廓光 (Rim Light) - 移除，在亮背景下效果不佳
    // const rimLight = new THREE.SpotLight(0xffffff, 3.0);
    // rimLight.position.set(0, 10, -10);
    // rimLight.lookAt(0, 0, 0);
    // scene.add(rimLight);

    // --- 建立主群組 ---
    mainGroup = new THREE.Group();
    scene.add(mainGroup);
    
    parts = [];

    // --- 載入自定義 OBJ 模型 ---
    loadCustomModel();

    animate();
};

// --- 黃金螺旋分佈演算法 (避免穿模) ---
// index: 目前是第幾個零件
// total: 總共有多少零件
// 這樣可以算出一個均勻分佈的方向向量
const getFibonacciSpherePoint = (index, total) => {
    const k = index + 0.5;
    const phi = Math.acos(1 - 2 * k / total);
    const theta = Math.PI * (1 + Math.sqrt(5)) * k;

    const x = Math.cos(theta) * Math.sin(phi);
    const y = Math.cos(phi);
    const z = Math.sin(theta) * Math.sin(phi);

    return new THREE.Vector3(x, y, z);
};

// --- 幾何切片演算法 (Geometry Slicing) ---
const createSlicedGeometry = (mesh, sliceCount = 5) => {
    const originalGeom = mesh.geometry;
    
    // 1. 強制轉為非索引幾何 (Non-indexed) 以便拆分面
    const geometry = originalGeom.index ? originalGeom.toNonIndexed() : originalGeom.clone();
    
    // 確保有計算法向量
    if (!geometry.attributes.normal) geometry.computeVertexNormals();

    const posAttr = geometry.attributes.position;
    const normalAttr = geometry.attributes.normal;
    const uvAttr = geometry.attributes.uv;
    
    // 2. 計算邊界與主軸
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);
    const min = box.min;

    // 找出最長軸 (X, Y, or Z)
    let axis = 'y';
    let axisRange = size.y;
    let axisMin = min.y;
    
    if (size.x > size.y && size.x > size.z) {
        axis = 'x'; axisRange = size.x; axisMin = min.x;
    } else if (size.z > size.y && size.z > size.x) {
        axis = 'z'; axisRange = size.z; axisMin = min.z;
    }

    const buckets = Array.from({ length: sliceCount }, () => []);
    const vertexCount = posAttr.count;

    // 3. 遍歷所有三角形並分配到切片層
    for (let i = 0; i < vertexCount; i += 3) {
        // 計算三角形中心點
        let centroid = 0;
        if (axis === 'x') {
            centroid = (posAttr.getX(i) + posAttr.getX(i+1) + posAttr.getX(i+2)) / 3;
        } else if (axis === 'y') {
            centroid = (posAttr.getY(i) + posAttr.getY(i+1) + posAttr.getY(i+2)) / 3;
        } else {
            centroid = (posAttr.getZ(i) + posAttr.getZ(i+1) + posAttr.getZ(i+2)) / 3;
        }

        // 決定切片索引
        let sliceIdx = Math.floor(((centroid - axisMin) / axisRange) * sliceCount);
        if (sliceIdx < 0) sliceIdx = 0;
        if (sliceIdx >= sliceCount) sliceIdx = sliceCount - 1;

        buckets[sliceIdx].push(i, i+1, i+2);
    }

    const slices = [];

    // 4. 重組為新的 Mesh
    buckets.forEach((indices, idx) => {
        if (indices.length === 0) return;

        const newGeom = new THREE.BufferGeometry();
        
        // 建立新的 Attribute Arrays
        const newPos = new Float32Array(indices.length * 3);
        const newNorm = new Float32Array(indices.length * 3);
        const newUV = uvAttr ? new Float32Array(indices.length * 2) : null;

        for (let k = 0; k < indices.length; k++) {
            const oldIdx = indices[k];
            
            newPos[k*3] = posAttr.getX(oldIdx);
            newPos[k*3+1] = posAttr.getY(oldIdx);
            newPos[k*3+2] = posAttr.getZ(oldIdx);

            newNorm[k*3] = normalAttr.getX(oldIdx);
            newNorm[k*3+1] = normalAttr.getY(oldIdx);
            newNorm[k*3+2] = normalAttr.getZ(oldIdx);

            if (newUV) {
                newUV[k*2] = uvAttr.getX(oldIdx);
                newUV[k*2+1] = uvAttr.getY(oldIdx);
            }
        }

        newGeom.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
        newGeom.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
        if (newUV) newGeom.setAttribute('uv', new THREE.BufferAttribute(newUV, 2));
        
        // 為了避免背面剔除導致看起來空心，設定雙面渲染
        const material = mesh.material.clone();
        material.side = THREE.DoubleSide;
        // 稍微調整顏色區分切片感 (可選)
        // material.color.offsetHSL(0, 0, idx % 2 === 0 ? 0.05 : -0.05);

        const newMesh = new THREE.Mesh(newGeom, material);
        
        // 繼承原始變換 (因為我們是在 Local Space 切割)
        newMesh.position.copy(mesh.position);
        newMesh.rotation.copy(mesh.rotation);
        newMesh.scale.copy(mesh.scale);
        
        slices.push(newMesh);
    });

    return slices;
};

const loadCustomModel = () => {
    const loader = new OBJLoader();
    
    // 實體材質
    const matSolid = new THREE.MeshPhysicalMaterial({ 
        color: 0x444444,     
        metalness: 0.7,         
        roughness: 0.4,         
        clearcoat: 0.2,
        flatShading: false,
        side: THREE.DoubleSide // 確保切片側面有渲染
    });

    loader.load(
        '/models/gun.obj', 
        (object) => {
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim;
            object.scale.set(scale, scale, scale);
            
            box.setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.sub(center); 

            const allMeshes = [];
            object.traverse((child) => {
                if (child.isMesh) {
                    child.material = matSolid; 
                    allMeshes.push(child);
                }
            });

            // 1. 生成切片組裝 (Slice Assembly)
            allMeshes.forEach((mesh, index) => {
                // 產生 5~8 片切片
                const sliceCount = Math.floor(Math.random() * 4) + 5; 
                const slices = createSlicedGeometry(mesh, sliceCount);

                // 設定每個切片的動畫 Config
                slices.forEach((slice, sIdx) => {
                    mainGroup.add(slice);
                    
                    // 繼承縮放 (重要：這是之前黑畫面的解法)
                    slice.scale.multiplyScalar(scale);
                    slice.position.multiplyScalar(scale);

                    const config = createExplosionConfig(slice, index, allMeshes.length, false);
                    config.isSlice = true;
                    config.sliceIndex = sIdx;
                    config.totalSlices = slices.length;
                    
                    // 每個切片在組裝前的 "展開" 偏移
                    // 根據切割軸向稍微拉開
                    // 這裡簡化：統一往上拉開一點點，製造「懸浮層」效果
                    config.sliceOffset = new THREE.Vector3(0, (sIdx - sliceCount/2) * 0.05, 0); 

                    parts.push(config);
                });
            });

            // 2. 增加少量金屬碎片作為點綴 (不需太多)
            const debrisCount = 20;
            const matDebris = new THREE.MeshPhysicalMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
            const geomDebris = new THREE.TetrahedronGeometry(0.05); 

            for (let i = 0; i < debrisCount; i++) {
                const debris = new THREE.Mesh(geomDebris, matDebris);
                mainGroup.add(debris);
                
                const config = createExplosionConfig(debris, i, debrisCount, true);
                config.isDebris = true;
                config.endPos = new THREE.Vector3(
                    randomRange(-2, 2), randomRange(-1, 1), randomRange(-1, 1)
                );
                config.targetScale = new THREE.Vector3(1,1,1); // 確保碎片有尺寸
                parts.push(config);
            }

            setupScrollAnimation();
            ScrollTrigger.refresh();
        },
        undefined,
        (error) => console.error(error)
    );
};

// 建立單個元件的爆炸設定
// isExtra: 是否為額外增生的物件 (幽靈或碎片)
const createExplosionConfig = (mesh, index, total, isExtra) => {
    // 原始位置與旋轉
    const originalPos = mesh.position.clone();
    const originalRot = mesh.rotation.clone();
    
    // 1. 取得均勻分佈方向 (Fibonacci Sphere)
    const dirVector = getFibonacciSpherePoint(index, total);
    
    // 2. 爆炸距離
    const baseRadius = isExtra ? 15 : 10; 
    const radius = baseRadius + Math.random() * 5;
    
    // 3. 螺旋偏移 (Vortex Twist)
    const twist = originalPos.y * 0.5;
    const finalDir = dirVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), twist);

    const startPos = finalDir.multiplyScalar(radius);
    
    // 4. 起始旋轉 (Chaos)
    const startRot = {
        x: Math.random() * Math.PI * 10,
        y: Math.random() * Math.PI * 10,
        z: Math.random() * Math.PI * 10
    };

    // 套用初始狀態
    mesh.position.copy(startPos);
    mesh.rotation.set(startRot.x, startRot.y, startRot.z);
    
    if(isExtra) mesh.scale.set(0, 0, 0);

    return {
        mesh,
        startPos,
        endPos: originalPos, 
        startRot,
        endRot: { x: originalRot.x, y: originalRot.y, z: originalRot.z },
        dist: startPos.length(),
        isExtra
    };
};

const setupScrollAnimation = () => {
    // 定義時間軸總長度概念 (Logic Duration)
    // 0~5: 組裝 (Assembly)
    // 5~8: 檢視 (Inspection)
    
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: mainWrapper.value,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.0, 
            pin: stickySection.value,
            onRefresh: () => handleResize()
        }
    });

    // 排序：確保動畫順序自然
    parts.sort((a, b) => a.dist - b.dist);

    parts.forEach((p, i) => {
        // 基本延遲
        const progress = i / parts.length;
        const baseDelay = progress * 0.5;

        // 如果是切片，我們有特殊的「二階段動畫」
        if (p.isSlice) {
            // 階段 1: 切片合體 (Micro Assembly)
            // 從 "爆炸位置 + 切片偏移" 回到 "爆炸位置"
            // 我們可以透過修改 position 來達成
            // 初始狀態：已在 createExplosionConfig 設定好位置 (startPos)
            // 但我們還沒把 sliceOffset 加進去，這裡補上
            
            // 修正：在 createExplosionConfig 裡，我們只有設 startPos，沒有加 sliceOffset
            // 我們應該先將 sliceOffset 應用到 mesh 上，讓它一開始就是分開的
            p.mesh.position.add(p.sliceOffset);

            // 動畫：將切片偏移歸零 (合體成單一零件)
            // 為了視覺效果，這個合體發生在零件飛回本體的過程中
            
            // 階段 2: 零件飛回本體 (Macro Assembly)
            tl.to(p.mesh.position, {
                x: p.endPos.x,
                y: p.endPos.y,
                z: p.endPos.z,
                duration: 3.0,
                ease: "power3.inOut" // 用 inOut 看起來比較像磁吸
            }, baseDelay);

            tl.to(p.mesh.rotation, {
                x: p.endRot.x,
                y: p.endRot.y,
                z: p.endRot.z,
                duration: 3.0,
                ease: "power2.inOut"
            }, baseDelay);

            // [New] 額外的切片合體動畫
            // 在飛行過程中，慢慢消掉 sliceOffset
            // 因為我們前面用 p.mesh.position.add 加了偏移，
            // 其實上面的 `to(endPos)` 就已經隱含 "回到原點" (即消掉偏移) 的意思了
            // 因為 endPos 是沒偏移的，那飛過去的過程就會自動把切片偏移修正回來。
            // 這就是數學的美妙之處！不需要額外寫一段。
        } 
        else if (p.isDebris) {
            // 碎片：飛回並消失
            tl.to(p.mesh.position, {
                x: 0, y: 0, z: 0, // 吸入中心
                duration: 4.0,
                ease: "expo.in"
            }, baseDelay);
            
            tl.to(p.mesh.scale, { 
                x: 0, y: 0, z: 0, 
                duration: 0.5 
            }, baseDelay + 3.0);
        }
    });

    // Phase 2: Inspection Mode (Zoom In & Rotate)
    // 接在組裝完成後 ( t > 3.5 )
    
    // Zoom In: 移動整個 Group 靠近相機
    // 相機在 Z=40，我們把 Group 移到 Z=20，相當於距離減半 (放大兩倍)
    tl.to(mainGroup.position, {
        z: 20, 
        duration: 3.0, 
        ease: "power2.inOut"
    }, 4.0); // Start at t=4.0

    // Rotation: 貫穿全場
    // 0~4: 轉 90度 (組裝面)
    // 4~8: 轉 180度 (檢視面，轉快一點)
    
    // 重設 Rotation 為獨立 Tween
    // Part 1: Assembly Rotation
    tl.fromTo(mainGroup.rotation, 
        { y: -Math.PI * 0.5 }, 
        { y: Math.PI * 0.2, duration: 4.0, ease: "none" }, 
        0
    );
    
    // Part 2: Inspection Rotation (Spin 360)
    tl.to(mainGroup.rotation, { 
        y: Math.PI * 2.2, // 轉一圈多
        duration: 4.0, 
        ease: "none" 
    }, 4.0);
};

const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    
    // 讓粒子有些微的漂浮感
    if (mainGroup) {
        // mainGroup.rotation.z = Math.sin(Date.now() * 0.0005) * 0.05;
    }
    
    renderer.render(scene, camera);
};

const handleResize = () => {
    if (canvasContainer.value && camera && renderer) {
        const width = canvasContainer.value.clientWidth;
        const height = canvasContainer.value.clientHeight;
        const aspect = width / height;

        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);

        // Responsive Camera
        const baseDist = 25; // [FIX] Increased from 8 to 25
        const responsiveDist = aspect < 1 ? baseDist + (1 / aspect) * 10 : baseDist; // Increased multiplier
        camera.position.z = responsiveDist;
        camera.position.y = 2 + (aspect < 1 ? 1 : 0);
    }
};

const handleMouseMove = (event) => {
    if (!canvasContainer.value) return;
    const rect = canvasContainer.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const targetX = (x / rect.width) * 2 - 1;
    const targetY = -(y / rect.height) * 2 + 1;
    
    gsap.to(camera.position, {
        x: 0 + targetX * 1, // [FIX] Changed base X from 5 to 0
        y: camera.position.y + targetY * 0.5, 
        duration: 1,
        overwrite: "auto"
    });
};

onMounted(() => {
    initThree();
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('mousemove', handleMouseMove);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer) renderer.dispose();
    ScrollTrigger.getAll().forEach(t => t.kill());
});
</script>

<template>
    <div class="scroll-wrapper" ref="mainWrapper">
        <div class="sticky-view" ref="stickySection">
            <!-- Fullscreen Background Canvas -->
            <div class="visual-background" ref="canvasContainer">
                <canvas ref="canvasRef" class="three-canvas"></canvas>
            </div>

            <!-- Overlay Content -->
            <div class="content-overlay">
                <div class="hero-text">
                    <h1 class="glitch-title" data-text="VORTEX">VORTEX</h1>
                    <h2 class="subtitle">SYSTEM REBOOT</h2>
                    <p class="description">
                        Constructing reality from data streams.<br>
                        Scroll to initialize sequence.<br>
                        <span class="highlight">Keep scrolling to inspect.</span>
                    </p>
                    <div class="hud-line"></div>
                </div>
            </div>
            
            <div class="scan-overlay"></div>
        </div>
    </div>
</template>

<style scoped>
.scroll-wrapper {
    height: 600vh; /* [FIX] Increased height for 2-stage scroll */
    background: #000; /* 深色背景配合發光粒子 */
    color: #fff;
    position: relative;
}

.sticky-view {
    height: 100vh;
    width: 100%;
    overflow: hidden;
    position: relative;
}

/* 全螢幕背景 */
.visual-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
}

.three-canvas {
    width: 100%;
    height: 100%;
    display: block;
}

/* 內容疊加層 */
.content-overlay {
    position: relative;
    z-index: 10;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start; /* 左對齊 */
    padding-left: 10%;
    pointer-events: none; /* 讓滑鼠能穿透去轉動模型 */
}

.hero-text {
    /* 玻璃擬態背景，讓文字在雜亂背景中清楚 */
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    padding: 2rem;
    border-left: 4px solid #00ffff;
    max-width: 500px;
}

.glitch-title {
    font-size: 6rem;
    font-weight: 900;
    letter-spacing: -2px;
    margin: 0;
    line-height: 1;
    color: #fff;
    text-shadow: 2px 2px 0px #00ffff;
}

.subtitle {
    font-size: 2rem;
    color: #00ffff;
    letter-spacing: 5px;
    margin-bottom: 1rem;
    text-transform: uppercase;
}

.description {
    font-size: 1.2rem;
    line-height: 1.6;
    color: #ccc;
    font-family: 'Courier New', monospace;
}

.hud-line {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, #00ffff, transparent);
    margin-top: 1.5rem;
}

/* 掃描線效果 */
.scan-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, 
        rgba(255,255,255,0), 
        rgba(255,255,255,0) 50%, 
        rgba(0,0,0,0.1) 50%, 
        rgba(0,0,0,0.1));
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 5;
    opacity: 0.3;
}
</style>