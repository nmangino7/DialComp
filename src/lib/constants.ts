// Deterministic IDs so all clients initialize with the same rep IDs
export const DEFAULT_REPS = [
  { id: 'rep-cody', name: 'Cody' },
  { id: 'rep-will', name: 'Will' },
  { id: 'rep-jordy', name: 'Jordy' },
  { id: 'rep-colin', name: 'Colin' },
  { id: 'rep-naylor', name: 'Naylor' },
  { id: 'rep-harrison', name: 'Harrison' },
  { id: 'rep-jenna', name: 'Jenna' },
  { id: 'rep-viridiana', name: 'Viridiana' },
];

export const POINT_VALUES = {
  dials: 1,
  dnc: -3,
  notInterested: -1,
  sets: 10,
} as const;

export const STORAGE_KEY = 'dial-comp-state';
