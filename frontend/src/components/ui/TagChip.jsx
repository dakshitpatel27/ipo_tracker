import React from 'react';
import { Tag, X } from 'lucide-react';

const PREDEFINED_TAG_STYLES = {
  'High Conviction': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Risky': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Long Term': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Retail Max': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Listing Gain Only': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'sHNI': 'bg-purple-500/10 text-purple-400 border-purple-500/20'
};

export default function TagChip({ tag, onRemove, onClick, selected = false }) {
  const styleClass = PREDEFINED_TAG_STYLES[tag] || 'bg-zinc-800 text-zinc-300 border-zinc-700';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.68rem] font-semibold border transition-all ${styleClass} ${selected ? 'ring-1 ring-indigo-400' : ''} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
    >
      <Tag size={10} className="opacity-70" />
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="hover:text-white transition-colors"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
