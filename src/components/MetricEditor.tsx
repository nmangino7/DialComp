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

  const colorMap: Record<string, string> = {
    blue: 'from-blue-600 to-blue-500',
    emerald: 'from-emerald-600 to-emerald-500',
    purple: 'from-purple-600 to-purple-500',
    red: 'from-red-600 to-red-500',
    orange: 'from-orange-600 to-orange-500',
  };

  const btnGradient = colorMap[color] || colorMap.blue;

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-slate-300 min-w-[80px]">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrement}
          aria-label={`Decrease ${label}`}
          className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-xl font-bold transition-all flex items-center justify-center select-none"
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
          className="w-16 h-12 text-center text-lg font-bold text-white tabular-nums bg-slate-800 rounded-xl border-2 border-slate-600 focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min={0}
        />
        <button
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${btnGradient} hover:brightness-110 active:brightness-90 text-white text-xl font-bold transition-all flex items-center justify-center select-none shadow-lg`}
        >
          +
        </button>
      </div>
    </div>
  );
}
