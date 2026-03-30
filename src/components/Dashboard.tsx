'use client';

import { useState } from 'react';
import { useCompetitionData } from '@/hooks/useCompetitionData';
import { TabType } from '@/lib/types';
import CompetitionTracker from './CompetitionTracker';
import PointsCompetition from './PointsCompetition';
import AddRepModal from './AddRepModal';

export default function Dashboard() {
  const {
    state,
    mounted,
    incrementTracker,
    decrementTracker,
    incrementPoints,
    decrementPoints,
    addRep,
    toggleParticipant,
    resetDay,
  } = useCompetitionData();

  const [activeTab, setActiveTab] = useState<TabType>('tracker');
  const [showAddRep, setShowAddRep] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800/80 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Dial Competition
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddRep(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
              >
                + Add Rep
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
              >
                Reset Day
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                activeTab === 'tracker'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              Competition Tracker
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                activeTab === 'points'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              Points Competition
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-4 md:p-6">
          {activeTab === 'tracker' ? (
            <CompetitionTracker
              reps={state.reps}
              entries={state.trackerEntries}
              onIncrement={incrementTracker}
              onDecrement={decrementTracker}
            />
          ) : (
            <PointsCompetition
              reps={state.reps}
              entries={state.pointsEntries}
              participantIds={state.pointsParticipantIds}
              onIncrement={incrementPoints}
              onDecrement={decrementPoints}
              onToggleParticipant={toggleParticipant}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <AddRepModal
        open={showAddRep}
        onClose={() => setShowAddRep(false)}
        onAdd={addRep}
      />

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset Day?</h3>
            <p className="text-slate-400 text-sm mb-4">
              This will clear all numbers but keep your reps. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDay();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
