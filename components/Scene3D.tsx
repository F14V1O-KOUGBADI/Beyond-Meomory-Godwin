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
  
  // Character Refs
  const characterRef = useRef<THREE.Group | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Interaction state
  const cameraAngle = useRef({ 
      theta: Math.PI / 2, // Horizontal angle
      phi: Math.PI / 2.5  // Vertical angle
  });
  
  // Focus State (Zoom logic)
  const [focusedMemory, setFocusedMemory] = useState<Memory | null>(null);
  // We use a ref to track the focus target ID inside the animation loop to avoid dependency staleness
  const focusedMemoryIdRef = useRef<string | null>(null); 

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Locations
  const LIBRARY_POS = { x: 0, z: 0 };

  // --- AUDIO MANAGEMENT ---
  useEffect(() => {
    // Select audio based on theme
    let audioUrl = "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3"; // Default European (Piano)

    if (theme === 'African') {
        audioUrl = "https://cdn.pixabay.com/audio/2021/09/06/audio_342f56780c.mp3"; // Nature/Atmospheric
    } else if (theme === 'Asian') {
        audioUrl = "https://cdn.pixabay.com/audio/2021/11/24/audio_825f636605.mp3"; // Zen/Ambient
    }

    if (!audioRef.current) {
        // Initialize Audio
        const audio = new Audio(audioUrl);
        audio.loop = true;
        audio.volume = 0.5; 
        audio.crossOrigin = "anonymous";
        audioRef.current = audio;
    } else {
        // Switch Track if theme changes
        if (audioRef.current.src !== audioUrl) {
            const wasPlaying = !audioRef.current.paused;
            // Fade out effect could be here, but for now abrupt switch
            audioRef.current.src = audioUrl;
            if (wasPlaying) {
                audioRef.current.play().catch((e) => console.log("Audio play failed:", e));
            }
        }
    }

    const tryPlay = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.log("Waiting for user interaction to play audio", e));
      }
    };

    // User interaction listeners to unlock audio context
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
    };
  }, [theme]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.src = '';
          }
      };
  }, []);

  const setInput = (key: string, value: boolean) => {
    keysPressed.current[key] = value;
  };

  const handleCloseFocus = () => {
      setFocusedMemory(null);
      focusedMemoryIdRef.current = null;
  };

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

  // --- EFFECT: Handle Video Texture Playback on Focus ---
  // We keep the texture video muted and play/pause it based on focus.
  // The Overlay will handle the audible playback.
  useEffect(() => {
    // 1. Pause all videos initially
    artifactsRef.current.forEach(g => {
        const video = g.userData.videoElement as HTMLVideoElement | undefined;
        if (video) {
            video.pause();
        }
    });

    // 2. Play focused video (muted) to animate the 3D texture
    if (focusedMemory && focusedMemory.video) {
        const targetGroup = artifactsRef.current.find(obj => obj.userData.id === focusedMemory.id);
        if (targetGroup && targetGroup.userData.videoElement) {
             const video = targetGroup.userData.videoElement as HTMLVideoElement;
             video.play().catch(e => console.log("Texture video play failed", e));
        }
    }
  }, [focusedMemory]);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- TEXTURES ---
    const textureLoader = new THREE.TextureLoader();
    
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
    
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 128; faceCanvas.height = 128;
    const fctx = faceCanvas.getContext('2d');
    if (fctx) {
       fctx.fillStyle = '#ffccbc'; fctx.fillRect(0,0,128,128);
       fctx.fillStyle = '#333';
       fctx.fillRect(35, 50, 15, 15);
       fctx.fillRect(80, 50, 15, 15);
       fctx.beginPath(); fctx.arc(64, 85, 20, 0, Math.PI); fctx.stroke();
    }
    const faceTex = new THREE.CanvasTexture(faceCanvas);

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: theme === 'African' ? 1 : 0.3 });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
    const columnMainMat = new THREE.MeshStandardMaterial({ color: themeConfig.columnMain, roughness: 0.5 });
    const bambooMat = new THREE.MeshStandardMaterial({ color: '#689F38', roughness: 0.6 });
    const lacquerMat = new THREE.MeshStandardMaterial({ color: '#B71C1C', roughness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#FFD700', metalness: 0.9, roughness: 0.2 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#558B2F', roughness: 0.8 });
    const autumnLeafMat = new THREE.MeshStandardMaterial({ color: '#FF6F00', roughness: 0.8 });
    const blackboardMat = new THREE.MeshStandardMaterial({ color: '#263238', roughness: 0.8 });
    const neonMat = new THREE.MeshBasicMaterial({ color: '#00E5FF' });

    const createStylizedTree = (scale: number, hasLeaves: boolean, type: 'sapling'|'bush'|'tree'|'ancient'|'autumn'|'cherry') => {
        const grp = new THREE.Group();
        const trunkH = scale * 10;
        const trunkR = scale;
        const trunkColor = type === 'cherry' ? '#5D4037' : '#3E2723';
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 8), new THREE.MeshStandardMaterial({color: trunkColor}));
        trunk.position.y = trunkH / 2;
        grp.add(trunk);

        if (hasLeaves) {
            const foliageCount = type === 'sapling' ? 1 : type === 'bush' ? 5 : type === 'tree' ? 12 : type === 'autumn' ? 20 : 30;
            const size = scale * 4;
            let mat = leafMat;
            if (type === 'autumn') mat = autumnLeafMat;
            if (type === 'ancient') mat = goldMat;
            if (type === 'cherry') mat = new THREE.MeshStandardMaterial({color: '#F48FB1'});

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
             { name: 'Wisdom', type: 'ancient' }, { name: 'Memory', type: 'trace'}
          ];
          stages.forEach((stage, i) => {
              const angle = (i / 8) * Math.PI * 2;
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
              if (stage.type === 'toys') {
                  for(let j=0;j<3;j++) {
                      const t = new THREE.Mesh(new THREE.BoxGeometry(2,2,2), new THREE.MeshStandardMaterial({color: Math.random()*0xffffff}));
                      t.position.set((j-1)*3, 3, 0); stageGroup.add(t);
                  }
              }
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
               if (stage.type === 'build') {
                  const bl = new THREE.Mesh(new THREE.BoxGeometry(6,12,6), new THREE.MeshStandardMaterial({color:'#90CAF9', transparent:true, opacity:0.5}));
                  bl.position.y = 6; stageGroup.add(bl);
              }
              if (stage.type === 'heritage') {
                  stageGroup.add(createStylizedTree(1.5, true, 'tree'));
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
      
       // --- Render Inventory ---
        if (inventory.includes('2')) { // Garden
            const garden = new THREE.Group();
            for(let i=0; i<300; i++) {
                const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 5), new THREE.MeshStandardMaterial({color: Math.random()>.5 ? '#E91E63' : '#9C27B0'}));
                f.position.set((Math.random()-0.5)*200, -9, (Math.random()-0.5)*200); f.rotation.x = Math.PI; garden.add(f);
            }
            group.add(garden);
        }
        if (inventory.includes('3')) { // Candle
            const candles = new THREE.Group();
            for(let i=0; i<12; i++) {
                const angle = (i/12)*Math.PI*2;
                const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1), new THREE.MeshStandardMaterial({color:'#fff'}));
                c.position.set(Math.cos(angle)*15, -9.5, Math.sin(angle)*15); 
                const flame = new THREE.PointLight('#FF6D00', 0.5, 5); flame.position.y = 1; c.add(flame); candles.add(c);
            }
            group.add(candles);
        }
        if (inventory.includes('6')) { // Ring
           const ring = new THREE.Mesh(new THREE.TorusGeometry(60, 1, 16, 100), goldMat);
           ring.rotation.x = Math.PI/2; ring.position.y = 40; group.add(ring);
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
        
        // PARENT FRAME: Handles Position in Circle and Orientation to User
        const frame = new THREE.Group();
        const initialY = 5 + Math.random() * 5;
        frame.position.set(x, initialY, z);
        // Look away from center so the front face (Z+) faces outwards towards the character
        frame.lookAt(x * 2, initialY, z * 2);

        // CHILD MESH: Handles Local Animation (Float/Rock) without disturbing Parent Orientation
        const memoryMeshGroup = new THREE.Group(); // Inner group for animation
        frame.add(memoryMeshGroup);

        let boxMat;
        let videoEl: HTMLVideoElement | null = null;

        if (mem.video) {
            videoEl = document.createElement('video');
            videoEl.src = mem.video;
            videoEl.crossOrigin = "anonymous";
            videoEl.loop = true;
            videoEl.muted = true; // Muted for 3D texture loop
            videoEl.playsInline = true;
            // Attempt to load to get a frame
            videoEl.load();
            videoEl.currentTime = 0.1;

            const vidTex = new THREE.VideoTexture(videoEl);
            vidTex.colorSpace = THREE.SRGBColorSpace;
            vidTex.minFilter = THREE.LinearFilter;
            vidTex.magFilter = THREE.LinearFilter;
            boxMat = new THREE.MeshBasicMaterial({ map: vidTex });
        } else if (mem.image) {
            const texture = textureLoader.load(mem.image);
            texture.colorSpace = THREE.SRGBColorSpace;
            boxMat = new THREE.MeshBasicMaterial({ map: texture });
        } else {
            boxMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        }

        const box = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 0.5), boxMat);
        memoryMeshGroup.add(box);
        
        const border = new THREE.Mesh(new THREE.BoxGeometry(8.2, 10.2, 0.4), new THREE.MeshBasicMaterial({ color: color }));
        memoryMeshGroup.add(border);
        
        // Store reference to the ANIMATED child group
        memoryMeshGroup.userData = { 
            id: mem.id, 
            type: 'memory', 
            // We use 0 as base for local animation, actual Y offset is handled by parent frame
            phase: Math.random() * Math.PI * 2,
            videoElement: videoEl
        };
        
        // We push the inner group to artifacts so we animate IT, not the frame
        artifactsRef.current.push(memoryMeshGroup as any); 
        scene.add(frame);
    });

    // --- CHARACTER ---
    const character = new THREE.Group();
    character.position.set(0, -10, 60);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshStandardMaterial({map:faceTex})); head.position.y=5; character.add(head);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 3.5), new THREE.MeshStandardMaterial({color:'#9D8EFF'})); body.position.y=2.5; character.add(body);
    scene.add(character);
    characterRef.current = character;

    // Lights
    const ambientLight = new THREE.AmbientLight(themeConfig.lightColor, themeConfig.lightIntensity);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(themeConfig.sunColor, themeConfig.sunIntensity);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // --- ANIMATION LOOP (CAMERA-RELATIVE MOVEMENT) ---
    const clock = new THREE.Clock();
    
    // Variables for Camera Transitions
    const currentCameraPos = new THREE.Vector3();
    const currentCameraLookAt = new THREE.Vector3();

    const animate = () => {
        reqRef.current = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();
        
        const isFocused = !!focusedMemoryIdRef.current;

        if (characterRef.current && cameraRef.current) {
            
            // --- BRANCH 1: FOCUSED MODE (ZOOM IN) ---
            if (isFocused) {
               // Find the target object
               let targetObj: THREE.Object3D | null = null;
               artifactsRef.current.forEach(art => {
                 if (art.userData.id === focusedMemoryIdRef.current) targetObj = art;
               });

               if (targetObj) {
                  // Calculate Zoom Target Position
                  const targetWorldPos = new THREE.Vector3();
                  (targetObj as THREE.Object3D).getWorldPosition(targetWorldPos);
                  
                  const targetWorldDir = new THREE.Vector3();
                  (targetObj as THREE.Object3D).getWorldDirection(targetWorldDir);
                  
                  // Position camera 15 units "in front" of the object.
                  // Since the artifacts look outwards (Z+), we position camera at Pos + (Dir * 15)
                  const camTargetPos = targetWorldPos.clone().add(targetWorldDir.clone().multiplyScalar(15));
                  
                  cameraRef.current.position.lerp(camTargetPos, 0.05);
                  
                  // Smoothly adjust lookAt by using a dummy object or simple slerp, 
                  // but for simplicity, we keep looking at the target center during lerp
                  cameraRef.current.lookAt(targetWorldPos);
               }

            } 
            // --- BRANCH 2: EXPLORATION MODE (CHARACTER CONTROL) ---
            else {
                const moveSpeed = 40 * delta;
                const rotSpeed = 2 * delta;
                
                // 1. Camera Directions
                const camDir = new THREE.Vector3();
                cameraRef.current.getWorldDirection(camDir);
                camDir.y = 0; // Flatten trajectory
                camDir.normalize();
                const camRight = new THREE.Vector3(-camDir.z, 0, camDir.x);

                // 2. Input
                const moveVec = new THREE.Vector3(0, 0, 0);
                const isUp = keysPressed.current['ArrowUp'];
                const isDown = keysPressed.current['ArrowDown'];
                const isLeft = keysPressed.current['ArrowLeft'];
                const isRight = keysPressed.current['ArrowRight'];

                if (isUp) moveVec.add(camDir);
                if (isDown) moveVec.sub(camDir);
                if (isRight) moveVec.add(camRight);
                if (isLeft) moveVec.sub(camRight);

                // 3. Move Character
                if (moveVec.lengthSq() > 0) {
                    moveVec.normalize().multiplyScalar(moveSpeed);
                    characterRef.current.position.add(moveVec);
                    
                    const targetAngle = Math.atan2(moveVec.x, moveVec.z);
                    const currentRot = characterRef.current.rotation.y;
                    let diff = targetAngle - currentRot;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    characterRef.current.rotation.y += diff * 0.1; 
                }

                // 4. Update Angles
                if (keysPressed.current['KeyQ'] || keysPressed.current['KeyA']) cameraAngle.current.theta += rotSpeed;
                if (keysPressed.current['KeyD']) cameraAngle.current.theta -= rotSpeed;
                if (keysPressed.current['KeyZ'] || keysPressed.current['KeyW']) cameraAngle.current.phi = Math.max(0.1, cameraAngle.current.phi - rotSpeed);
                if (keysPressed.current['KeyS']) cameraAngle.current.phi = Math.min(Math.PI - 0.1, cameraAngle.current.phi + rotSpeed);

                // 5. Calculate Chase Camera Position
                const targetPos = characterRef.current.position.clone();
                targetPos.y += 5; // Look at head height
                
                const dist = 20; 
                const offsetX = dist * Math.sin(cameraAngle.current.phi) * Math.sin(cameraAngle.current.theta);
                const offsetY = dist * Math.cos(cameraAngle.current.phi);
                const offsetZ = dist * Math.sin(cameraAngle.current.phi) * Math.cos(cameraAngle.current.theta);
                
                const idealCamPos = new THREE.Vector3(
                    targetPos.x + offsetX,
                    targetPos.y + offsetY,
                    targetPos.z + offsetZ
                );
                
                // Lerp for smooth camera follow/re-entry from zoom
                cameraRef.current.position.lerp(idealCamPos, 0.1);
                cameraRef.current.lookAt(targetPos);
            }
        }

        // --- Animate Memory Artifacts (Floating & Rocking) ---
        artifactsRef.current.forEach((memoryGroup) => {
             const { phase } = memoryGroup.userData;
             if (phase !== undefined) {
                 memoryGroup.position.y = Math.sin(time + phase) * 0.5;
                 memoryGroup.rotation.z = Math.sin(time * 0.5 + phase) * 0.05;
             }
        });
        
        rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };
    animate();

    const handleResize = () => {
        if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => setInput(e.code, true);
    const handleKeyUp = (e: KeyboardEvent) => setInput(e.code, false);
    
    // RAYCASTER CLICK
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (e: MouseEvent) => {
        if (!cameraRef.current || !sceneRef.current) return;
        const rect = mountRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // If already focused, clicking anywhere else (canvas) shouldn't immediately dismiss
        // We'll let the UI close button handle dismissal, or click outside to dismiss
        // But for simplicity, we only handle *selecting* here.

        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(artifactsRef.current, true);
        
        if (intersects.length > 0) {
            let target = intersects[0].object;
            while(target && !target.userData.id && target.parent) {
                target = target.parent;
            }
            if (target && target.userData.id) {
                const id = target.userData.id;
                const mem = memories.find(m => m.id === id) || null;
                setFocusedMemory(mem);
                focusedMemoryIdRef.current = id;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleClick);

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousedown', handleClick);
        cancelAnimationFrame(reqRef.current);
        if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
    };

  }, [memories, theme, inventory, equippedItemId]);

  return (
    <div className="relative w-full h-full">
        {/* 3D Canvas Container */}
        <div ref={mountRef} className="w-full h-full cursor-pointer" />

        {/* FOCUSED MEMORY OVERLAY */}
        {focusedMemory && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-brand-surface border border-white/10 p-8 rounded-2xl max-w-2xl w-full shadow-2xl relative flex flex-col md:flex-row gap-8 items-center">
                    
                    {/* Close Button */}
                    <button 
                        onClick={handleCloseFocus}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-50"
                    >
                        ✕
                    </button>

                    {/* Media Display */}
                    {focusedMemory.video ? (
                        <div className="w-full md:w-1/2 h-64 rounded-xl overflow-hidden shadow-lg border border-white/5 bg-black">
                            <video 
                                src={focusedMemory.video} 
                                className="w-full h-full object-contain" 
                                controls 
                                autoPlay
                            />
                        </div>
                    ) : focusedMemory.image ? (
                        <div className="w-full md:w-1/2 h-64 rounded-xl overflow-hidden shadow-lg border border-white/5">
                            <img src={focusedMemory.image} alt="Memory" className="w-full h-full object-cover" />
                        </div>
                    ) : null}

                    {/* Content */}
                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{focusedMemory.date}</span>
                            {focusedMemory.ageAtMoment && (
                                <span className="px-2 py-0.5 bg-brand-purple/20 text-brand-purple text-[10px] font-bold rounded uppercase">
                                    Age {focusedMemory.ageAtMoment}
                                </span>
                            )}
                        </div>
                        
                        <p className="font-serif text-2xl md:text-3xl text-white leading-relaxed mb-6">
                            "{focusedMemory.content}"
                        </p>

                        <div className="flex flex-wrap gap-2">
                             {focusedMemory.emotions.map(emo => (
                               <span key={emo} className="px-3 py-1 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-full">{emo}</span>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Scene3D;