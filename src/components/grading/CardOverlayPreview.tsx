import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, OrbitControls } from '@react-three/drei';
import { GradingOrder } from '@/hooks/useGrading';
import { cn } from '@/lib/utils';
import * as THREE from 'three';

interface CardOverlayPreviewProps {
  order: GradingOrder;
}

// Card mesh component with texture loading inside Three context
function CardMesh({ frontUrl, backUrl }: { frontUrl: string; backUrl: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [frontTexture, setFrontTexture] = useState<THREE.Texture | null>(null);
  const [backTexture, setBackTexture] = useState<THREE.Texture | null>(null);
  const { gl } = useThree();

  useEffect(() => {
    if (!frontUrl) return;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    
    loader.load(
      frontUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = true;
        texture.needsUpdate = true;
        gl.initTexture(texture);
        setFrontTexture(texture);
      },
      undefined,
      (err) => console.error('Front texture error:', err)
    );

    return () => {
      frontTexture?.dispose();
    };
  }, [frontUrl, gl]);

  useEffect(() => {
    if (!backUrl) return;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    
    loader.load(
      backUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = true;
        texture.needsUpdate = true;
        gl.initTexture(texture);
        setBackTexture(texture);
      },
      undefined,
      (err) => console.error('Back texture error:', err)
    );

    return () => {
      backTexture?.dispose();
    };
  }, [backUrl, gl]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });

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
          map={frontTexture}
          color={frontTexture ? "#ffffff" : "#2a2a4e"}
          roughness={0.3}
          metalness={0.1}
        />
        <meshStandardMaterial 
          attach="material-5" 
          map={backTexture}
          color={backTexture ? "#ffffff" : "#2a2a4e"}
          roughness={0.3}
          metalness={0.1}
        />
      </RoundedBox>
    </mesh>
  );
}

// Fallback component while loading
function CardFallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });

  return (
    <mesh ref={meshRef}>
      <RoundedBox args={[2.5, 3.5, 0.03]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#333" />
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

  const frontUrl = order.front_image_url || '';
  const backUrl = order.back_image_url || order.front_image_url || '';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[300px] h-[420px] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-900 to-black shadow-2xl">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <directionalLight position={[-5, 5, -5]} intensity={0.6} />
          <spotLight position={[0, 10, 0]} intensity={0.4} angle={0.3} penumbra={1} />
          
          <Suspense fallback={<CardFallback />}>
            <CardMesh frontUrl={frontUrl} backUrl={backUrl} />
          </Suspense>
          
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Canvas>
        
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
        
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">Drag to rotate card</p>
    </div>
  );
}