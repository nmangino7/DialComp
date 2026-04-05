'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface MetricEditorProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onSet: (v: number) => void;
  color?: string;
}

export default function MetricEditor({
  label,
  value,
  onIncrement,
  onDecrement,
  onSet,
  color = 'blue',
}: MetricEditorProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const [flash, setFlash] = useState<'+' | '-' | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!editing) setLocalValue(String(value));
  }, [value, editing]);

  const commitValue = useCallback(
    (raw: string) => {
      const parsed = parseInt(raw, 10);
      const final = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      onSet(final);
      setLocalValue(String(final));
    },
    [onSet],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitValue(raw), 600);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commitValue(localValue);
    setEditing(false);
  };

  const handleIncrement = () => {
    onIncrement();
    setFlash('+');
    setTimeout(() => setFlash(null), 400);
  };

  const handleDecrement = () => {
    onDecrement();
    setFlash('-');
    setTimeout(() => setFlash(null), 400);
  };

  const colorMap: Record<string, { btn: string; bg: string }> = {
    blue: { btn: 'from-blue-600 to-blue-500', bg: 'bg-blue-500/10' },
    emerald: { btn: 'from-emerald-600 to-emerald-500', bg: 'bg-emerald-500/10' },
    purple: { btn: 'from-purple-600 to-purple-500', bg: 'bg-purple-500/10' },
    red: { btn: 'from-red-600 to-red-500', bg: 'bg-red-500/10' },
    orange: { btn: 'from-orange-600 to-orange-500', bg: 'bg-orange-500/10' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`flex items-center justify-between py-3 px-3 rounded-xl ${c.bg} my-1.5`}>
      <span className="text-sm font-semibold text-slate-200 min-w-[90px]">{label}</span>
      <div className="flex items-center gap-2 relative">
        {/* Flash indicator */}
        {flash && (
          <span
            className="absolute -top-4 left-1/2 -translate-x-1/2 text-sm font-bold pointer-events-none"
            style={{ animation: 'float-up 0.4s ease-out forwards' }}
          >
            <span className={flash === '+' ? 'text-emerald-400' : 'text-red-400'}>
              {flash === '+' ? '+1' : '-1'}
            </span>
          </span>
        )}

        <button
          onClick={handleDecrement}
          aria-label={`Decrease ${label}`}
          className="w-11 h-11 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white text-lg font-bold transition-all flex items-center justify-center select-none btn-press"
        >
          -
        </button>
        <input
          type="number"
          value={editing ? localValue : String(value)}
          onChange={handleChange}
          onFocus={() => { setEditing(true); setLocalValue(String(value)); }}
          onBlur={handleBlur}
          aria-label={`${label} count`}
          className={`w-16 h-11 text-center text-lg font-bold text-white tabular-nums bg-slate-800/80 rounded-xl border-2 border-slate-600/50 focus:border-blue-500 focus:outline-none transition-all ${
            flash === '+' ? 'animate-pop border-emerald-500/50' : flash === '-' ? 'animate-pop border-red-500/50' : ''
          }`}
          min={0}
        />
        <button
          onClick={handleIncrement}
          aria-label={`Increase ${label}`}
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.btn} hover:brightness-110 text-white text-lg font-bold transition-all flex items-center justify-center select-none btn-press shadow-lg`}
        >
          +
        </button>
      </div>
    </div>
  );
}
