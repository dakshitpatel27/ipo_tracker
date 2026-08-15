import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Float, PerspectiveCamera, OrbitControls, Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Wallet, CheckCircle2, RotateCw, DollarSign } from 'lucide-react';

const FallbackLoader = () => (
  <Html center>
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-1/90 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-semibold whitespace-nowrap shadow-xl">
      <RotateCw className="animate-spin" size={14} /> Loading 3D Gold Rupee Coin...
    </div>
  </Html>
);

// 3D Metallic Gold Rupee Coin Mesh
const RupeeCoinMesh = ({ isHovered, isFlipping }) => {
  const coinRef = useRef();

  useFrame((_, delta) => {
    if (!coinRef.current) return;

    if (isFlipping) {
      coinRef.current.rotation.x += delta * 12;
      coinRef.current.rotation.y += delta * 6;
    } else if (isHovered) {
      coinRef.current.rotation.y += delta * 4;
    } else {
      coinRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group ref={coinRef}>
      {/* Main Gold Coin Body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.22, 48]} />
        <meshStandardMaterial
          color="#f59e0b"
          metalness={0.95}
          roughness={0.12}
          emissive="#d97706"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Gold Outer Rim Bezel */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.58, 0.08, 16, 48]} />
        <meshStandardMaterial color="#fbbf24" metalness={1} roughness={0.08} />
      </mesh>

      {/* Indian Rupee (₹) Symbol Front Face */}
      <Text
        position={[0, 0, 0.13]}
        fontSize={1.4}
        color="#78350f"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
      >
        ₹
      </Text>

      {/* Indian Rupee (₹) Symbol Back Face */}
      <Text
        position={[0, 0, -0.13]}
        rotation={[0, Math.PI, 0]}
        fontSize={1.4}
        color="#78350f"
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
      >
        ₹
      </Text>
    </group>
  );
};

// Main Export Component
const InteractiveGoldenRupeeCoin = ({ balance = '₹84,500', onSettleSuccess }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [settled, setSettled] = useState(false);

  const triggerSettleFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setSettled(false);

    setTimeout(() => {
      setIsFlipping(false);
      setSettled(true);
      if (onSettleSuccess) onSettleSuccess();
    }, 1800);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[360px] sm:h-[400px] bg-gradient-to-b from-surface-1 via-surface-2 to-surface-1 border border-amber-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col justify-between"
    >
      {/* Top Header */}
      <div className="flex justify-between items-center z-10">
        <div>
          <span className="badge badge-amber text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 w-fit">
            <Wallet size={12} /> Khatabook 3D Passbook
          </span>
          <h3 className="font-bold text-white text-base sm:text-lg">Party Settlement Coin</h3>
        </div>

        {settled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-lg"
          >
            <CheckCircle2 size={16} /> Settlement Recorded!
          </motion.div>
        )}
      </div>

      {/* 3D Canvas Scene */}
      <div className="absolute inset-0 w-full h-full">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={2} color="#fef08a" />
          <directionalLight position={[-5, -5, -3]} intensity={1} color="#f59e0b" />

          {isFlipping && <Sparkles count={100} scale={4} size={5} speed={2} color="#fbbf24" />}

          <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.3}>
            <RupeeCoinMesh isHovered={isHovered} isFlipping={isFlipping} />
          </Float>

          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>

      {/* Bottom Action Bar */}
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/10">
        <div>
          <div className="text-[10px] text-secondary font-medium">Party Account Balance</div>
          <div className="text-xl font-black text-amber-400 font-mono">{balance}</div>
        </div>

        <button
          onClick={triggerSettleFlip}
          disabled={isFlipping}
          className="btn-primary py-2.5 px-5 font-bold text-xs flex items-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-amber-950 shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform border-0 cursor-pointer"
        >
          {isFlipping ? (
            <>
              <RotateCw size={15} className="animate-spin" /> Flipping Coin...
            </>
          ) : (
            <>
              <RotateCw size={15} /> Settle Transaction
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InteractiveGoldenRupeeCoin;
