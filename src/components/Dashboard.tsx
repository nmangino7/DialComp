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
    incrementTracker,
    decrementTracker,
    setTracker,
    incrementPoints,
    decrementPoints,
    setPoints,
    addRep,
    toggleParticipant,
    resetDay,
  } = useCompetitionData();

  const [activeTab, setActiveTab] = useState<TabType>('tracker');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddRep, setShowAddRep] = useState(false);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg animate-pulse">Loading competition...</div>
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

  // Sorted entries for tracker tab — ranked by SETS (most important metric)
  const trackerSorted = [...state.trackerEntries].sort((a, b) => {
    const ta = a.sets.morning + a.sets.afternoon;
    const tb = b.sets.morning + b.sets.afternoon;
    return tb - ta;
  });

  // Sorted entries for points tab
  const pointsActive = state.pointsEntries.filter((e) =>
    state.pointsParticipantIds.includes(e.repId),
  );
  const pointsSorted = [...pointsActive].sort(
    (a, b) => calculatePoints(b) - calculatePoints(a),
  );

  // Leaderboard data — tracker ranks by sets
  const trackerLeaderboard = trackerSorted.slice(0, 3).map((entry) => ({
    rep: state.reps.find((r) => r.id === entry.repId)!,
    value: entry.sets.morning + entry.sets.afternoon,
    label: 'sets',
  })).filter((e) => e.rep);

  const pointsLeaderboard = pointsSorted.slice(0, 3).map((entry) => ({
    rep: state.reps.find((r) => r.id === entry.repId)!,
    value: calculatePoints(entry),
    label: 'points',
  })).filter((e) => e.rep);

  // My stats
  const myRep = state.reps.find((r) => r.id === myRepId);
  const myTrackerEntry = state.trackerEntries.find((e) => e.repId === myRepId);
  const myPointsEntry = state.pointsEntries.find((e) => e.repId === myRepId);
  const myTrackerRank = trackerSorted.findIndex((e) => e.repId === myRepId) + 1;
  const myPointsRank = pointsSorted.findIndex((e) => e.repId === myRepId) + 1;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Join Modal */}
      <JoinModal open={needsJoin} onJoin={handleJoin} />

      {/* Header */}
      <header className="bg-slate-800/80 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent flex items-center gap-2">
                <span className="text-2xl">&#9876;&#65039;</span> Welcome to the Arena
              </h1>
              <p className="text-xs text-slate-500">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {' · '}
                <span className="text-emerald-500">{state.reps.length} competing</span>
                {' · '}
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-500"> live</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdmin(!isAdmin)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  isAdmin
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {isAdmin ? 'Admin' : 'Admin'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-900 rounded-lg p-1 mt-3 gap-0.5">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                activeTab === 'tracker'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              &#9876;&#65039; Tracker
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                activeTab === 'points'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              &#x1F525; Points
            </button>
            <button
              onClick={() => setActiveTab('battle')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all btn-press ${
                activeTab === 'battle'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
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

        {/* Leaderboard (tracker & points tabs only) */}
        {activeTab !== 'battle' && (
          <Leaderboard
            entries={activeTab === 'tracker' ? trackerLeaderboard : pointsLeaderboard}
          />
        )}

        {/* My Stats */}
        {myRep && activeTab === 'tracker' && myTrackerEntry && (
          <>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-700/50" />
              Your Stats
              <span className="h-px flex-1 bg-slate-700/50" />
            </h3>
            <MyStats
              mode="tracker"
              rep={myRep}
              entry={myTrackerEntry}
              rank={myTrackerRank || state.reps.length}
              totalReps={state.reps.length}
              onIncrement={incrementTracker}
              onDecrement={decrementTracker}
              onSet={setTracker}
            />
          </>
        )}

        {myRep && activeTab === 'points' && myPointsEntry && (
          <>
            {/* Points participant selector */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select who competes in Points
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {state.reps.map((rep) => {
                  const active = state.pointsParticipantIds.includes(rep.id);
                  return (
                    <button
                      key={rep.id}
                      onClick={() => toggleParticipant(rep.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                      }`}
                    >
                      {rep.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-700/50" />
              Your Stats
              <span className="h-px flex-1 bg-slate-700/50" />
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

        {/* Full Standings */}
        {activeTab === 'tracker' && (
          <Standings
            mode="tracker"
            reps={state.reps}
            entries={state.trackerEntries}
            myRepId={myRepId}
            isAdmin={isAdmin}
            onIncrement={incrementTracker}
            onDecrement={decrementTracker}
            onSet={setTracker}
          />
        )}
        {activeTab === 'points' && (
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
        )}

        {/* Action buttons */}
        <div className="space-y-2 pt-4">
          {!hasJoined && (
            <button
              onClick={() => {/* JoinModal shows automatically */}}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg shadow-lg"
            >
              Join Competition
            </button>
          )}

          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddRep(true)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-colors"
              >
                + Add Rep
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-red-400 font-semibold text-sm transition-colors"
              >
                Reset Day
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add Rep Modal (admin) */}
      {showAddRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              const name = input.value.trim();
              if (name && name.length <= 20) handleAddRep(name);
            }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-4">Add Rep</h3>
            <input
              autoFocus
              type="text"
              placeholder="Rep name..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddRep(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reset Day?</h3>
            <p className="text-slate-400 text-sm mb-4">
              This clears all numbers but keeps reps. Cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
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
