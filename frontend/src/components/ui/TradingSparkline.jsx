import React from 'react';

export default function TradingSparkline({ isPositive = true, width = 60, height = 24 }) {
  const points = isPositive
    ? "0,20 12,18 24,14 36,16 48,8 60,4"
    : "0,4 12,8 24,6 36,14 48,16 60,20";

  const color = isPositive ? '#22c55e' : '#ef4444';
  const gradientId = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg width={width} height={height} viewBox="0 0 60 24" className="overflow-visible inline-block">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="animate-sparkline"
      />
      <polygon
        fill={`url(#${gradientId})`}
        points={`${points} 60,24 0,24`}
        opacity="0.6"
      />
    </svg>
  );
}
