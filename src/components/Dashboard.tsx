'use client';

import { useState } from 'react';
import { useCompetitionData } from '@/hooks/useCompetitionData';
import { TabType } from '@/lib/types';
import { calculatePoints } from '@/lib/points';
import JoinModal from './JoinModal';
import Leaderboard from './Leaderboard';
import MyStats from './MyStats';
import Standings from './Standings';
import BattleArena from './BattleArena';

export default function Dashboard() {
  const {
    state,
    mounted,
    myRepId,
    setMyRepId,
    incrementPoints,
    decrementPoints,
    setPoints,
    addRep,
    toggleParticipant,
    resetDay,
  } = useCompetitionData();

  const [activeTab, setActiveTab] = useState<TabType>('points');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddRep, setShowAddRep] = useState(false);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-amber-400 text-lg animate-pulse">Entering the Arena...</div>
      </div>
    );
  }

  const hasJoined = myRepId && state.reps.some((r) => r.id === myRepId);
  const needsJoin = !hasJoined;

  const handleJoin = (name: string) => {
    const id = addRep(name);
    setMyRepId(id);
  };

  const handleAddRep = (name: string) => {
    addRep(name);
    setShowAddRep(false);
  };

  // Sorted entries for points
  const pointsActive = state.pointsEntries.filter((e) =>
    state.pointsParticipantIds.includes(e.repId),
  );
  const pointsSorted = [...pointsActive].sort(
    (a, b) => calculatePoints(b) - calculatePoints(a),
  );

  const pointsLeaderboard = pointsSorted.slice(0, 3).map((entry) => ({
    rep: state.reps.find((r) => r.id === entry.repId)!,
    value: calculatePoints(entry),
    label: 'points',
  })).filter((e) => e.rep);

  // My stats
  const myRep = state.reps.find((r) => r.id === myRepId);
  const myPointsEntry = state.pointsEntries.find((e) => e.repId === myRepId);
  const myPointsRank = pointsSorted.findIndex((e) => e.repId === myRepId) + 1;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Join Modal */}
      <JoinModal open={needsJoin} onJoin={handleJoin} />

      {/* Header — gladiator stone theme */}
      <header className="bg-gradient-to-b from-stone-900 via-slate-900 to-slate-900 border-b-2 border-amber-900/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-amber-300 via-amber-500 to-red-600 bg-clip-text text-transparent flex items-center gap-2">
                <span className="text-2xl">&#9876;&#65039;</span> Welcome to the Arena
              </h1>
              <p className="text-xs text-stone-500">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {' \u00B7 '}
                <span className="text-amber-500">{state.reps.length} gladiators</span>
                {' \u00B7 '}
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-500"> live</span>
              </p>
            </div>
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                isAdmin
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-500 hover:bg-stone-700'
              }`}
            >
              Admin
            </button>
          </div>

          {/* 2 Tabs */}
          <div className="flex bg-stone-950 rounded-lg p-1 mt-3 gap-0.5">
            <button
              onClick={() => setActiveTab('points')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                activeTab === 'points'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              &#9876;&#65039; Points
            </button>
            <button
              onClick={() => setActiveTab('battle')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                activeTab === 'battle'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              &#x1F3DF;&#65039; Battle
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Battle Arena Tab */}
        {activeTab === 'battle' && (
          <BattleArena
            reps={state.reps}
            entries={state.pointsEntries}
            participantIds={state.pointsParticipantIds}
            myRepId={myRepId}
          />
        )}

        {/* Points Tab */}
        {activeTab === 'points' && (
          <>
            <Leaderboard entries={pointsLeaderboard} />

            {myRep && myPointsEntry && (
              <>
                {/* Participant selector */}
                <div className="bg-stone-800/50 rounded-xl border border-amber-900/20 p-3">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
                    Select who competes
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {state.reps.map((rep) => {
                      const active = state.pointsParticipantIds.includes(rep.id);
                      return (
                        <button
                          key={rep.id}
                          onClick={() => toggleParticipant(rep.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all btn-press ${
                            active
                              ? 'bg-amber-600 text-white'
                              : 'bg-stone-800 text-stone-500 hover:bg-stone-700'
                          }`}
                        >
                          {rep.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest px-1 flex items-center gap-2">
                  <span className="h-px flex-1 bg-amber-900/30" />
                  Your Stats
                  <span className="h-px flex-1 bg-amber-900/30" />
                </h3>
                <MyStats
                  mode="points"
                  rep={myRep}
                  entry={myPointsEntry}
                  totalPoints={calculatePoints(myPointsEntry)}
                  rank={myPointsRank || state.reps.length}
                  totalReps={pointsActive.length}
                  onIncrement={incrementPoints}
                  onDecrement={decrementPoints}
                  onSet={setPoints}
                />
              </>
            )}

            <Standings
              mode="points"
              reps={state.reps}
              entries={state.pointsEntries}
              participantIds={state.pointsParticipantIds}
              myRepId={myRepId}
              isAdmin={isAdmin}
              onIncrement={incrementPoints}
              onDecrement={decrementPoints}
              onSet={setPoints}
            />
          </>
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-4">
          {!hasJoined && (
            <button
              onClick={() => {/* JoinModal shows automatically */}}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-lg shadow-lg btn-press"
            >
              &#9876;&#65039; Enter the Arena
            </button>
          )}

          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddRep(true)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold text-sm transition-colors border border-amber-900/20"
              >
                + Add Gladiator
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-red-400 font-semibold text-sm transition-colors border border-amber-900/20"
              >
                Reset Day
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add Rep Modal */}
      {showAddRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              const name = input.value.trim();
              if (name && name.length <= 20) handleAddRep(name);
            }}
            className="bg-stone-900 border border-amber-900/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-amber-300 mb-4">Add Gladiator</h3>
            <input
              autoFocus
              type="text"
              placeholder="Gladiator name..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-stone-800 text-white border border-amber-900/30 focus:border-amber-500 focus:outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddRep(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500 transition-colors"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset Day?</h3>
            <p className="text-stone-400 text-sm mb-4">
              This clears all numbers but keeps gladiators. Cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { resetDay(); setShowResetConfirm(false); }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
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
