import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface Scene3DProps {
  images: { url: string; roomId: 'library' | 'rotunda' }[];
  onRoomChange?: (room: 'library' | 'rotunda') => void;
}

const Scene3D: React.FC<Scene3DProps> = ({ images, onRoomChange }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const reqRef = useRef<number>(0);
  const galleryGroupRef = useRef<THREE.Group | null>(null);
  
  // Character Refs
  const characterRef = useRef<THREE.Group | null>(null);
  const characterSpeed = 1.2; 
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Interaction state
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const cameraAngle = useRef({ theta: 0, phi: Math.PI / 2.5 });

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Locations
  const LIBRARY_POS = { x: 0, z: 0 };
  const ROTUNDA_POS = { x: 0, z: -350 };
  const CORRIDOR_WIDTH = 40; // Allow movement in corridor

  useEffect(() => {
    // Audio Init - Titanic Style Cinematic
    // Using a reliable emotional cinematic track (Sad Cinematic Piano)
    const url = "https://cdn.pixabay.com/audio/2021/09/06/audio_3464195b0d.mp3";
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 1.0; 
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    // Attempt Autoplay
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.log("Autoplay prevented by browser. Waiting for interaction.", error);
          setIsPlaying(false);
        });
    }

    // Interaction Fallback: If autoplay failed, start on first click
    const handleInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Interaction play failed", e));
      }
    };
    
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const toggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the global interaction listener
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const teleport = (room: 'library' | 'rotunda') => {
    if (!characterRef.current) return;
    
    if (room === 'library') {
      characterRef.current.position.set(LIBRARY_POS.x, -10, LIBRARY_POS.z + 60);
      if (onRoomChange) onRoomChange('library');
    } else {
      characterRef.current.position.set(ROTUNDA_POS.x, -10, ROTUNDA_POS.z + 60);
      if (onRoomChange) onRoomChange('rotunda');
    }
  };

  const setInput = (key: string, value: boolean) => {
    keysPressed.current[key] = value;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene Init ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a120b'); 
    scene.fog = new THREE.FogExp2('#1a120b', 0.002); 
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000); 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- PROCEDURAL TEXTURES ---
    const createTexture = (color1: string, color2: string, size = 512, type = 'check') => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = color1;
            ctx.fillRect(0, 0, size, size);
            if (type === 'check') {
               const s = size/8;
               for(let y=0;y<size;y+=s) for(let x=0;x<size;x+=s) {
                 if((x/s + y/s)%2===0) { ctx.fillStyle=color2; ctx.fillRect(x,y,s,s); }
               }
            } else if (type === 'noise') {
               for(let i=0;i<5000;i++) {
                  ctx.fillStyle = color2;
                  ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
               }
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    };

    const parquetTex = createTexture('#5d4037', '#6d4c41', 1024, 'check');
    parquetTex.repeat.set(24, 24);
    
    const booksTex = createTexture('#3e2723', '#26160c', 512, 'noise'); // Simplified for perf
    booksTex.repeat.set(36, 12);
    
    const plankTex = createTexture('#4e342e', '#3e2723', 512, 'check'); // Simplified
    plankTex.repeat.set(16, 8);
    
    const snowFloorTex = createTexture('#f5f5f5', '#e0e0e0', 512, 'noise');
    snowFloorTex.repeat.set(32, 32);

    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 128; faceCanvas.height = 128;
    const fctx = faceCanvas.getContext('2d');
    if (fctx) {
       fctx.fillStyle = '#ffccbc'; fctx.fillRect(0,0,128,128);
       fctx.fillStyle = '#333';
       fctx.fillRect(35, 50, 15, 15); // Left Eye
       fctx.fillRect(80, 50, 15, 15); // Right Eye
       fctx.beginPath(); fctx.arc(64, 85, 20, 0, Math.PI); fctx.stroke(); // Mouth
    }
    const faceTex = new THREE.CanvasTexture(faceCanvas);

    // --- MATERIALS ---
    const floorMat = new THREE.MeshStandardMaterial({ map: parquetTex, roughness: 0.3, metalness: 0.1 });
    const wallMat = new THREE.MeshStandardMaterial({ map: booksTex, roughness: 0.8 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, opacity: 1, metalness: 0, roughness: 0, thickness: 0.5 });
    const columnWoodMat = new THREE.MeshStandardMaterial({ color: '#8d6e63', roughness: 0.5 });
    const columnRedMat = new THREE.MeshStandardMaterial({ color: '#c62828', roughness: 0.6 });
    
    // Rotunda Materials
    const rotundaFloorMat = new THREE.MeshStandardMaterial({ map: snowFloorTex, roughness: 0.9 });
    const rotundaWallMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.9 });
    const rotundaColumnMat = new THREE.MeshStandardMaterial({ color: '#3e2723', roughness: 0.8 });
    const rotundaDomeMat = new THREE.MeshStandardMaterial({ color: '#2d1e15', side: THREE.BackSide });
    const snowParticleMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
    
    // Character Materials
    const skinMat = new THREE.MeshStandardMaterial({ map: faceTex });
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#1a237e' }); // Blue shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#212121' }); // Black jeans
    const shoeMat = new THREE.MeshStandardMaterial({ color: '#3e2723' }); // Brown shoes

    // ==========================================
    // ROOM 1: RENAISSANCE LIBRARY (Center 0,0)
    // ==========================================
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

      const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1a0f05', side: THREE.BackSide }));
      dome.position.y = 70;
      group.add(dome);

      const skylight = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: '#ffecb3' }));
      skylight.rotation.x = Math.PI / 2;
      skylight.position.y = 130;
      group.add(skylight);

      // Columns
      for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const r = 80;
          const colGroup = new THREE.Group();
          colGroup.position.set(Math.cos(angle) * r, -10, Math.sin(angle) * r);
          colGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 2, 32), columnRedMat).translateY(1));
          colGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 60, 32), columnWoodMat).translateY(32));
          colGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 10, 32), columnRedMat).translateY(15));
          colGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(5, 3.5, 3, 32), columnRedMat).translateY(62));
          group.add(colGroup);
      }
      
      // Glass Cases
      [0, Math.PI/2, Math.PI, Math.PI*1.5].forEach((angle, i) => {
         const r = 35;
         const cGroup = new THREE.Group();
         cGroup.position.set(Math.cos(angle)*r, -10, Math.sin(angle)*r);
         cGroup.rotation.y = -angle + Math.PI/2;
         cGroup.add(new THREE.Mesh(new THREE.BoxGeometry(10, 4, 10), new THREE.MeshStandardMaterial({color:'#212121'})).translateY(2));
         cGroup.add(new THREE.Mesh(new THREE.BoxGeometry(10, 15, 10), glassMat).translateY(11.5));
         cGroup.add(new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.5, 10.2), new THREE.MeshStandardMaterial({color:'#111'})).translateY(19));
         
         // Art
         const art = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshStandardMaterial({ color: '#ffd700', metalness: 0.8, roughness: 0.2 }));
         art.position.y = 7;
         cGroup.add(art);
         
         const light = new THREE.PointLight(0xffaa00, 1.5, 15);
         light.position.y = 10;
         cGroup.add(light);
         group.add(cGroup);
      });

      scene.add(group);
    };

    // ==========================================
    // ROOM 2: WINTER CHRISTMAS ROTUNDA
    // ==========================================
    const createRotunda = () => {
      const group = new THREE.Group();
      group.position.set(ROTUNDA_POS.x, 0, ROTUNDA_POS.z);

      const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 64), rotundaFloorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -10;
      floor.receiveShadow = true;
      group.add(floor);

      const walls = new THREE.Mesh(new THREE.CylinderGeometry(120, 120, 80, 64, 1, true).scale(-1, 1, 1), rotundaWallMat);
      walls.position.y = 30;
      group.add(walls);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), rotundaDomeMat);
      dome.position.y = 70;
      group.add(dome);

      const skylight = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: '#cfd8dc' }));
      skylight.rotation.x = Math.PI / 2;
      skylight.position.y = 130;
      group.add(skylight);

      // Columns
      for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const r = 80;
          const colGroup = new THREE.Group();
          colGroup.position.set(Math.cos(angle)*r, -10, Math.sin(angle)*r);
          colGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 2, 32), rotundaColumnMat).translateY(1));
          colGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 60, 32), rotundaColumnMat).translateY(32));
          colGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 4, 32), rotundaColumnMat).translateY(62));
          group.add(colGroup);
      }

      // Christmas Tree
      const treeGroup = new THREE.Group();
      treeGroup.position.y = -10;
      treeGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 8, 16), new THREE.MeshStandardMaterial({color:'#3e2723'})).translateY(4));
      
      const needleMat = new THREE.MeshStandardMaterial({ color: '#1b5e20', roughness: 0.8 });
      [10, 18, 26, 32].forEach((y, i) => {
         const r = 14 - i*3;
         const h = 16 - i*2;
         treeGroup.add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 32), needleMat).translateY(y));
      });
      
      treeGroup.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.5), new THREE.MeshStandardMaterial({color:'#ffd700', emissive:'#ffd700'})).translateY(38));
      
      // Ornaments
      for(let i=0; i<40; i++) {
        const o = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshStandardMaterial({color:Math.random()>.5?'#f00':'#ff0', emissiveIntensity:0.5}));
        const theta = Math.random()*Math.PI*2;
        const h = 6 + Math.random()*30;
        const r = (1 - (h-6)/32) * 12;
        o.position.set(Math.cos(theta)*r, h, Math.sin(theta)*r);
        treeGroup.add(o);
      }
      group.add(treeGroup);

      // Snow Boys
      for(let i=0; i<6; i++) {
         const angle = (i/6)*Math.PI*2;
         const sb = new THREE.Group();
         sb.position.set(Math.cos(angle)*35, -10, Math.sin(angle)*35);
         sb.rotation.y = -angle + Math.PI;
         sb.add(new THREE.Mesh(new THREE.SphereGeometry(3), snowParticleMat).translateY(3));
         sb.add(new THREE.Mesh(new THREE.SphereGeometry(2.2), snowParticleMat).translateY(7));
         sb.add(new THREE.Mesh(new THREE.SphereGeometry(1.5), snowParticleMat).translateY(10));
         sb.add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5), new THREE.MeshStandardMaterial({color:'#ff6d00'})).rotateX(Math.PI/2).translateY(1.5).translateZ(10));
         group.add(sb);
      }

      scene.add(group);
    };
    
    // Corridor Floor connecting rooms
    const corridorGeo = new THREE.PlaneGeometry(40, 350);
    const corridor = new THREE.Mesh(corridorGeo, floorMat); // Use parquet for hallway
    corridor.rotation.x = -Math.PI/2;
    corridor.position.set(0, -9.9, -175); // Halfway between 0 and -350
    scene.add(corridor);

    createLibrary();
    createRotunda();

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffcc88, 0.5); 
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffe0b2, 1.0);
    sunLight.position.set(50, 150, 50);
    scene.add(sunLight);

    // --- PARTICLES ---
    const petalCount = 1500;
    const petalsMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffb7c5, side: THREE.DoubleSide, opacity: 0.8, transparent: true }), petalCount);
    const petalData = new Float32Array(petalCount * 4); 
    const dummy = new THREE.Object3D();
    for(let i=0; i<petalCount; i++) {
        petalData[i*4] = (Math.random()-0.5)*220; petalData[i*4+1] = Math.random()*80; petalData[i*4+2] = (Math.random()-0.5)*220; petalData[i*4+3] = Math.random()*6;
    }
    scene.add(petalsMesh);

    const snowCount = 2000;
    const snowMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, opacity: 0.9, transparent: true }), snowCount);
    const snowData = new Float32Array(snowCount * 4);
    for(let i=0; i<snowCount; i++) {
        snowData[i*4] = (Math.random()-0.5)*220 + ROTUNDA_POS.x; snowData[i*4+1] = Math.random()*80; snowData[i*4+2] = (Math.random()-0.5)*220 + ROTUNDA_POS.z; snowData[i*4+3] = Math.random()*6;
    }
    scene.add(snowMesh);

    // --- REALISTIC CHARACTER ---
    const charGroup = new THREE.Group();
    charGroup.position.set(LIBRARY_POS.x, -10, LIBRARY_POS.z + 60);
    
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), skinMat);
    head.position.y = 16.5;
    head.rotation.y = -Math.PI/2; // Face forward
    charGroup.add(head);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 1.5), shirtMat);
    torso.position.y = 13;
    charGroup.add(torso);

    // Arms (Jointed Groups)
    const leftArmGrp = new THREE.Group(); leftArmGrp.position.set(-1.8, 15, 0); charGroup.add(leftArmGrp);
    const rightArmGrp = new THREE.Group(); rightArmGrp.position.set(1.8, 15, 0); charGroup.add(rightArmGrp);
    
    // Arm Meshes
    const armGeo = new THREE.CapsuleGeometry(0.6, 4, 4, 8);
    const leftArmMesh = new THREE.Mesh(armGeo, shirtMat); leftArmMesh.position.y = -2; leftArmGrp.add(leftArmMesh);
    const rightArmMesh = new THREE.Mesh(armGeo, shirtMat); rightArmMesh.position.y = -2; rightArmGrp.add(rightArmMesh);

    // Legs (Jointed Groups)
    const leftLegGrp = new THREE.Group(); leftLegGrp.position.set(-0.8, 10.5, 0); charGroup.add(leftLegGrp);
    const rightLegGrp = new THREE.Group(); rightLegGrp.position.set(0.8, 10.5, 0); charGroup.add(rightLegGrp);

    // Leg Meshes
    const legGeo = new THREE.CapsuleGeometry(0.7, 5, 4, 8);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat); leftLegMesh.position.y = -2.5; leftLegGrp.add(leftLegMesh);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat); rightLegMesh.position.y = -2.5; rightLegGrp.add(rightLegMesh);
    
    // Shoes
    const shoeGeo = new THREE.BoxGeometry(1, 0.8, 2);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat); leftShoe.position.set(0, -5, 0.5); leftLegGrp.add(leftShoe);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat); rightShoe.position.set(0, -5, 0.5); rightLegGrp.add(rightShoe);

    scene.add(charGroup);
    characterRef.current = charGroup;

    // --- Gallery Group ---
    const galleryGroup = new THREE.Group();
    scene.add(galleryGroup);
    galleryGroupRef.current = galleryGroup;

    // --- Animation Loop ---
    const animate = () => {
      reqRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // Particles
      for(let i=0; i<petalCount; i++) {
        let y = petalData[i*4+1] - 0.05;
        if(y<-10) y=70;
        petalData[i*4+1] = y;
        dummy.position.set(petalData[i*4], y, petalData[i*4+2]);
        dummy.rotation.set(time+petalData[i*4+3], time, 0);
        dummy.updateMatrix();
        petalsMesh.setMatrixAt(i, dummy.matrix);
      }
      petalsMesh.instanceMatrix.needsUpdate = true;
      
      for(let i=0; i<snowCount; i++) {
        let y = snowData[i*4+1] - 0.08;
        if(y<-10) y=70;
        snowData[i*4+1] = y;
        dummy.position.set(snowData[i*4], y, snowData[i*4+2]);
        dummy.rotation.set(time+snowData[i*4+3], time, 0);
        dummy.updateMatrix();
        snowMesh.setMatrixAt(i, dummy.matrix);
      }
      snowMesh.instanceMatrix.needsUpdate = true;

      // Character Movement
      if (characterRef.current) {
          const char = characterRef.current;
          let isMoving = false;
          let dx = 0, dz = 0;
          const speed = characterSpeed;

          if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) { dz -= speed; isMoving = true; }
          if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) { dz += speed; isMoving = true; }
          if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) { dx -= speed; isMoving = true; }
          if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) { dx += speed; isMoving = true; }

          if (isMoving) {
              const targetRot = Math.atan2(dx, dz);
              // Smooth rotation
              const rotDiff = targetRot - char.rotation.y;
              char.rotation.y += rotDiff * 0.2;

              const nextX = char.position.x + dx;
              const nextZ = char.position.z + dz;

              // COLLISION LOGIC (Allow both rooms AND corridor)
              const distLib = Math.sqrt(nextX**2 + nextZ**2);
              const distRot = Math.sqrt(nextX**2 + (nextZ - ROTUNDA_POS.z)**2);
              
              const inLibrary = distLib < 110;
              const inRotunda = distRot < 110;
              const inCorridor = Math.abs(nextX) < 20 && nextZ < 0 && nextZ > ROTUNDA_POS.z;

              if (inLibrary || inRotunda || inCorridor) {
                  char.position.x = nextX;
                  char.position.z = nextZ;
              }

              // Walk Animation (Swing limbs)
              leftLegGrp.rotation.x = Math.sin(time * 10) * 0.6;
              rightLegGrp.rotation.x = -Math.sin(time * 10) * 0.6;
              leftArmGrp.rotation.x = -Math.sin(time * 10) * 0.6;
              rightArmGrp.rotation.x = Math.sin(time * 10) * 0.6;
              char.position.y = -10 + Math.abs(Math.sin(time * 20)) * 0.1;
          } else {
              // Idle
              leftLegGrp.rotation.x = 0; rightLegGrp.rotation.x = 0;
              leftArmGrp.rotation.x = 0; rightArmGrp.rotation.x = 0;
              char.position.y = -10;
          }

          // Room Detection for UI
          if (char.position.z > -100) {
              if (onRoomChange) onRoomChange('library');
          } else if (char.position.z < -250) {
              if (onRoomChange) onRoomChange('rotunda');
          }
      }

      // Camera Follow
      if (characterRef.current) {
          const charPos = characterRef.current.position;
          const r = 40;
          const offsetX = r * Math.sin(cameraAngle.current.phi) * Math.cos(cameraAngle.current.theta);
          const offsetY = r * Math.cos(cameraAngle.current.phi);
          const offsetZ = r * Math.sin(cameraAngle.current.phi) * Math.sin(cameraAngle.current.theta);
          camera.position.lerp(new THREE.Vector3(charPos.x + offsetX, charPos.y + offsetY, charPos.z + offsetZ), 0.1);
          camera.lookAt(charPos.x, charPos.y + 10, charPos.z);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(reqRef.current);
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // --- Render Images ---
  useEffect(() => {
    if (!galleryGroupRef.current) return;
    const group = galleryGroupRef.current;
    
    // Cleanup
    while(group.children.length > 0){ 
      const child = group.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) (child.material as any[]).forEach(m=>m.dispose());
      else (child.material as any).dispose();
      group.remove(child); 
    }

    const loader = new THREE.TextureLoader();
    
    // Group images by room
    const libraryImgs = images.filter(i => i.roomId === 'library');
    const rotundaImgs = images.filter(i => i.roomId === 'rotunda');

    // Place Library Images
    libraryImgs.forEach((item, index) => {
        const angle = (index * (Math.PI/6)) + Math.PI; // Spread nicely
        const r = 115;
        const x = Math.cos(angle)*r;
        const z = Math.sin(angle)*r;
        loader.load(item.url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            const aspect = tex.image.width/tex.image.height;
            let w=15, h=15; if(aspect>1) h=w/aspect; else w=h*aspect;
            const geo = new THREE.BoxGeometry(w, h, 0.5);
            const mat = new THREE.MeshStandardMaterial({color:0xffd700, roughness:0.2, metalness:0.8});
            const imgMat = new THREE.MeshBasicMaterial({map:tex});
            const mesh = new THREE.Mesh(geo, [mat,mat,mat,mat,imgMat,mat]);
            mesh.position.set(x, 5, z);
            mesh.lookAt(0, 5, 0);
            group.add(mesh);
        });
    });

    // Place Rotunda Images
    rotundaImgs.forEach((item, index) => {
        const angle = (index * (Math.PI/6)) + Math.PI; 
        const r = 115;
        const x = Math.cos(angle)*r + ROTUNDA_POS.x;
        const z = Math.sin(angle)*r + ROTUNDA_POS.z;
        loader.load(item.url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            const aspect = tex.image.width/tex.image.height;
            let w=15, h=15; if(aspect>1) h=w/aspect; else w=h*aspect;
            const geo = new THREE.BoxGeometry(w, h, 0.5);
            const mat = new THREE.MeshStandardMaterial({color:0x5d4037, roughness:0.9}); // Wood frame
            const imgMat = new THREE.MeshBasicMaterial({map:tex});
            const mesh = new THREE.Mesh(geo, [mat,mat,mat,mat,imgMat,mat]);
            mesh.position.set(x, 5, z);
            mesh.lookAt(ROTUNDA_POS.x, 5, ROTUNDA_POS.z);
            group.add(mesh);
        });
    });

  }, [images]);

  // --- Interaction Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;
    cameraAngle.current.theta -= deltaX * 0.005;
    cameraAngle.current.phi -= deltaY * 0.005;
    cameraAngle.current.phi = Math.max(0.1, Math.min(Math.PI / 1.5, cameraAngle.current.phi));
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { isDragging.current = false; };

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full min-h-[500px] cursor-move relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
        {/* Navigation UI */}
        <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
            <button 
              onClick={() => teleport('library')}
              className="bg-amber-900/80 text-amber-100 px-4 py-2 rounded-lg border border-amber-600 hover:bg-amber-800 transition shadow-lg backdrop-blur flex items-center gap-2"
            >
              <span>☀️</span> Library
            </button>
            <button 
              onClick={() => teleport('rotunda')}
              className="bg-slate-800/80 text-slate-100 px-4 py-2 rounded-lg border border-slate-500 hover:bg-slate-700 transition shadow-lg backdrop-blur flex items-center gap-2"
            >
               <span>❄️</span> Winter Cabin
            </button>
        </div>

        {/* Music Control */}
        <div className="absolute bottom-6 left-6 z-10">
          <button 
            onClick={toggleMusic}
            className={`flex items-center space-x-3 px-4 py-3 rounded-full backdrop-blur-md transition-all border ${
              isPlaying 
                ? 'bg-emerald-600/80 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                : 'bg-slate-900/60 border-slate-600 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Now Playing</span>
              <span className="text-sm font-serif italic">Céline Dion - My Heart Will Go On</span>
            </div>
          </button>
        </div>

        {/* D-PAD CONTROL */}
        <div className="absolute bottom-8 right-8 z-20 flex flex-col items-center gap-2 select-none">
            <button
              className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full active:bg-white/40 flex items-center justify-center text-white transition-all shadow-lg hover:bg-white/30"
              onMouseDown={() => setInput('ArrowUp', true)}
              onMouseUp={() => setInput('ArrowUp', false)}
              onMouseLeave={() => setInput('ArrowUp', false)}
              onTouchStart={(e) => { e.preventDefault(); setInput('ArrowUp', true); }}
              onTouchEnd={(e) => { e.preventDefault(); setInput('ArrowUp', false); }}
            >
              <svg className="w-6 h-6 transform rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            </button>
            <div className="flex gap-2">
              <button
                className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full active:bg-white/40 flex items-center justify-center text-white transition-all shadow-lg hover:bg-white/30"
                onMouseDown={() => setInput('ArrowLeft', true)}
                onMouseUp={() => setInput('ArrowLeft', false)}
                onMouseLeave={() => setInput('ArrowLeft', false)}
                onTouchStart={(e) => { e.preventDefault(); setInput('ArrowLeft', true); }}
                onTouchEnd={(e) => { e.preventDefault(); setInput('ArrowLeft', false); }}
              >
                <svg className="w-6 h-6 transform -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
              <button
                className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full active:bg-white/40 flex items-center justify-center text-white transition-all shadow-lg hover:bg-white/30"
                onMouseDown={() => setInput('ArrowDown', true)}
                onMouseUp={() => setInput('ArrowDown', false)}
                onMouseLeave={() => setInput('ArrowDown', false)}
                onTouchStart={(e) => { e.preventDefault(); setInput('ArrowDown', true); }}
                onTouchEnd={(e) => { e.preventDefault(); setInput('ArrowDown', false); }}
              >
                <svg className="w-6 h-6 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
              <button
                className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full active:bg-white/40 flex items-center justify-center text-white transition-all shadow-lg hover:bg-white/30"
                onMouseDown={() => setInput('ArrowRight', true)}
                onMouseUp={() => setInput('ArrowRight', false)}
                onMouseLeave={() => setInput('ArrowRight', false)}
                onTouchStart={(e) => { e.preventDefault(); setInput('ArrowRight', true); }}
                onTouchEnd={(e) => { e.preventDefault(); setInput('ArrowRight', false); }}
              >
                <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
            </div>
        </div>
    </div>
  );
};

export default Scene3D;