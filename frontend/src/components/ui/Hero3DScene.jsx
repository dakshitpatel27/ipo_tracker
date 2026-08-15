import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Sparkles, CheckCircle2, Award, ArrowUpRight, ChevronLeft, ChevronRight, Zap, Trophy, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

const IPO_CARDS = [
  {
    id: 'tata-tech',
    company: 'Tata Technologies',
    type: 'Mainboard IPO',
    status: 'ALLOTTED',
    returnAmt: '+₹45,200',
    returnPct: '+140%',
    subTimes: '69.4x',
    gmp: '+₹295 (85%)',
    gmpBarPct: 85,
    quota: 'HNI Lucky Draw',
    lotDetails: '1 Lot (15 Shares)',
    sentiment: 'Strong Bullish',
    color: '#10b981'
  },
  {
    id: 'bajaj-housing',
    company: 'Bajaj Housing Finance',
    type: 'Mainboard IPO',
    status: 'ALLOTTED',
    returnAmt: '+₹38,400',
    returnPct: '+135%',
    subTimes: '64.0x',
    gmp: '+₹65 (92%)',
    gmpBarPct: 92,
    quota: 'Retail Lucky Draw',
    lotDetails: '2 Lots (420 Shares)',
    sentiment: 'Blockbuster Demand',
    color: '#6366f1'
  },
  {
    id: 'premier-energies',
    company: 'Premier Energies',
    type: 'Mainboard IPO',
    status: 'ALLOTTED',
    returnAmt: '+₹29,800',
    returnPct: '+120%',
    subTimes: '74.3x',
    gmp: '+₹340 (78%)',
    gmpBarPct: 78,
    quota: 'bHNI Pro-Rata',
    lotDetails: '50 Lots (1650 Shares)',
    sentiment: 'High QIB Buying',
    color: '#3b82f6'
  },
  {
    id: 'swiggy-ipo',
    company: 'Swiggy Limited',
    type: 'Mainboard IPO',
    status: 'APPLIED',
    returnAmt: '+₹4,200',
    returnPct: '+22%',
    subTimes: '3.6x',
    gmp: '+₹25 (18%)',
    gmpBarPct: 22,
    quota: 'Retail Priority',
    lotDetails: '1 Lot (38 Shares)',
    sentiment: 'Moderate Bullish',
    color: '#f59e0b'
  },
  {
    id: 'ola-electric',
    company: 'Ola Electric Mobility',
    type: 'Mainboard IPO',
    status: 'ALLOTTED',
    returnAmt: '+₹14,500',
    returnPct: '+42%',
    subTimes: '4.2x',
    gmp: '+₹16 (35%)',
    gmpBarPct: 42,
    quota: 'Retail Lucky Draw',
    lotDetails: '1 Lot (195 Shares)',
    sentiment: 'Positive Sentiment',
    color: '#10b981'
  }
];

