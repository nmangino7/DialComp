'use client';

import { useEffect } from 'react';
import { subscribe } from '@/lib/eventBus';
import { sfx, isSoundEnabled } from '@/lib/sounds';

export default function SoundManager() {
  useEffect(() => {
    const unsub = subscribe((e) => {
      if (!isSoundEnabled()) return;
      switch (e.type) {
        case 'set_scored': sfx.setScored(); break;
        case 'kill': sfx.kill(); break;
        case 'achievement': sfx.achievement(); break;
        case 'powerup_collected': sfx.powerup(); break;
        case 'took_lead': sfx.rankUp(); break;
        case 'rank_up': sfx.rankUp(); break;
        case 'milestone': sfx.milestone(); break;
        case 'increment': sfx.increment(); break;
        case 'click': sfx.click(); break;
      }
    });
    return unsub;
  }, []);
  return null;
}
