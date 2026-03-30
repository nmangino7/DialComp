'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface EditableCellProps {
  value: number;
  onInc: () => void;
  onDec: () => void;
  onSet: (v: number) => void;
}

export default function EditableCell({ value, onInc, onDec, onSet }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync from parent when not editing
  useEffect(() => {
    if (!editing) {
      setLocalValue(String(value));
    }
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

    // Debounce the server call by 600ms so typing "150" sends one action, not three
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      commitValue(raw);
    }, 600);
  };

  const handleFocus = () => {
    setEditing(true);
    setLocalValue(String(value));
  };

  const handleBlur = () => {
    // Commit immediately on blur
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commitValue(localValue);
    setEditing(false);
  };

  return (
    <td className="px-1 py-2 text-center">
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={onDec}
          className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition-colors flex items-center justify-center"
        >
          −
        </button>
        <input
          type="number"
          value={editing ? localValue : String(value)}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-12 text-center font-semibold text-white tabular-nums bg-slate-700/50 rounded px-1 py-0.5 border border-slate-600 focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min={0}
        />
        <button
          onClick={onInc}
          className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center justify-center"
        >
          +
        </button>
      </div>
    </td>
  );
}