// Interactive 3D Particle Matrix Canvas
const ParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.2
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw particle connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 90)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw glowing particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0 || p.x > width) p.speedX *= -1;
        if (p.y < 0 || p.y > height) p.speedY *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${p.opacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#10b981';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

const Hero3DScene = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (isPaused || simulating) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % IPO_CARDS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, simulating]);

  const currentCard = IPO_CARDS[currentIndex];
  const nextCardObj = IPO_CARDS[(currentIndex + 1) % IPO_CARDS.length];

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateX(-y * 0.05);
    setRotateY(x * 0.05);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsPaused(false);
  };

  const handleSimulateWin = () => {
    setSimulating(true);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      setSimulating(false);
    }, 1800);
  };

  const nextCard = () => setCurrentIndex((prev) => (prev + 1) % IPO_CARDS.length);
  const prevCard = () => setCurrentIndex((prev) => (prev - 1 + IPO_CARDS.length) % IPO_CARDS.length);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[360px] lg:h-[420px] flex items-center justify-center cursor-pointer select-none"
      style={{ perspective: '1400px' }}
    >
      {/* 3D Particle Matrix */}
      <ParticleCanvas />

      {/* Ambient background glow orbs */}
      <div className="absolute w-80 h-80 rounded-full bg-indigo-500/20 blur-[90px] animate-pulse pointer-events-none" />
      <div className="absolute w-70 h-70 rounded-full bg-emerald-500/20 blur-[80px] -bottom-4 right-4 pointer-events-none" />

      {/* Main 3D Container */}
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="relative w-full max-w-[350px] h-[310px] flex items-center justify-center z-10"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* 3D Stack Preview Card (Background Layer) */}
        <div
          className="absolute inset-0 bg-surface-2/40 border border-white/10 rounded-3xl p-6 shadow-xl opacity-40 pointer-events-none transition-all duration-500"
          style={{
            transform: 'translateZ(-60px) translateY(18px) rotate(-4deg) scale(0.92)',
            transformStyle: 'preserve-3d'
          }}
        >
          <div className="flex justify-between items-center text-xs text-secondary font-bold">
            <span>{nextCardObj.company}</span>
            <span>{nextCardObj.returnPct}</span>
          </div>
        </div>

        {/* Active Front 3D Glass Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, rotateY: 75, scale: 0.85, z: -30 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1, z: 40 }}
            exit={{ opacity: 0, rotateY: -75, scale: 0.85, z: -30 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 bg-surface-1/85 backdrop-blur-2xl border border-indigo-500/35 rounded-3xl p-6 shadow-2xl flex flex-col justify-between"
            style={{
              transformStyle: 'preserve-3d',
              boxShadow: '0 30px 60px -15px rgba(99, 102, 241, 0.3), 0 0 35px rgba(16, 185, 129, 0.2)'
            }}
          >
            {/* Top header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <img src="/app-icon.png" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-md shadow-emerald-500/40 ring-2 ring-emerald-500/30" />
                <div>
                  <div className="font-bold text-white text-xs leading-tight">{currentCard.company}</div>
                  <div className="text-[10px] text-emerald-400 font-medium">{currentCard.type}</div>
                </div>
              </div>
              <span className={`badge ${currentCard.status === 'ALLOTTED' ? 'badge-emerald' : 'badge-blue'} text-[10px] font-bold flex items-center gap-1 shadow-sm`}>
                <CheckCircle2 size={12} /> {currentCard.status}
              </span>
            </div>

            {/* Return Stat Display */}
            <div className="my-1.5 space-y-1">
              <div className="text-[11px] text-secondary font-medium">Estimated Net Portfolio Return</div>
              <div className="text-3.5xl font-black text-white font-mono flex items-center gap-2 tracking-tight">
                {currentCard.returnAmt}
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-0.5 shadow-sm">
                  {currentCard.returnPct} <ArrowUpRight size={12} />
                </span>
              </div>
            </div>

            {/* Subscription & GMP Bar */}
            <div>
              <div className="flex justify-between text-[10px] text-secondary mb-1 font-medium">
                <span>Total Bidding: <strong className="text-white font-mono">{currentCard.subTimes}</strong></span>
                <span className="text-indigo-400 font-bold">GMP: {currentCard.gmp}</span>
              </div>
              <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden border border-white/10 p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${currentCard.gmpBarPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-teal-300 rounded-full"
                />
              </div>
            </div>

            {/* Interactive Control & Simulate Draw Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-white/10 mt-1">
              <button
                onClick={handleSimulateWin}
                className="text-[10px] font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-sm"
                title="Test 3D Allotment Win Celebration"
              >
                <Zap size={11} className="text-amber-400 fill-amber-400" /> {simulating ? '🎉 Allotted!' : 'Test Lucky Draw'}
              </button>

              <div className="flex items-center gap-1.5">
                {IPO_CARDS.map((c, idx) => (
                  <button
                    key={c.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all border-0 cursor-pointer ${idx === currentIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                    title={c.company}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevCard}
                  className="p-1 rounded-lg bg-surface-2 text-secondary hover:text-white hover:bg-surface-3 transition-colors border-0 cursor-pointer"
                  title="Previous IPO Card"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={nextCard}
                  className="p-1 rounded-lg bg-surface-2 text-secondary hover:text-white hover:bg-surface-3 transition-colors border-0 cursor-pointer"
                  title="Next IPO Card"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dynamic 3D Orbit Badge 1: Quota Category (Top Left) */}
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute -top-7 -left-8 bg-surface-2/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-3 shadow-2xl flex items-center gap-2.5 z-30"
          style={{ transform: 'translateZ(95px) rotate(-6deg)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0 shadow-inner">
            <Award size={16} />
          </div>
          <div>
            <div className="text-[10px] text-secondary font-medium">{currentCard.quota}</div>
            <div className="text-xs font-bold text-white font-mono">{currentCard.lotDetails}</div>
          </div>
        </motion.div>

        {/* Dynamic 3D Orbit Badge 2: Market Sentiment (Bottom Right) */}
        <motion.div
          animate={{ y: [0, 10, 0], rotate: [2, -2, 2] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="absolute -bottom-7 -right-6 bg-surface-2/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-3 shadow-2xl flex items-center gap-2.5 z-30"
          style={{ transform: 'translateZ(115px) rotate(4deg)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0 shadow-inner">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-[10px] text-secondary font-medium">Market Sentiment</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              {currentCard.sentiment} <TrendingUp size={12} />
            </div>
          </div>
        </motion.div>

        {/* Floating 3D Gold Rupee Coin */}
        <motion.div
          animate={{ rotateY: 360, y: [0, -8, 0] }}
          transition={{ rotateY: { duration: 7, repeat: Infinity, ease: 'linear' }, y: { duration: 3.8, repeat: Infinity, ease: 'easeInOut' } }}
          className="absolute -top-10 -right-4 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 text-amber-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/40 border-2 border-amber-300 pointer-events-none z-30"
          style={{ transform: 'translateZ(145px)', transformStyle: 'preserve-3d' }}
        >
          ₹
        </motion.div>

        {/* Floating 3D Gem Token */}
        <motion.div
          animate={{ rotateX: 360, y: [0, 8, 0] }}
          transition={{ rotateX: { duration: 9, repeat: Infinity, ease: 'linear' }, y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' } }}
          className="absolute -bottom-9 -left-4 w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-200 text-emerald-950 font-bold text-xs flex items-center justify-center shadow-md shadow-emerald-500/30 border border-emerald-300 pointer-events-none z-30"
          style={{ transform: 'translateZ(125px)', transformStyle: 'preserve-3d' }}
        >
          💎
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Hero3DScene;
