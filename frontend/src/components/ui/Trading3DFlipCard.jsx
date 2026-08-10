import React, { useState } from 'react';

export default function Trading3DFlipCard({ frontContent, backContent, className = '' }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className={`group cursor-pointer [perspective:1000px] ${className}`}
    >
      <div
        className={`relative w-full h-full rounded-2xl transition-all duration-500 [transform-style:preserve-3d] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front Face */}
        <div className="w-full h-full [backface-visibility:hidden]">
          {frontContent}
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 w-full h-full rounded-2xl [transform:rotateY(180deg)] [backface-visibility:hidden] bg-[#09090b] border border-indigo-500/40 p-4 shadow-xl">
          {backContent}
        </div>
      </div>
    </div>
  );
}
