'use client';

import { useEffect, useState } from 'react';
import { subscribe } from '@/lib/eventBus';

interface Particle {
  id: number;
  x: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  color: string;
  size: number;
  shape: 'square' | 'circle' | 'star';
  burstId: number;
}

interface State {
  particles: Particle[];
}

const COLORS = ['#fbbf24', '#f59e0b', '#ef4444', '#dc2626', '#10b981', '#3b82f6', '#a855f7'];

let nextBurstId = 0;
let nextParticleId = 0;

export default function Confetti() {
  const [state, setState] = useState<State>({ particles: [] });

  useEffect(() => {
    const unsub = subscribe((e) => {
      const burstTriggers: string[] = ['set_scored', 'took_lead', 'rank_up', 'milestone', 'achievement'];
      if (!burstTriggers.includes(e.type)) return;
      // Bigger burst for bigger events
      const count = e.type === 'achievement' || e.type === 'took_lead' || e.type === 'milestone'
        ? 50 : e.type === 'rank_up' ? 35 : 25;
      const burstId = ++nextBurstId;
      const newParts: Particle[] = [];
      for (let i = 0; i < count; i++) {
        newParts.push({
          id: ++nextParticleId,
          x: 50 + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 80,
          vy: -60 - Math.random() * 60,
          rotation: Math.random() * 360,
          spin: (Math.random() - 0.5) * 720,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 8,
          shape: ['square', 'circle', 'star'][Math.floor(Math.random() * 3)] as Particle['shape'],
          burstId,
        });
      }
      setState((s) => ({ particles: [...s.particles, ...newParts] }));
      // Auto-cleanup after 3s
      setTimeout(() => {
        setState((s) => ({ particles: s.particles.filter((p) => p.burstId !== burstId) }));
      }, 3000);
    });
    return unsub;
  }, []);

  if (state.particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {state.particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '60%',
            width: p.size,
            height: p.size,
            backgroundColor: p.shape === 'star' ? 'transparent' : p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? '2px' : 0,
            color: p.color,
            fontSize: p.size * 1.5,
            lineHeight: '1',
            animation: `confetti-fall 2.5s cubic-bezier(0.2, 0.7, 0.3, 1) forwards`,
            // Pass velocities via custom properties
            ['--vx' as string]: `${p.vx}vw`,
            ['--vy' as string]: `${p.vy}vh`,
            ['--spin' as string]: `${p.spin}deg`,
            ['--rot' as string]: `${p.rotation}deg`,
          } as React.CSSProperties}
        >
          {p.shape === 'star' ? '★' : ''}
        </div>
      ))}
    </div>
  );
}
