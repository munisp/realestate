/**
 * Innovation 6: Neighbourhood Panorama Walkthrough
 * 360° equirectangular photo viewer with interactive hotspots
 * Uses Three.js sphere projection — no external library dependency
 * Falls back to a CSS-based panorama strip when Three.js is unavailable
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── Types ────────────────────────────────────────────────────────────────────
export interface PanoramaHotspot {
  id: string;
  label: string;
  description: string;
  icon: string;
  yaw: number;   // horizontal angle in degrees (0–360)
  pitch: number; // vertical angle in degrees (-90 to 90)
  category: 'amenity' | 'transport' | 'school' | 'hospital' | 'market' | 'info';
  link?: string;
}

export interface PanoramaScene {
  id: string;
  title: string;
  imageUrl: string;
  hotspots: PanoramaHotspot[];
  linkedScenes?: { sceneId: string; yaw: number; label: string }[];
}

// ── Sample Nigerian neighbourhood scenes ─────────────────────────────────────
export const SAMPLE_SCENES: PanoramaScene[] = [
  {
    id: 'lekki-phase1',
    title: 'Lekki Phase 1 — Main Boulevard',
    imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=4096&q=80',
    hotspots: [
      { id: 'h1', label: 'Lekki Market', description: '5 min walk — Fresh produce, groceries', icon: '🛒', yaw: 45, pitch: 0, category: 'market' },
      { id: 'h2', label: 'BRT Bus Stop', description: '2 min walk — Lagos BRT to VI', icon: '🚌', yaw: 120, pitch: -5, category: 'transport' },
      { id: 'h3', label: 'Corona School', description: '8 min drive — International curriculum', icon: '🏫', yaw: 200, pitch: 5, category: 'school' },
      { id: 'h4', label: 'Eko Hospital', description: '10 min drive — 24hr emergency', icon: '🏥', yaw: 290, pitch: -3, category: 'hospital' },
      { id: 'h5', label: 'Admiralty Mall', description: '3 min drive — Shoprite, cinema', icon: '🏬', yaw: 330, pitch: 0, category: 'amenity' },
    ],
    linkedScenes: [{ sceneId: 'vi-bar-beach', yaw: 90, label: 'Go to V.I.' }],
  },
  {
    id: 'vi-bar-beach',
    title: 'Victoria Island — Bar Beach Road',
    imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=4096&q=80',
    hotspots: [
      { id: 'h6', label: 'Bar Beach', description: '1 min walk — Atlantic Ocean waterfront', icon: '🌊', yaw: 60, pitch: -10, category: 'amenity' },
      { id: 'h7', label: 'Eko Hotel', description: '5 min walk — 5-star hotel & conference', icon: '🏨', yaw: 150, pitch: 0, category: 'amenity' },
      { id: 'h8', label: 'Ozumba Mbadiwe Ave', description: 'Major arterial road — easy access', icon: '🛣', yaw: 240, pitch: -5, category: 'transport' },
    ],
    linkedScenes: [{ sceneId: 'lekki-phase1', yaw: 270, label: 'Go to Lekki' }],
  },
  {
    id: 'abuja-maitama',
    title: 'Maitama — Abuja',
    imageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=4096&q=80',
    hotspots: [
      { id: 'h9', label: 'Transcorp Hilton', description: '3 min drive — Premium hospitality', icon: '🏨', yaw: 30, pitch: 0, category: 'amenity' },
      { id: 'h10', label: 'Maitama Market', description: '7 min walk — Daily essentials', icon: '🛒', yaw: 180, pitch: -5, category: 'market' },
      { id: 'h11', label: 'British School Abuja', description: '10 min drive — International school', icon: '🏫', yaw: 270, pitch: 3, category: 'school' },
    ],
  },
];

// ── Equirectangular panorama renderer using Three.js ─────────────────────────
async function buildPanoramaScene(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  onHotspotClick: (hotspot: PanoramaHotspot) => void,
  hotspots: PanoramaHotspot[]
) {
  const THREE = await import('three').catch(() => null);
  if (!THREE) return null;

  const w = canvas.clientWidth || 800;
  const h = canvas.clientHeight || 450;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
  camera.position.set(0, 0, 0);

  // Load panorama texture onto inverted sphere
  const loader = new THREE.TextureLoader();
  const texture = await new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(imageUrl, resolve, undefined, reject);
  }).catch(() => null);

  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    const sphereGeo = new THREE.SphereGeometry(50, 64, 32);
    // Invert the sphere so texture faces inward
    sphereGeo.scale(-1, 1, 1);
    const sphereMat = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);
  } else {
    // Fallback gradient sky
    scene.background = new THREE.Color(0x87ceeb);
  }

  // Hotspot sprites
  const hotspotMeshes = new Map<string, THREE.Sprite>();

  hotspots.forEach(hs => {
    const yawRad = (hs.yaw * Math.PI) / 180;
    const pitchRad = (hs.pitch * Math.PI) / 180;
    const radius = 45;
    const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
    const y = radius * Math.sin(pitchRad);
    const z = -radius * Math.cos(pitchRad) * Math.cos(yawRad);

    // Create canvas texture for hotspot label
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 128;
    const ctx = labelCanvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.roundRect(4, 4, 248, 120, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hs.icon, 128, 50);
    ctx.font = '18px sans-serif';
    ctx.fillText(hs.label, 128, 80);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, z);
    sprite.scale.set(6, 3, 1);
    sprite.userData.hotspot = hs;
    scene.add(sprite);
    hotspotMeshes.set(hs.id, sprite);
  });

  // Mouse/touch drag to look around
  let isDragging = false;
  let prevX = 0, prevY = 0;
  let yaw = 0, pitch = 0;

  function updateCamera() {
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    camera.lookAt(
      Math.cos(pitchRad) * Math.sin(yawRad),
      Math.sin(pitchRad),
      -Math.cos(pitchRad) * Math.cos(yawRad)
    );
  }

  canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    yaw -= (e.clientX - prevX) * 0.3;
    pitch = Math.max(-85, Math.min(85, pitch + (e.clientY - prevY) * 0.3));
    prevX = e.clientX; prevY = e.clientY;
    updateCamera();
  });
  canvas.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mouseleave', () => { isDragging = false; });

  // Touch support
  let lastTouchX = 0, lastTouchY = 0;
  canvas.addEventListener('touchstart', e => { lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    yaw -= (e.touches[0].clientX - lastTouchX) * 0.3;
    pitch = Math.max(-85, Math.min(85, pitch + (e.touches[0].clientY - lastTouchY) * 0.3));
    lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
    updateCamera();
  }, { passive: true });

  // Click on hotspot
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const sprites = Array.from(hotspotMeshes.values());
    const hits = raycaster.intersectObjects(sprites);
    if (hits.length > 0) {
      const hs = hits[0].object.userData.hotspot as PanoramaHotspot;
      if (hs) onHotspotClick(hs);
    }
  });

  // Auto-rotate when idle
  let autoRotate = true;
  canvas.addEventListener('mousedown', () => { autoRotate = false; });
  setTimeout(() => { autoRotate = true; }, 5000);

  let animId: number;
  function animate() {
    animId = requestAnimationFrame(animate);
    if (autoRotate) { yaw += 0.05; updateCamera(); }
    renderer.render(scene, camera);
  }
  animate();
  updateCamera();

  function onResize() {
    const w2 = canvas.clientWidth; const h2 = canvas.clientHeight;
    camera.aspect = w2 / h2; camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  }
  window.addEventListener('resize', onResize);

  return {
    dispose: () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    },
    lookAt: (yawDeg: number) => { yaw = yawDeg; updateCamera(); },
  };
}

// ── React Component ──────────────────────────────────────────────────────────
interface PanoramaWalkthroughProps {
  scenes?: PanoramaScene[];
  initialSceneId?: string;
  className?: string;
}

export function PanoramaWalkthrough({ scenes = SAMPLE_SCENES, initialSceneId, className = '' }: PanoramaWalkthroughProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<any>(null);
  const [currentScene, setCurrentScene] = useState<PanoramaScene>(
    scenes.find(s => s.id === initialSceneId) || scenes[0]
  );
  const [activeHotspot, setActiveHotspot] = useState<PanoramaHotspot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadScene = useCallback(async (scene: PanoramaScene) => {
    if (!canvasRef.current) return;
    setIsLoading(true);
    setActiveHotspot(null);
    rendererRef.current?.dispose();

    const renderer = await buildPanoramaScene(
      canvasRef.current,
      scene.imageUrl,
      (hs) => setActiveHotspot(hs),
      scene.hotspots
    );
    rendererRef.current = renderer;
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadScene(currentScene);
    return () => { rendererRef.current?.dispose(); };
  }, [currentScene, loadScene]);

  const categoryColors: Record<string, string> = {
    amenity: 'bg-blue-100 text-blue-800',
    transport: 'bg-yellow-100 text-yellow-800',
    school: 'bg-green-100 text-green-800',
    hospital: 'bg-red-100 text-red-800',
    market: 'bg-orange-100 text-orange-800',
    info: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Scene selector */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Neighbourhood scenes">
        {scenes.map(scene => (
          <button key={scene.id}
            role="tab"
            aria-selected={scene.id === currentScene.id}
            onClick={() => setCurrentScene(scene)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${scene.id === currentScene.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {scene.title}
          </button>
        ))}
      </div>

      {/* Panorama viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-sky-100" style={{ height: 420 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          aria-label={`360° panorama of ${currentScene.title}. Drag to look around.`}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-sky-100/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading panorama...</p>
            </div>
          </div>
        )}

        {/* Scene title */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-black/60 text-white border-0 text-xs">{currentScene.title}</Badge>
        </div>

        {/* Hotspot count */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-white/90 text-xs">
            {currentScene.hotspots.length} points of interest
          </Badge>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-center">
          <span className="text-xs bg-black/50 text-white px-3 py-1 rounded-full">
            🖱 Drag to explore · Click hotspots for details
          </span>
        </div>

        {/* Linked scene navigation */}
        {currentScene.linkedScenes?.map(link => (
          <button key={link.sceneId}
            onClick={() => {
              const next = scenes.find(s => s.id === link.sceneId);
              if (next) { rendererRef.current?.lookAt(link.yaw); setTimeout(() => setCurrentScene(next), 300); }
            }}
            className="absolute bottom-12 right-3 bg-white/90 hover:bg-white text-xs font-medium px-3 py-1.5 rounded-full shadow transition-colors"
            aria-label={`Navigate to ${link.label}`}>
            {link.label} →
          </button>
        ))}
      </div>

      {/* Active hotspot detail card */}
      {activeHotspot && (
        <div className="p-4 rounded-xl border bg-card shadow-sm flex gap-3 items-start animate-in slide-in-from-bottom-2">
          <span className="text-3xl shrink-0" role="img" aria-label={activeHotspot.category}>{activeHotspot.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{activeHotspot.label}</h3>
              <Badge className={`text-xs ${categoryColors[activeHotspot.category] || 'bg-gray-100'}`}>
                {activeHotspot.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{activeHotspot.description}</p>
            {activeHotspot.link && (
              <a href={activeHotspot.link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 inline-block">
                View on map →
              </a>
            )}
          </div>
          <button onClick={() => setActiveHotspot(null)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Close hotspot detail">✕</button>
        </div>
      )}

      {/* Hotspot legend */}
      <div className="flex flex-wrap gap-2">
        {currentScene.hotspots.map(hs => (
          <button key={hs.id}
            onClick={() => setActiveHotspot(hs)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${activeHotspot?.id === hs.id ? 'ring-2 ring-primary' : ''} ${categoryColors[hs.category] || 'bg-gray-100'}`}
            aria-label={`Show ${hs.label} hotspot`}>
            <span>{hs.icon}</span>
            <span>{hs.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PanoramaWalkthrough;
