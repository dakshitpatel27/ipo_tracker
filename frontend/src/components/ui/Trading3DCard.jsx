import React, { useRef, useState } from 'react';

export default function Trading3DCard({ children, className = '', glowColor = 'indigo' }) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg)');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(8px)`);
    setGlarePosition({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
      opacity: 0.15
    });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    setGlarePosition({ x: 50, y: 50, opacity: 0 });
  };

  const glowShadow = glowColor === 'emerald'
    ? '0 12px 25px -5px rgba(34, 197, 94, 0.25)'
    : glowColor === 'rose'
    ? '0 12px 25px -5px rgba(244, 63, 94, 0.25)'
    : '0 12px 25px -5px rgba(99, 102, 241, 0.25)';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        boxShadow: glarePosition.opacity > 0 ? glowShadow : 'none',
        transition: 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1), box-shadow 0.2s ease',
        transformStyle: 'preserve-3d'
      }}
      className={`relative overflow-hidden cursor-pointer ${className}`}
    >
      {/* 3D Dynamic Holographic Glare */}
      <div
        style={{
          background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`,
          opacity: glarePosition.opacity,
          transition: 'opacity 0.2s ease'
        }}
        className="absolute inset-0 pointer-events-none z-20"
      />
      <div style={{ transform: 'translateZ(15px)' }}>
        {children}
      </div>
    </div>
  );
}
