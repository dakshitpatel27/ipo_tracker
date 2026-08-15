import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Float, PerspectiveCamera, OrbitControls, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { TrendingUp, ArrowUpRight, Activity } from 'lucide-react';

const FallbackLoader = () => (
  <Html center>
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-1/90 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold whitespace-nowrap shadow-xl">
      <Activity className="animate-spin" size={14} /> Loading 3D Bull Market Scene...
    </div>
  </Html>
);

// 3D Geometric Candlestick Mesh
const CandlestickMesh = ({ position, height = 1.2, isGreen = true, delay = 0 }) => {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 1.5 + delay) * 0.15;
    }
  });

  const color = isGreen ? '#10b981' : '#f43f5e';

  return (
    <group ref={meshRef} position={position}>
      {/* Central Wick */}
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, height * 1.8, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {/* Real Body Box */}
      <mesh>
        <boxGeometry args={[0.25, height, 0.25]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
};

// Stylized Bull Silhouette & Wireframe Nodes
const BullNodeMesh = () => {
  const groupRef = useRef();

  // Create geometric nodes forming bull silhouette geometry
  const nodePoints = useMemo(() => {
    return [
      [0, 0.8, 0],       // Horn Left
      [-0.6, 1.2, 0.2],  // Horn Left Tip
      [0.6, 1.2, 0.2],   // Horn Right Tip
      [-0.4, 0.4, 0.5],  // Head Left
      [0.4, 0.4, 0.5],   // Head Right
      [0, 0.2, 0.8],     // Snout
      [-0.8, -0.2, 0],   // Shoulder Left
      [0.8, -0.2, 0],    // Shoulder Right
      [0, 0.3, -0.6],    // Spine
      [-0.6, -0.8, -0.8],// Leg Back Left
      [0.6, -0.8, -0.8]  // Leg Back Right
    ];
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Geometric Wireframe Ring Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <ringGeometry args={[1.8, 2.2, 32]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} wireframe />
      </mesh>

      {/* Nodes & Connecting Lines */}
      {nodePoints.map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={1} />
        </mesh>
      ))}
    </group>
  );
};

// Main Export Component
const FloatingBullCandlesticks = ({ gmpAvg = '+85%', overallProfit = '₹1,45,200' }) => {
  const [lightPos, setLightPos] = useState([5, 5, 5]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setLightPos([x * 12, -y * 12 + 5, 6]);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full h-[360px] sm:h-[420px] bg-surface-1/90 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col justify-between"
    >
      {/* Top Header Stats */}
      <div className="flex justify-between items-start z-10">
        <div>
          <span className="badge badge-emerald text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 w-fit">
            <TrendingUp size={12} /> Bullish Market Hero 3D
          </span>
          <h3 className="font-extrabold text-white text-lg sm:text-xl">IPO Market Index</h3>
          <p className="text-xs text-secondary mt-0.5">Real-time market sentiment & gain indicators</p>
        </div>

        <div className="bg-surface-2/90 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/30 text-right">
          <div className="text-[10px] text-secondary font-medium">Avg Market GMP</div>
          <div className="text-xl font-black text-emerald-400 font-mono flex items-center gap-1">
            {gmpAvg} <ArrowUpRight size={16} />
          </div>
        </div>
      </div>

      {/* 3D Canvas Scene */}
      <div className="absolute inset-0 w-full h-full">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5.5]} fov={45} />
          <ambientLight intensity={0.5} />
          <directionalLight position={lightPos} intensity={1.8} color="#34d399" />
          <directionalLight position={[-5, -5, -3]} intensity={0.6} color="#6366f1" />

          <Sparkles count={60} scale={5} size={3} speed={0.6} color="#10b981" />

          {/* Hovering Candlesticks */}
          <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
            <CandlestickMesh position={[-2.2, 0.4, -0.5]} height={1.4} isGreen={true} delay={0} />
            <CandlestickMesh position={[-1.2, -0.2, 0.5]} height={0.9} isGreen={true} delay={0.6} />
            <CandlestickMesh position={[1.4, 0.6, -0.2]} height={1.6} isGreen={true} delay={1.2} />
            <CandlestickMesh position={[2.3, -0.4, 0.4]} height={0.8} isGreen={false} delay={1.8} />

            {/* Stylized Bull */}
            <BullNodeMesh />
          </Float>

          <OrbitControls enableZoom={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 3} />
        </Canvas>
      </div>

      {/* Bottom Floating Stats Bar */}
      <div className="relative z-10 flex justify-between items-center pt-3 border-t border-white/10 text-xs">
        <span className="text-secondary font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Live Bull Market Momentum
        </span>
        <span className="text-white font-mono font-bold">Total Unrealized Gains: {overallProfit}</span>
      </div>
    </div>
  );
};

export default FloatingBullCandlesticks;
