<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const canvasRef = ref(null);
const containerRef = ref(null);
const loadingError = ref(null);

let scene, camera, renderer, model;
const originalPositions = new Map(); // Store original positions for reset

// --- Config ---
const MODEL_PATH = '/models/camerra.glb'; 

// --- Toon Shader Helper ---
const createGradientMap = () => {
    const colors = [
        '#cfcfcf', // Highlight
        '#7d7d7d', // Midtone
        '#2b2b2b', // Shadow
    ];
    const canvas = document.createElement('canvas');
    canvas.width = colors.length;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i, 0, 1, 1);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
};

const gradientMap = createGradientMap();

const applyToonMaterial = (object) => {
    if (object.isMesh) {
        // Handle array of materials or single material
        const originalMat = Array.isArray(object.material) ? object.material[0] : object.material;
        
        // 1. Create Toon Material
        const newMaterial = new THREE.MeshToonMaterial({
            color: originalMat.color || new THREE.Color(0xffffff),
            map: originalMat.map || null,
            gradientMap: gradientMap,
            side: THREE.FrontSide, 
        });
        object.material = newMaterial;
        object.castShadow = true;
        object.receiveShadow = true;

        // 2. Create Outline (Inverted Hull Method)
        const outlineGeometry = object.geometry.clone();
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide, // Only render back face
        });
        const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
        
        // Slightly scale up for outline thickness (naive approach, works for convex objects)
        const scaleFactor = 1.008; 
        outlineMesh.scale.multiplyScalar(scaleFactor);
        
        object.add(outlineMesh);
    }
};

const initThree = () => {
    if (!canvasRef.value) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5); // Brighter background

    // 2. Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5); 

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.value,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 5. Load Model
    const loader = new GLTFLoader();
    loader.load(
        MODEL_PATH,
        (gltf) => {
            model = gltf.scene;
            
            // Center model
            // Center model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            model.position.sub(center); 
            
            // Normalize scale to fit in view (approx size 4)
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
                const scale = 4 / maxDim;
                model.scale.set(scale, scale, scale);
            } 

            // Apply Toon Shader & Outline to all meshes
            const meshes = [];
            model.traverse((child) => {
                 if (child.isMesh) {
                     meshes.push(child);
                     // Store original local position for explosion
                     originalPositions.set(child.uuid, child.position.clone());
                 }
            });

            meshes.forEach((mesh) => {
                applyToonMaterial(mesh);
            });

            scene.add(model);
            
            // Initial animation
            gsap.from(model.scale, { x: 0, y: 0, z: 0, duration: 1, ease: 'back.out(1.7)' });

            initScrollAnimations();
        },
        undefined,
        undefined,
        (error) => {
            console.error('An error happened loading the model:', error);
            loadingError.value = "Error loading model: " + error.message;
        }
    );

    // 6. Animation Loop
    const tick = () => {
        renderer.render(scene, camera);
        window.requestAnimationFrame(tick);
    };
    tick();
};

const initScrollAnimations = () => {
    if (!model) return;

    // Section 1: Intro -> Rotate model
    ScrollTrigger.create({
        trigger: "#section-1",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
            model.rotation.y = self.progress * Math.PI * 2;
        }
    });

    // Section 2: Move Camera Closer
    gsap.to(camera.position, {
        z: 3,
        scrollTrigger: {
            trigger: "#section-2",
            start: "top bottom",
            end: "bottom bottom",
            scrub: true
        }
    });

    // Section 3: Rotation X
    gsap.to(model.rotation, {
        x: Math.PI / 4,
        scrollTrigger: {
            trigger: "#section-3",
            start: "top bottom",
            end: "bottom top",
            scrub: true
        }
    });

    // Section 4: Exploded View
    // Animate each child mesh away from the center
    const explodeTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#section-4",
            start: "top bottom",
            end: "bottom bottom",
            scrub: true
        }
    });

    model.children.forEach((child) => {
        if (child.isMesh || child.isGroup) {
            // Calculate a direction vector from center (which is 0,0,0 local) to the child's position
            // If position is too close to zero, use a random direction or a default up
            let direction = child.position.clone().normalize();
            if (direction.length() < 0.01) {
                direction = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
            }
            
            // Move it outward by a factor (e.g., 2 units)
            explodeTimeline.to(child.position, {
                x: child.position.x + direction.x * 2.5,
                y: child.position.y + direction.y * 2.5,
                z: child.position.z + direction.z * 2.5,
            }, 0); // Start all at same time
        }
    });
};

const handleResize = () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
};

onMounted(() => {
    initThree();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    renderer?.dispose();
    ScrollTrigger.getAll().forEach(t => t.kill());
});
</script>

<template>
    <div ref="containerRef" class="page-camera">
        <!-- Error Message -->
        <div v-if="loadingError" class="error-toast">{{ loadingError }}</div>
        
        <!-- Persistent 3D Background -->
        <canvas ref="canvasRef" class="webgl"></canvas>

        <!-- Scrollable Content -->
        <section id="section-1" class="content-section">
            <div class="text-content">
                <h1>The Camera</h1>
                <p>A precision instrument for capturing moments. (Toon Shaded)</p>
            </div>
        </section>

        <section id="section-2" class="content-section align-right">
             <div class="text-content">
                <h1>Optics</h1>
                <p>Advanced lens technology for crystal clear images.</p>
            </div>
        </section>
        
        <section id="section-3" class="content-section">
             <div class="text-content">
                <h1>Structure</h1>
                <p>Robust body design meets ergonomic handling.</p>
            </div>
        </section>

        <section id="section-4" class="content-section align-center">
             <div class="text-content">
                <h1>Exploded View</h1>
                <p>See every detail come apart.</p>
            </div>
        </section>
        
        <section class="content-section align-center">
             <div class="text-content">
                <h1>Explore More</h1>
                <p>Scroll up to review or continue to other projects.</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.page-camera {
    position: relative;
    width: 100%;
}

.webgl {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    outline: none;
    z-index: 0; 
}

.content-section {
    position: relative;
    height: 100vh;
    display: flex;
    align-items: center;
    padding: 0 10%;
    z-index: 1; 
    pointer-events: none; 
}

.content-section .text-content {
    background: rgba(255, 255, 255, 0.9);
    padding: 2rem;
    border-radius: 12px;
    border: 3px solid #000;
    box-shadow: 10px 10px 0px #000; /* Comic style shadow */
    max-width: 500px;
    pointer-events: auto;
}

.align-right {
    justify-content: flex-end;
}

.align-center {
    justify-content: center;
}

h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 2px;
}

p {
    font-size: 1.2rem;
    color: #333;
    line-height: 1.6;
    font-weight: 500;
}

.error-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    z-index: 1000;
    font-weight: bold;
}
</style>
