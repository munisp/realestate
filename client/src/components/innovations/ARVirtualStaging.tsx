/**
 * Innovation 4: AR/3D Virtual Staging Viewer
 * Three.js GLTF scene with Nigerian furniture catalog
 * WebXR AR mode (immersive-ar) with fallback to 3D orbit viewer
 * No external GLTF files required — procedural geometry for all furniture
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Nigerian Furniture Catalog ──────────────────────────────────────────────
export interface FurnitureItem {
  id: string;
  name: string;
  category: 'seating' | 'table' | 'storage' | 'bed' | 'decor' | 'lighting';
  style: 'contemporary' | 'traditional' | 'afro-modern' | 'minimalist';
  color: string;
  dimensions: { w: number; h: number; d: number }; // metres
  price: number; // NGN
  brand: string;
  inScene: boolean;
  position?: { x: number; y: number; z: number };
}

export const NIGERIAN_FURNITURE_CATALOG: FurnitureItem[] = [
  { id: 'sofa-1', name: 'Lagos L-Shaped Sofa', category: 'seating', style: 'contemporary', color: '#8B4513', dimensions: { w: 2.8, h: 0.85, d: 1.6 }, price: 450_000, brand: 'Emel Furniture', inScene: false },
  { id: 'sofa-2', name: 'Abuja Executive Sofa', category: 'seating', style: 'afro-modern', color: '#2C4A3E', dimensions: { w: 2.2, h: 0.9, d: 0.95 }, price: 320_000, brand: 'Ruff n Tumble', inScene: false },
  { id: 'table-1', name: 'Iroko Wood Dining Table', category: 'table', style: 'traditional', color: '#5C3317', dimensions: { w: 1.8, h: 0.76, d: 0.9 }, price: 280_000, brand: 'Woodcraft NG', inScene: false },
  { id: 'table-2', name: 'Glass Top Centre Table', category: 'table', style: 'minimalist', color: '#C0C0C0', dimensions: { w: 1.2, h: 0.45, d: 0.6 }, price: 95_000, brand: 'Emel Furniture', inScene: false },
  { id: 'bed-1', name: 'King Size Upholstered Bed', category: 'bed', style: 'contemporary', color: '#4A4A4A', dimensions: { w: 1.93, h: 1.2, d: 2.1 }, price: 380_000, brand: 'Vitafoam', inScene: false },
  { id: 'storage-1', name: 'Ankara-Print Wardrobe', category: 'storage', style: 'afro-modern', color: '#FF6B35', dimensions: { w: 1.8, h: 2.1, d: 0.6 }, price: 210_000, brand: 'Ruff n Tumble', inScene: false },
  { id: 'decor-1', name: 'Benin Bronze Sculpture', category: 'decor', style: 'traditional', color: '#B8860B', dimensions: { w: 0.3, h: 0.6, d: 0.3 }, price: 45_000, brand: 'Omenka Gallery', inScene: false },
  { id: 'lighting-1', name: 'Rattan Pendant Light', category: 'lighting', style: 'afro-modern', color: '#D4A017', dimensions: { w: 0.5, h: 0.4, d: 0.5 }, price: 35_000, brand: 'Lights & Fittings NG', inScene: false },
  { id: 'decor-2', name: 'Kente Pattern Rug 3×2m', category: 'decor', style: 'traditional', color: '#8B0000', dimensions: { w: 3.0, h: 0.01, d: 2.0 }, price: 75_000, brand: 'Arewa Crafts', inScene: false },
  { id: 'table-3', name: 'Bamboo TV Console', category: 'table', style: 'minimalist', color: '#C8A96E', dimensions: { w: 1.6, h: 0.5, d: 0.4 }, price: 120_000, brand: 'Woodcraft NG', inScene: false },
];

// ── Three.js Scene Builder (procedural geometry, no external assets) ────────
async function buildThreeScene(canvas: HTMLCanvasElement, items: FurnitureItem[]) {
  // Dynamically import Three.js to avoid SSR issues
  const THREE = await import('three').catch(() => null);
  if (!THREE) return null;

  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js').catch(() => ({ OrbitControls: null }));

  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 400;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0ede8);
  scene.fog = new THREE.Fog(0xf0ede8, 10, 30);

  // Camera
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(4, 3, 5);
  camera.lookAt(0, 0, 0);

  // Controls
  let controls: any = null;
  if (OrbitControls) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 2;
    controls.maxDistance = 12;
  }

  // Lighting
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.6);
  scene.add(ambient);

  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
  sunLight.position.set(5, 8, 3);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 30;
  sunLight.shadow.camera.left = -8;
  sunLight.shadow.camera.right = 8;
  sunLight.shadow.camera.top = 8;
  sunLight.shadow.camera.bottom = -8;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xe8f4fd, 0.4);
  fillLight.position.set(-3, 4, -2);
  scene.add(fillLight);

  // Room geometry
  const roomGroup = new THREE.Group();

  // Floor — warm Nigerian terracotta tile
  const floorGeo = new THREE.PlaneGeometry(8, 8);
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xc8956c });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  roomGroup.add(floor);

  // Floor tile grid lines
  const gridHelper = new THREE.GridHelper(8, 16, 0xb07850, 0xb07850);
  (gridHelper.material as THREE.Material).opacity = 0.15;
  (gridHelper.material as THREE.Material).transparent = true;
  roomGroup.add(gridHelper);

  // Walls
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xfaf6f0 });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.5), wallMat);
  backWall.position.set(0, 1.75, -4);
  backWall.receiveShadow = true;
  roomGroup.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.5), wallMat);
  leftWall.position.set(-4, 1.75, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  roomGroup.add(leftWall);

  // Skirting board
  const skirtingMat = new THREE.MeshLambertMaterial({ color: 0xe8ddd0 });
  [-4, 0].forEach((z, i) => {
    const sk = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 0.05), skirtingMat);
    sk.position.set(0, 0.05, i === 0 ? -3.97 : 0);
    if (i === 1) { sk.rotation.y = Math.PI / 2; sk.position.set(-3.97, 0.05, 0); }
    roomGroup.add(sk);
  });

  scene.add(roomGroup);

  // Furniture builder — procedural geometry for each item
  const furnitureMeshes = new Map<string, THREE.Group>();

  function buildFurnitureMesh(item: FurnitureItem): THREE.Group {
    const group = new THREE.Group();
    const { w: fw, h: fh, d: fd } = item.dimensions;
    const color = new THREE.Color(item.color);
    const mat = new THREE.MeshLambertMaterial({ color });
    const darkMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.7) });
    const lightMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(1.3) });

    switch (item.category) {
      case 'seating': {
        // Seat base
        const seat = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.4, fd), mat);
        seat.position.y = fh * 0.2;
        seat.castShadow = true;
        group.add(seat);
        // Back rest
        const back = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.65, fd * 0.15), mat);
        back.position.set(0, fh * 0.72, -fd / 2 + fd * 0.075);
        back.castShadow = true;
        group.add(back);
        // Legs
        [[-fw / 2 + 0.05, -fd / 2 + 0.05], [fw / 2 - 0.05, -fd / 2 + 0.05],
         [-fw / 2 + 0.05, fd / 2 - 0.05], [fw / 2 - 0.05, fd / 2 - 0.05]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, fh * 0.2), darkMat);
          leg.position.set(lx, fh * 0.1, lz as number);
          group.add(leg);
        });
        // Cushion
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.9, fh * 0.12, fd * 0.85), lightMat);
        cushion.position.y = fh * 0.46;
        group.add(cushion);
        break;
      }
      case 'table': {
        // Table top
        const top = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.06, fd), mat);
        top.position.y = fh;
        top.castShadow = true;
        group.add(top);
        // Legs
        [[-fw / 2 + 0.06, -fd / 2 + 0.06], [fw / 2 - 0.06, -fd / 2 + 0.06],
         [-fw / 2 + 0.06, fd / 2 - 0.06], [fw / 2 - 0.06, fd / 2 - 0.06]].forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, fh * 0.94, 0.06), darkMat);
          leg.position.set(lx, fh * 0.47, lz as number);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }
      case 'bed': {
        // Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.25, fd), darkMat);
        base.position.y = fh * 0.125;
        base.castShadow = true;
        group.add(base);
        // Mattress
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.95, fh * 0.2, fd * 0.85), new THREE.MeshLambertMaterial({ color: 0xffffff }));
        mattress.position.y = fh * 0.35;
        group.add(mattress);
        // Headboard
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(fw, fh * 0.7, fd * 0.08), mat);
        headboard.position.set(0, fh * 0.6, -fd / 2 + 0.04);
        headboard.castShadow = true;
        group.add(headboard);
        // Pillow
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.4, fh * 0.08, fd * 0.15), new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }));
        pillow.position.set(0, fh * 0.47, -fd * 0.3);
        group.add(pillow);
        break;
      }
      case 'storage': {
        // Cabinet body
        const body = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), mat);
        body.position.y = fh / 2;
        body.castShadow = true;
        group.add(body);
        // Doors (2 panels)
        const door1 = new THREE.Mesh(new THREE.BoxGeometry(fw / 2 - 0.02, fh * 0.9, 0.02), lightMat);
        door1.position.set(-fw / 4, fh / 2, fd / 2 + 0.01);
        group.add(door1);
        const door2 = new THREE.Mesh(new THREE.BoxGeometry(fw / 2 - 0.02, fh * 0.9, 0.02), lightMat);
        door2.position.set(fw / 4, fh / 2, fd / 2 + 0.01);
        group.add(door2);
        // Handles
        [[-fw / 4 + 0.1, fw / 4 - 0.1]].flat().forEach(hx => {
          const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08), darkMat);
          handle.rotation.z = Math.PI / 2;
          handle.position.set(hx, fh / 2, fd / 2 + 0.03);
          group.add(handle);
        });
        break;
      }
      case 'lighting': {
        // Pendant shade
        const shade = new THREE.Mesh(new THREE.ConeGeometry(fw / 2, fh, 8, 1, true), new THREE.MeshLambertMaterial({ color, side: 2 }));
        shade.position.y = fh / 2;
        group.add(shade);
        // Bulb glow
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xffee88 }));
        bulb.position.y = fh * 0.1;
        group.add(bulb);
        const light = new THREE.PointLight(0xffee88, 0.8, 4);
        light.position.y = fh * 0.1;
        group.add(light);
        break;
      }
      case 'decor':
      default: {
        if (item.id === 'decor-2') {
          // Rug — flat plane with pattern
          const rug = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), mat);
          rug.rotation.x = -Math.PI / 2;
          rug.position.y = 0.005;
          rug.receiveShadow = true;
          group.add(rug);
        } else {
          // Sculpture — abstract form
          const base2 = new THREE.Mesh(new THREE.CylinderGeometry(fw / 3, fw / 2.5, fh * 0.15), darkMat);
          base2.position.y = fh * 0.075;
          group.add(base2);
          const body2 = new THREE.Mesh(new THREE.ConeGeometry(fw / 3, fh * 0.7, 6), mat);
          body2.position.y = fh * 0.5;
          body2.castShadow = true;
          group.add(body2);
        }
        break;
      }
    }

    // Position from item data
    if (item.position) {
      group.position.set(item.position.x, item.position.y, item.position.z);
    }

    group.userData.itemId = item.id;
    return group;
  }

  // Add items that are in the scene
  items.filter(i => i.inScene).forEach(item => {
    const mesh = buildFurnitureMesh(item);
    furnitureMeshes.set(item.id, mesh);
    scene.add(mesh);
  });

  // Animation loop
  let animId: number;
  function animate() {
    animId = requestAnimationFrame(animate);
    controls?.update();
    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  function onResize() {
    const w2 = canvas.clientWidth;
    const h2 = canvas.clientHeight;
    camera.aspect = w2 / h2;
    camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  }
  window.addEventListener('resize', onResize);

  return {
    renderer, scene, camera, controls,
    addItem: (item: FurnitureItem) => {
      if (!furnitureMeshes.has(item.id)) {
        const mesh = buildFurnitureMesh(item);
        furnitureMeshes.set(item.id, mesh);
        scene.add(mesh);
      }
    },
    removeItem: (itemId: string) => {
      const mesh = furnitureMeshes.get(itemId);
      if (mesh) { scene.remove(mesh); furnitureMeshes.delete(itemId); }
    },
    dispose: () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      controls?.dispose();
      renderer.dispose();
    },
  };
}

// ── React Component ──────────────────────────────────────────────────────────
interface ARVirtualStagingProps {
  propertyId?: string;
  roomType?: 'living' | 'bedroom' | 'dining' | 'office';
  onSaveScene?: (items: FurnitureItem[]) => void;
}

export function ARVirtualStaging({ propertyId, roomType = 'living', onSaveScene }: ARVirtualStagingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const [catalog, setCatalog] = useState<FurnitureItem[]>(NIGERIAN_FURNITURE_CATALOG);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [webXRSupported, setWebXRSupported] = useState(false);
  const [isARActive, setIsARActive] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [sceneLoaded, setSceneLoaded] = useState(false);

  // Check WebXR support
  useEffect(() => {
    if ('xr' in navigator) {
      (navigator as any).xr?.isSessionSupported?.('immersive-ar').then((supported: boolean) => {
        setWebXRSupported(supported);
      }).catch(() => {});
    }
  }, []);

  // Initialise Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;
    buildThreeScene(canvasRef.current, catalog).then(scene => {
      if (disposed || !scene) return;
      sceneRef.current = scene;
      setSceneLoaded(true);
    });
    return () => {
      disposed = true;
      sceneRef.current?.dispose();
    };
  }, []);

  const toggleItem = useCallback((itemId: string) => {
    setCatalog(prev => {
      const updated = prev.map(item => {
        if (item.id !== itemId) return item;
        const newInScene = !item.inScene;
        // Default positions by category
        const defaultPositions: Record<string, { x: number; y: number; z: number }> = {
          'sofa-1': { x: 0, y: 0, z: 1 }, 'sofa-2': { x: 0, y: 0, z: 1 },
          'table-1': { x: 0, y: 0, z: -0.5 }, 'table-2': { x: 1.5, y: 0, z: 0.5 },
          'bed-1': { x: 0, y: 0, z: 0 }, 'storage-1': { x: -2.5, y: 0, z: -1.5 },
          'decor-1': { x: 2, y: 0, z: -1 }, 'lighting-1': { x: 0, y: 2.8, z: 0 },
          'decor-2': { x: 0, y: 0, z: 0.5 }, 'table-3': { x: -1.5, y: 0, z: -2 },
        };
        const updatedItem = { ...item, inScene: newInScene, position: defaultPositions[itemId] || { x: 0, y: 0, z: 0 } };
        if (newInScene) sceneRef.current?.addItem(updatedItem);
        else sceneRef.current?.removeItem(itemId);
        return updatedItem;
      });
      const cost = updated.filter(i => i.inScene).reduce((s, i) => s + i.price, 0);
      setTotalCost(cost);
      return updated;
    });
  }, []);

  const handleStartAR = useCallback(async () => {
    if (!webXRSupported) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
      });
      setIsARActive(true);
      session.addEventListener('end', () => setIsARActive(false));
    } catch (e) {
      console.warn('WebXR AR session failed:', e);
    }
  }, [webXRSupported]);

  const filteredCatalog = selectedCategory === 'all'
    ? catalog
    : catalog.filter(i => i.category === selectedCategory);

  const inSceneItems = catalog.filter(i => i.inScene);
  const formatPrice = (n: number) => `₦${(n / 1_000).toFixed(0)}K`;
  const formatTotal = (n: number) => n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(2)}M` : `₦${(n / 1_000).toFixed(0)}K`;

  const categories = ['all', 'seating', 'table', 'bed', 'storage', 'decor', 'lighting'];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 3D Viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-stone-100 border" style={{ height: 400 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          aria-label="3D virtual staging viewer — use mouse to orbit, scroll to zoom"
        />
        {!sceneLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading 3D scene...</p>
            </div>
          </div>
        )}

        {/* Overlay controls */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="bg-white/90 text-xs">{roomType} room</Badge>
          {inSceneItems.length > 0 && (
            <Badge className="bg-primary/90 text-white text-xs">{inSceneItems.length} items · {formatTotal(totalCost)}</Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 flex gap-2">
          {webXRSupported && (
            <Button size="sm" variant="secondary" className="bg-white/90 text-xs h-8"
              onClick={handleStartAR} aria-label="Launch AR mode">
              {isARActive ? '⏹ Exit AR' : '📱 View in AR'}
            </Button>
          )}
          <Button size="sm" variant="secondary" className="bg-white/90 text-xs h-8"
            onClick={() => onSaveScene?.(inSceneItems)} aria-label="Save scene">
            💾 Save
          </Button>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-center">
          <span className="text-xs bg-black/40 text-white px-3 py-1 rounded-full">
            Drag to orbit · Scroll to zoom · Add furniture below
          </span>
        </div>
      </div>

      {/* Furniture catalog */}
      <Tabs defaultValue="catalog">
        <TabsList className="w-full">
          <TabsTrigger value="catalog" className="flex-1 text-xs">Furniture Catalog</TabsTrigger>
          <TabsTrigger value="scene" className="flex-1 text-xs">In Scene ({inSceneItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-3">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Furniture categories">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                aria-pressed={selectedCategory === cat}>
                {cat}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-2 gap-3">
            {filteredCatalog.map(item => (
              <div key={item.id}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${item.inScene ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}
                onClick={() => toggleItem(item.id)}
                role="checkbox"
                aria-checked={item.inScene}
                aria-label={`${item.inScene ? 'Remove' : 'Add'} ${item.name}`}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && toggleItem(item.id)}
              >
                {/* Color swatch */}
                <div className="w-full h-12 rounded-lg mb-2 flex items-center justify-center text-2xl"
                  style={{ backgroundColor: item.color + '33', border: `2px solid ${item.color}` }}>
                  {item.category === 'seating' ? '🛋' : item.category === 'table' ? '🪑' :
                   item.category === 'bed' ? '🛏' : item.category === 'storage' ? '🗄' :
                   item.category === 'lighting' ? '💡' : '🏺'}
                </div>
                <p className="text-xs font-semibold leading-tight mb-0.5">{item.name}</p>
                <p className="text-xs text-muted-foreground mb-1">{item.brand}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">{formatPrice(item.price)}</span>
                  {item.inScene && <Badge className="text-xs py-0 bg-primary">Added ✓</Badge>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scene">
          {inSceneItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-2xl mb-2">🛋</p>
              <p className="text-sm">No furniture added yet.</p>
              <p className="text-xs mt-1">Browse the catalog and tap items to add them.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inSceneItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: item.color + '33' }}>
                    {item.category === 'seating' ? '🛋' : item.category === 'table' ? '🪑' :
                     item.category === 'bed' ? '🛏' : item.category === 'storage' ? '🗄' :
                     item.category === 'lighting' ? '💡' : '🏺'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.dimensions.w}m × {item.dimensions.d}m × {item.dimensions.h}m</p>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">{formatPrice(item.price)}</span>
                  <button onClick={() => toggleItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${item.name}`}>✕</button>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <span className="text-sm font-semibold">Total Furniture Cost</span>
                <span className="text-base font-bold text-primary">{formatTotal(totalCost)}</span>
              </div>
              <Button className="w-full" onClick={() => onSaveScene?.(inSceneItems)}>
                Save Scene & Get Quote
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ARVirtualStaging;
