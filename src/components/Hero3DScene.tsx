import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshTransmissionMaterial, Environment, RoundedBox } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const FloatingCard = ({ position, rotation, scale = 1 }: { position: [number, number, number], rotation?: [number, number, number], scale?: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <RoundedBox ref={meshRef} args={[1.2, 1.6, 0.05]} radius={0.1} smoothness={4} position={position} rotation={rotation} scale={scale}>
        <meshPhysicalMaterial
          color="#0891b2"
          metalness={0.1}
          roughness={0.2}
          transparent
          opacity={0.8}
          envMapIntensity={1}
        />
      </RoundedBox>
    </Float>
  );
};

const GlassSphere = ({ position, size = 0.5 }: { position: [number, number, number], size?: number }) => {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh position={position}>
        <sphereGeometry args={[size, 64, 64]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          resolution={512}
          transmission={0.95}
          roughness={0.1}
          thickness={0.5}
          ior={1.5}
          chromaticAberration={0.06}
          anisotropy={0.1}
          distortion={0.2}
          distortionScale={0.3}
          temporalDistortion={0.2}
          color="#22d3ee"
        />
      </mesh>
    </Float>
  );
};

const FloatingRing = ({ position, size = 1 }: { position: [number, number, number], size?: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.x = Math.PI / 3;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.4}>
      <mesh ref={meshRef} position={position}>
        <torusGeometry args={[size, 0.03, 16, 100]} />
        <meshPhysicalMaterial
          color="#06b6d4"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={2}
        />
      </mesh>
    </Float>
  );
};

const AbstractBlob = ({ position }: { position: [number, number, number] }) => {
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh position={position} scale={0.8}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial
          color="#0891b2"
          speed={2}
          distort={0.3}
          radius={1}
          transparent
          opacity={0.6}
        />
      </mesh>
    </Float>
  );
};

const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#22d3ee" />
      <pointLight position={[10, 10, 10]} intensity={0.3} color="#06b6d4" />
      
      {/* Main floating cards */}
      <FloatingCard position={[-2.5, 0.5, 0]} rotation={[0.1, 0.3, 0.05]} scale={1.2} />
      <FloatingCard position={[2.8, -0.3, -1]} rotation={[-0.1, -0.4, -0.05]} scale={0.9} />
      <FloatingCard position={[1.5, 1.2, -2]} rotation={[0.05, 0.2, 0.1]} scale={0.7} />
      
      {/* Glass spheres */}
      <GlassSphere position={[-1.5, -1, 1]} size={0.4} />
      <GlassSphere position={[3, 1.5, -0.5]} size={0.25} />
      <GlassSphere position={[-3, 1.2, -1]} size={0.3} />
      
      {/* Floating rings */}
      <FloatingRing position={[0, -1.5, -2]} size={1.5} />
      <FloatingRing position={[-2, 2, -3]} size={0.8} />
      
      {/* Abstract blob */}
      <AbstractBlob position={[3.5, -1, -2]} />
      
      <Environment preset="city" />
    </>
  );
};

export const Hero3DScene = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};