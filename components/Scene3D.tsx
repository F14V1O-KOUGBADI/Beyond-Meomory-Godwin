import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Memory } from '../types';

interface Scene3DProps {
  memories: Memory[];
  theme: 'European' | 'African' | 'Asian';
  inventory: string[];
  equippedItemId: string | null;
  onRoomChange?: (room: 'library' | 'rotunda') => void;
}

const Scene3D: React.FC<Scene3DProps> = ({ memories, theme, inventory, equippedItemId, onRoomChange }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const reqRef = useRef<number>(0);
  const artifactsRef = useRef<THREE.Mesh[]>([]);
  
  // Interaction state
  const cameraAngle = useRef({ theta: Math.PI / 2, phi: Math.PI / 2.5 });
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Locations
  const LIBRARY_POS = { x: 0, z: 0 };

  useEffect(() => {
    // Audio Init - Classical Piano
    const url = "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3";
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.6; 
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const tryPlay = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.log("Waiting for user interaction to play audio", e));
      }
    };

    tryPlay();

    const handleInteraction = () => {
      tryPlay();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // --- Theme Colors Configuration ---
  const getThemeColors = () => {
    const hasNebula = inventory.includes('5');
    
    if (equippedItemId === '1') { // Marble Mausoleum
       return { bg: '#000000', fog: '#000000', floor: '#1a1a1a', floorAlt: '#000000', wall: '#1a1a1a', columnMain: '#424242', columnDetail: '#212121', lightColor: '#4fc3f7', lightIntensity: 0.3, sunColor: '#0288d1', sunIntensity: 0.5, skylight: '#000000' };
    }
    if (equippedItemId === '4') { // Ancestral Statue
       return { bg: '#E0F7FA', fog: '#E0F7FA', floor: '#E0F7FA', floorAlt: '#E0F7FA', wall: '#ffffff', columnMain: '#ffffff', columnDetail: '#ffffff', lightColor: '#ffffff', lightIntensity: 1, sunColor: '#FFD700', sunIntensity: 2, skylight: '#ffffff' };
    }

    if (hasNebula) {
        return {
          bg: '#1A0033', fog: '#1A0033', floor: '#2a2a2a', floorAlt: '#1a1a1a', wall: '#000000', columnMain: '#4A148C', columnDetail: '#00E5FF', lightColor: '#D1C4E9', lightIntensity: 0.8, sunColor: '#E040FB', sunIntensity: 1.0, skylight: '#7C4DFF' 
        };
    }

    switch (theme) {
      case 'African':
        return {
          bg: '#2E1A0F', fog: '#2E1A0F', floor: '#D4AF37', floorAlt: '#B8860B', wall: '#4E342E', columnMain: '#3E2723', columnDetail: '#FFAB00', lightColor: '#FF6D00', lightIntensity: 0.9, sunColor: '#FF9100', sunIntensity: 1.5, skylight: '#FFAB00' 
        };
      case 'Asian':
        return {
          bg: '#000806', fog: '#000806', floor: '#2e7d32', floorAlt: '#1b5e20', wall: '#212121', columnMain: '#B71C1C', columnDetail: '#FFD700', lightColor: '#FFCDD2', lightIntensity: 0.7, sunColor: '#FFEB3B', sunIntensity: 1.1, skylight: '#81C784'
        };
      case 'European':
      default:
        return {
          bg: '#050A15', fog: '#050A15', floor: '#ECEFF1', floorAlt: '#CFD8DC', wall: '#263238', columnMain: '#FAFAFA', columnDetail: '#1A237E', lightColor: '#E3F2FD', lightIntensity: 0.5, sunColor: '#FFFFFF', sunIntensity: 1.2, skylight: '#90CAF9'
        };
    }
  };

  const getEmotionColor = (emotions: string[]): number => {
    if (!emotions || emotions.length === 0) return 0xFFFFFF;
    const e = emotions[0].toLowerCase();
    if (e.includes('joy') || e.includes('happy')) return 0xFFD700; 
    if (e.includes('sad') || e.includes('grief')) return 0x2962FF; 
    if (e.includes('love')) return 0xFF1744; 
    if (e.includes('nostalg')) return 0xFF6D00; 
    if (e.includes('peace')) return 0x00E676; 
    if (e.includes('fear')) return 0x6200EA; 
    return 0x00B0FF; 
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const themeConfig = getThemeColors();

    // --- Scene Init ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(themeConfig.bg); 
    scene.fog = new THREE.FogExp2(themeConfig.fog, 0.003); 
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000); 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- MATERIALS ---
    const createTexture = (color1: string, color2: string, size = 512, type = 'check') => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = color1; ctx.fillRect(0, 0, size, size);
            if (type === 'check') {
               const s = size/8;
               for(let y=0;y<size;y+=s) for(let x=0;x<size;x+=s) {
                 if((x/s + y/s)%2===0) { ctx.fillStyle=color2; ctx.fillRect(x,y,s,s); }
               }
            } else if (type === 'sand') { 
               for(let i=0;i<20000;i++) {
                  ctx.fillStyle = Math.random() > 0.5 ? color2 : '#f5deb3';
                  ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
               }
            } else if (type === 'noise') {
               for(let i=0;i<5000;i++) {
                  ctx.fillStyle = color2;
                  ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
               }
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        return tex;
    };

    const floorTex = createTexture(themeConfig.floor, themeConfig.floorAlt, 1024, theme === 'African' ? 'sand' : 'check'); 
    floorTex.repeat.set(24, 24);
    const wallTex = createTexture(themeConfig.wall, themeConfig.bg, 512, 'noise');
    
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: theme === 'African' ? 1 : 0.3 });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
    const columnMainMat = new THREE.MeshStandardMaterial({ color: themeConfig.columnMain, roughness: 0.5 });
    const bambooMat = new THREE.MeshStandardMaterial({ color: '#689F38', roughness: 0.6 });
    const lacquerMat = new THREE.MeshStandardMaterial({ color: '#B71C1C', roughness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#FFD700', metalness: 0.9, roughness: 0.2 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#558B2F', roughness: 0.8 });
    const blackboardMat = new THREE.MeshStandardMaterial({ color: '#263238', roughness: 0.8 });
    const neonMat = new THREE.MeshBasicMaterial({ color: '#00E5FF' });

    const createStylizedTree = (scale: number, hasLeaves: boolean, type: 'sapling'|'bush'|'tree'|'ancient') => {
        const grp = new THREE.Group();
        const trunkH = scale * 10;
        const trunkR = scale;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 8), new THREE.MeshStandardMaterial({color: '#3E2723'}));
        trunk.position.y = trunkH / 2;
        grp.add(trunk);

        if (hasLeaves) {
            const foliageCount = type === 'sapling' ? 1 : type === 'tree' ? 12 : 30;
            const size = scale * 4;
            let mat = leafMat;
            if (type === 'ancient') mat = goldMat;

            for(let i=0; i<foliageCount; i++) {
                const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), mat);
                foliage.position.y = trunkH + (Math.random() * size);
                foliage.position.x = (Math.random() - 0.5) * size * 2;
                foliage.position.z = (Math.random() - 0.5) * size * 2;
                grp.add(foliage);
            }
        }
        return grp;
    };

    // --- SCENE GENERATORS ---
    const createMausoleumScene = () => {
        const group = new THREE.Group();
        const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 64), new THREE.MeshStandardMaterial({color:'#212121'}));
        floor.rotation.x = -Math.PI / 2; floor.position.y = -10;
        group.add(floor);
        
        // Simple Mausoleum Pillars
        for(let i=0; i<8; i++){
            const angle = (i/8)*Math.PI*2;
            const col = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 150, 16), new THREE.MeshStandardMaterial({color:'#616161'}));
            col.position.set(Math.cos(angle)*80, 65, Math.sin(angle)*80);
            group.add(col);
        }
        return group;
    };

    const createAncestralSanctuary = () => {
        const group = new THREE.Group();
        const floor = new THREE.Mesh(new THREE.CylinderGeometry(100, 80, 10, 8), new THREE.MeshStandardMaterial({color:'#E0F7FA'}));
        floor.position.y = -15;
        group.add(floor);
        // Giant gold statue legs
        const leg1 = new THREE.Mesh(new THREE.BoxGeometry(10, 40, 10), goldMat); leg1.position.set(-8, 10, -50);
        const leg2 = new THREE.Mesh(new THREE.BoxGeometry(10, 40, 10), goldMat); leg2.position.set(8, 10, -50);
        group.add(leg1); group.add(leg2);
        return group;
    };

    const createLibrary = () => {
      const group = new THREE.Group();
      group.position.set(LIBRARY_POS.x, 0, LIBRARY_POS.z);

      const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 64), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -10;
      floor.receiveShadow = true;
      group.add(floor);

      const walls = new THREE.Mesh(new THREE.CylinderGeometry(120, 120, 80, 64, 1, true).scale(-1, 1, 1), wallMat);
      walls.position.y = 30;
      group.add(walls);

      if (theme === 'African') {
          const stages = [
             { name: 'Birth', type: 'root' }, { name: 'Early', type: 'toys' },
             { name: 'School', type: 'school' }, { name: 'Urban', type: 'urban' },
             { name: 'Build', type: 'build' }, { name: 'Heritage', type: 'heritage' },
             { name: 'Wisdom', type: 'ancient' }
          ];
          stages.forEach((stage, i) => {
              const angle = (i / 7) * Math.PI * 2;
              const r = 85;
              const x = Math.cos(angle) * r;
              const z = Math.sin(angle) * r;
              
              const stageGroup = new THREE.Group();
              stageGroup.position.set(x, -10, z);
              stageGroup.rotation.y = -angle; 

              const platform = new THREE.Mesh(new THREE.CylinderGeometry(15, 18, 2, 32), floorMat);
              platform.position.y = 1;
              stageGroup.add(platform);

              if (stage.type === 'root') stageGroup.add(createStylizedTree(0.5, true, 'sapling'));
              if (stage.type === 'school') {
                  const board = new THREE.Mesh(new THREE.BoxGeometry(16, 10, 0.5), blackboardMat);
                  board.position.y = 8; stageGroup.add(board);
              }
              if (stage.type === 'urban') {
                  const strip = new THREE.Mesh(new THREE.BoxGeometry(13, 0.5, 1.2), neonMat);
                  strip.position.y = 10; stageGroup.add(strip);
              }
              if (stage.type === 'ancient') {
                  const tree = createStylizedTree(2.5, true, 'ancient');
                  stageGroup.add(tree);
              }
              group.add(stageGroup);
          });
      } else if (theme === 'Asian') {
          for(let i=0; i<40; i++) {
               const h = 20 + Math.random()*20;
               const bamboo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, h, 8), bambooMat);
               bamboo.position.set((Math.random()-0.5)*100, h/2 - 10, (Math.random()-0.5)*100);
               if(Math.abs(bamboo.position.x) > 15) group.add(bamboo);
           }
           // Torii gate
           const torii = new THREE.Group();
           const post1 = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 15), lacquerMat); post1.position.set(-6, 7.5, -40);
           const post2 = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 15), lacquerMat); post2.position.set(6, 7.5, -40);
           const topBar = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 1), lacquerMat); topBar.position.set(0, 14, -40);
           torii.add(post1); torii.add(post2); torii.add(topBar);
           group.add(torii);
      } else {
          for(let i=0; i<12; i++) {
              const angle = (i/12)*Math.PI*2;
              const col = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 40, 16), columnMainMat);
              col.position.set(Math.cos(angle)*50, 10, Math.sin(angle)*50);
              group.add(col);
          }
      }
      return group;
    };

    let envGroup: THREE.Group;
    if (equippedItemId === '1') envGroup = createMausoleumScene();
    else if (equippedItemId === '4') envGroup = createAncestralSanctuary();
    else envGroup = createLibrary();
    
    scene.add(envGroup);

    // Add Memories
    memories.forEach((mem, i) => {
        const angle = (i / (memories.length || 1)) * Math.PI * 2;
        const radius = 30;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        const color = getEmotionColor(mem.emotions);
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(3, 4, 0.2), 
            new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 })
        );
        mesh.position.set(x, 0, z);
        mesh.lookAt(0, 0, 0);
        scene.add(mesh);
    });

    // Lights
    const ambientLight = new THREE.AmbientLight(themeConfig.lightColor, themeConfig.lightIntensity);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(themeConfig.sunColor, themeConfig.sunIntensity);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // Loop
    const animate = () => {
        reqRef.current = requestAnimationFrame(animate);
        cameraAngle.current.theta += 0.0005;
        camera.position.x = 80 * Math.sin(cameraAngle.current.theta);
        camera.position.z = 80 * Math.cos(cameraAngle.current.theta);
        camera.position.y = 30;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(reqRef.current);
        if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
    };

  }, [memories, theme, inventory, equippedItemId]);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default Scene3D;