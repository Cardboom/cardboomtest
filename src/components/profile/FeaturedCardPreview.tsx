import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Settings } from 'lucide-react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

interface FeaturedCardPreviewProps {
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

// Card mesh component with texture loading (same approach as working CardOverlayPreview)
function CardMesh({ imageUrl }: { imageUrl: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!imageUrl || imageUrl === '/placeholder.svg') return;
    
    let disposed = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    
    loader.load(
      imageUrl,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = true;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      (err) => {
        console.error('Featured card texture load failed:', imageUrl, err);
      }
    );
    
    return () => {
      disposed = true;
    };
  }, [imageUrl]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <boxGeometry args={[2.5, 3.5, 0.04]} />
        {/* Edges */}
        <meshStandardMaterial attach="material-0" color="#0a0a0a" />
        <meshStandardMaterial attach="material-1" color="#0a0a0a" />
        <meshStandardMaterial attach="material-2" color="#0a0a0a" />
        <meshStandardMaterial attach="material-3" color="#0a0a0a" />
        {/* Front face */}
        <meshStandardMaterial 
          attach="material-4" 
          map={texture}
          color="#ffffff"
          roughness={0.2}
          metalness={0.05}
        />
        {/* Back face */}
        <meshStandardMaterial 
          attach="material-5" 
          color="#1a1a2e"
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

function CardFallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2.5, 3.5, 0.04]} />
      <meshStandardMaterial color="#333" />
    </mesh>
  );
}

export const FeaturedCardPreview = ({ card, isOwnProfile, onSelectCard }: FeaturedCardPreviewProps) => {
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

  const getGradeBadgeColor = (grade: string | null | undefined) => {
    if (!grade) return 'from-gray-500 to-gray-600';
    const numGrade = parseFloat(grade);
    if (isNaN(numGrade)) return 'from-gray-500 to-gray-600';
    if (numGrade >= 9.5) return 'from-amber-400 to-yellow-500';
    if (numGrade >= 9) return 'from-emerald-400 to-green-500';
    if (numGrade >= 8) return 'from-blue-400 to-cyan-500';
    if (numGrade >= 7) return 'from-purple-400 to-violet-500';
    return 'from-gray-400 to-slate-500';
  };

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
        <div className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-900 to-black">
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
              <CardMesh imageUrl={card.image_url} />
            </Suspense>
            
            <OrbitControls 
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 1.5}
            />
          </Canvas>
          
          {card.grade && (
            <div className="absolute top-4 right-4 z-10">
              <div className={cn(
                'px-4 py-1.5 rounded-full bg-gradient-to-r shadow-lg backdrop-blur-sm',
                getGradeBadgeColor(card.grade)
              )}>
                <span className="text-white font-bold text-sm drop-shadow">
                  {card.grade}
                </span>
              </div>
            </div>
          )}
          
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
        </div>
        
        {/* Card info */}
        <div className="p-4 bg-gradient-to-t from-background via-background/90 to-transparent">
          <h3 className="font-bold text-lg truncate">{card.name}</h3>
          <div className="flex items-center gap-2 mt-1">
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
        
        <p className="text-xs text-muted-foreground text-center pb-3">Drag to rotate</p>
      </CardContent>
    </Card>
  );
};
