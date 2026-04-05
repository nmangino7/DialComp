'use client';

import { useState } from 'react';

interface JoinModalProps {
  open: boolean;
  onJoin: (name: string) => void;
}

export default function JoinModal({ open, onJoin }: JoinModalProps) {
  const [name, setName] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed.length <= 20) {
      onJoin(trimmed);
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="text-5xl mb-4">&#9876;&#65039;</div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent mb-2">
          Enter the Arena
        </h2>
        <p className="text-slate-400 text-sm mb-6">Type your name to join the battle</p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name..."
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white text-lg text-center border border-slate-600 focus:border-blue-500 focus:outline-none mb-4"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-lg hover:brightness-110 active:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          &#9876;&#65039; Fight!
        </button>
      </form>
    </div>
  );
}
