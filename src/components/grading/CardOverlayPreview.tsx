import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, OrbitControls } from '@react-three/drei';
import { GradingOrder } from '@/hooks/useGrading';
import { cn } from '@/lib/utils';
import * as THREE from 'three';

interface CardOverlayPreviewProps {
  order: GradingOrder;
}

function Card3D({ frontUrl, backUrl }: { frontUrl: string; backUrl: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const frontTextureRef = useRef<THREE.Texture | null>(null);
  const backTextureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    
    // Load front texture
    const frontImg = new Image();
    frontImg.crossOrigin = 'anonymous';
    frontImg.onload = () => {
      const texture = new THREE.Texture(frontImg);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      frontTextureRef.current = texture;
      if (meshRef.current) {
        const materials = meshRef.current.material as THREE.MeshStandardMaterial[];
        if (materials[4]) {
          materials[4].map = texture;
          materials[4].needsUpdate = true;
        }
      }
    };
    frontImg.src = frontUrl;

    // Load back texture
    const backImg = new Image();
    backImg.crossOrigin = 'anonymous';
    backImg.onload = () => {
      const texture = new THREE.Texture(backImg);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      backTextureRef.current = texture;
      if (meshRef.current) {
        const materials = meshRef.current.material as THREE.MeshStandardMaterial[];
        if (materials[5]) {
          materials[5].map = texture;
          materials[5].needsUpdate = true;
        }
      }
    };
    backImg.src = backUrl;

    return () => {
      frontTextureRef.current?.dispose();
      backTextureRef.current?.dispose();
    };
  }, [frontUrl, backUrl]);

  useFrame((state) => {
    if (!meshRef.current) return;
    // Gentle floating animation
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });

  // Card dimensions (standard trading card ratio 2.5:3.5)
  const width = 2.5;
  const height = 3.5;
  const depth = 0.03;

  return (
    <mesh ref={meshRef}>
      <RoundedBox args={[width, height, depth]} radius={0.08} smoothness={4}>
        <meshStandardMaterial attach="material-0" color="#1a1a2e" />
        <meshStandardMaterial attach="material-1" color="#1a1a2e" />
        <meshStandardMaterial attach="material-2" color="#1a1a2e" />
        <meshStandardMaterial attach="material-3" color="#1a1a2e" />
        <meshStandardMaterial 
          attach="material-4" 
          color="#333"
          roughness={0.3}
          metalness={0.1}
        />
        <meshStandardMaterial 
          attach="material-5" 
          color="#222"
          roughness={0.3}
          metalness={0.1}
        />
      </RoundedBox>
    </mesh>
  );
}

export function CardOverlayPreview({ order }: CardOverlayPreviewProps) {
  const getGradeBadgeColor = (grade: number | null) => {
    if (!grade) return 'from-gray-500 to-gray-600';
    if (grade >= 9.5) return 'from-amber-400 to-yellow-500';
    if (grade >= 9) return 'from-emerald-400 to-green-500';
    if (grade >= 8) return 'from-blue-400 to-cyan-500';
    if (grade >= 7) return 'from-purple-400 to-violet-500';
    return 'from-gray-400 to-slate-500';
  };

  const frontUrl = order.front_image_url || '/placeholder.svg';
  const backUrl = order.back_image_url || frontUrl;

  return (
    <div className="flex flex-col items-center">
      {/* 3D Card Container */}
      <div className="relative w-[300px] h-[420px] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-900 to-black shadow-2xl">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          <spotLight position={[0, 10, 0]} intensity={0.3} angle={0.3} penumbra={1} />
          
          <Card3D frontUrl={frontUrl} backUrl={backUrl} />
          
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Canvas>
        
        {/* Grade overlay */}
        {order.final_grade && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className={cn(
              'px-6 py-2 rounded-full bg-gradient-to-r shadow-lg backdrop-blur-sm',
              getGradeBadgeColor(order.final_grade)
            )}>
              <span className="text-white font-bold text-lg drop-shadow">
                CBGI: {order.final_grade.toFixed(1)}
              </span>
            </div>
          </div>
        )}
        
        {/* Shine effect overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">Drag to rotate card</p>
    </div>
  );
}
