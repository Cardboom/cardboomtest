import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Environment, Float, MeshReflectorMaterial } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Settings } from 'lucide-react';
import * as THREE from 'three';

interface Featured3DCardProps {
  card: {
    id: string;
    name: string;
    image_url: string;
    grade?: string | null;
    current_price?: number;
    category?: string;
  } | null;
  isOwnProfile: boolean;
  onSelectCard?: () => void;
}

// CORS-safe texture loader using Image element
function useImageTexture(url: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url || url === '/placeholder.svg') {
      setTexture(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      setTexture(tex);
    };
    
    img.onerror = () => {
      console.error('Featured3DCard texture load error:', url);
      setTexture(null);
    };
    
    img.src = url;

    return () => {
      texture?.dispose();
    };
  }, [url]);

  return texture;
}

function CardMesh({ imageUrl }: { imageUrl: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useImageTexture(imageUrl);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <RoundedBox args={[2.5, 3.5, 0.05]} radius={0.08} smoothness={4}>
          <meshStandardMaterial
            map={texture}
            color={texture ? "#ffffff" : "#2a2a4e"}
            metalness={0.1}
            roughness={0.3}
            envMapIntensity={0.5}
          />
        </RoundedBox>
        <mesh position={[0, 0, -0.03]}>
          <RoundedBox args={[2.52, 3.52, 0.04]} radius={0.08} smoothness={4}>
            <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
          </RoundedBox>
        </mesh>
      </mesh>
    </Float>
  );
}

function CardScene({ imageUrl }: { imageUrl: string }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <spotLight
        position={[5, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight position={[-5, 5, 5]} angle={0.3} penumbra={1} intensity={0.5} />
      <pointLight position={[0, 0, 4]} intensity={0.3} color="#4fd1c5" />
      
      <CardMesh imageUrl={imageUrl} />
      
      {/* Reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
        <planeGeometry args={[10, 10]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0f0f0f"
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>
      
      <Environment preset="city" />
    </>
  );
}

export const Featured3DCard = ({ card, isOwnProfile, onSelectCard }: Featured3DCardProps) => {
  if (!card) {
    return (
      <Card className="glass overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-gold" />
            Featured Card
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-muted/50 to-muted flex flex-col items-center justify-center text-center p-6">
            <Star className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No Featured Card</p>
            {isOwnProfile && (
              <>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                  Showcase your prized collectible in stunning 3D
                </p>
                <Button onClick={onSelectCard} size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Select Card
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass overflow-hidden relative">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-gold" />
          Featured Card
        </CardTitle>
        {isOwnProfile && (
          <Button variant="ghost" size="sm" onClick={onSelectCard}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="aspect-[4/5] relative bg-gradient-to-b from-background to-muted/20">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }>
            <Canvas
              shadows
              camera={{ position: [0, 0, 5], fov: 45 }}
              style={{ background: 'transparent' }}
            >
              <CardScene imageUrl={card.image_url} />
            </Canvas>
          </Suspense>
          
          {/* Card info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent">
            <h3 className="font-bold text-lg truncate">{card.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {card.grade && (
                <Badge variant="secondary" className="bg-gold/20 text-gold">
                  {card.grade}
                </Badge>
              )}
              {card.category && (
                <Badge variant="outline" className="text-xs">
                  {card.category}
                </Badge>
              )}
            </div>
            {card.current_price !== undefined && card.current_price > 0 && (
              <p className="text-primary font-bold mt-2">
                ${card.current_price.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
