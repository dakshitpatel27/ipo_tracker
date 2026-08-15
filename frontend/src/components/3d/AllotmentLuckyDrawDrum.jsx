import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Float, PerspectiveCamera, OrbitControls, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Award, CheckCircle2, XCircle, Zap } from 'lucide-react';

const FallbackLoader = () => (
  <Html center>
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-1/90 border border-emerald-500/30 rounded-xl backdrop-blur-md text-emerald-400 text-xs font-semibold whitespace-nowrap shadow-xl">
      <RefreshCw className="animate-spin" size={14} /> Loading 3D Allotment Drum...
    </div>
  </Html>
);

// 3D Drum Cage Mesh
const DrumMesh = ({ isSpinning, resultStatus }) => {
  const drumGroupRef = useRef();
  const innerBallsRef = useRef();
  const currentSpeed = useRef(0.01);

  // Generate internal lottery balls
  const balls = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6
      ],
      color: i % 3 === 0 ? '#10b981' : (i % 3 === 1 ? '#6366f1' : '#f59e0b'),
      scale: Math.random() * 0.12 + 0.1
    }));
  }, []);

  useFrame((_, delta) => {
    if (isSpinning) {
      currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, 0.25, delta * 3);
    } else {
      currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, 0.005, delta * 2);
    }

    if (drumGroupRef.current) {
      drumGroupRef.current.rotation.z += currentSpeed.current;
    }
    if (innerBallsRef.current) {
      innerBallsRef.current.rotation.x += currentSpeed.current * 1.5;
      innerBallsRef.current.rotation.y += currentSpeed.current * 0.8;
    }
  });

  return (
    <group ref={drumGroupRef}>
      {/* Outer Metallic Cylinder Cage */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 2.2, 24, 1, true]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.9}
          roughness={0.15}
          wireframe
          emissive="#0f172a"
        />
      </mesh>

      {/* Side Metallic Plates */}
      <mesh position={[0, 0, 1.1]}>
        <cylinderGeometry args={[1.52, 1.52, 0.08, 32]} />
        <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, -1.1]}>
        <cylinderGeometry args={[1.52, 1.52, 0.08, 32]} />
        <meshStandardMaterial color="#475569" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Central Axle Shaft */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 2.8, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.05} />
      </mesh>

      {/* Internal Lottery Balls */}
      <group ref={innerBallsRef}>
        {balls.map((b, i) => (
          <mesh key={i} position={b.position}>
            <sphereGeometry args={[b.scale, 16, 16]} />
            <meshStandardMaterial
              color={b.color}
              emissive={b.color}
              emissiveIntensity={0.6}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Main Export Component
const AllotmentLuckyDrawDrum = ({ onAllotmentResult }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultStatus, setResultStatus] = useState(null); // 'ALLOTTED' | 'NOT_ALLOTTED'

  const triggerLuckyDraw = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResultStatus(null);

    setTimeout(() => {
      // 50/50 lucky draw outcome for demonstration
      const isWin = Math.random() > 0.35;
      const status = isWin ? 'ALLOTTED' : 'NOT_ALLOTTED';
      setResultStatus(status);
      setIsSpinning(false);

      if (onAllotmentResult) {
        onAllotmentResult({
          status,
          ipoName: 'Tata Technologies',
          shares: isWin ? 15 : 0
        });
      }
    }, 2800);
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[440px] bg-gradient-to-b from-surface-1 via-surface-2 to-surface-1 border border-indigo-500/25 rounded-3xl p-5 overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* Top Header */}
      <div className="flex justify-between items-center z-10">
        <div>
          <span className="badge badge-emerald text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 w-fit">
            <Zap size={12} /> 3D Allotment Lucky Draw
          </span>
          <h3 className="font-bold text-white text-base sm:text-lg">IPO Allotment Drum</h3>
        </div>

        {resultStatus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold text-xs ${resultStatus === 'ALLOTTED' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'}`}
          >
            {resultStatus === 'ALLOTTED' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {resultStatus === 'ALLOTTED' ? 'ALLOTTED (15 Shares)' : 'NOT ALLOTTED'}
          </motion.div>
        )}
      </div>

      {/* 3D Canvas Scene */}
      <div className="absolute inset-0 w-full h-full">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} color="#e0e7ff" />
          <directionalLight position={[-5, -5, -5]} intensity={0.8} color="#10b981" />

          {/* Dynamic Particle Burst on Result */}
          {resultStatus && (
            <Sparkles
              count={resultStatus === 'ALLOTTED' ? 120 : 40}
              scale={4}
              size={resultStatus === 'ALLOTTED' ? 6 : 3}
              speed={resultStatus === 'ALLOTTED' ? 1.5 : 0.4}
              color={resultStatus === 'ALLOTTED' ? '#10b981' : '#64748b'}
            />
          )}

          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
            <DrumMesh isSpinning={isSpinning} resultStatus={resultStatus} />
          </Float>

          <OrbitControls enableZoom={false} autoRotate={!isSpinning} autoRotateSpeed={0.8} />
        </Canvas>
      </div>

      {/* Bottom Action Bar */}
      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/10">
        <div className="text-xs text-secondary">
          Click below to spin 3D allotment drum
        </div>

        <button
          onClick={triggerLuckyDraw}
          disabled={isSpinning}
          className="btn-primary py-2.5 px-5 font-bold text-xs flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-indigo-600 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform"
        >
          {isSpinning ? (
            <>
              <RefreshCw size={15} className="animate-spin text-emerald-300" /> Spinning Drum...
            </>
          ) : (
            <>
              <Award size={15} /> Spin & Check Allotment
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AllotmentLuckyDrawDrum;
