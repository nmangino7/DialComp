export interface Rep {
  id: string;
  name: string;
}

export interface TimeSlot {
  morning: number;
  afternoon: number;
}

export interface TrackerEntry {
  repId: string;
  dials: TimeSlot;
  pickUps: TimeSlot;
  sets: TimeSlot;
}

export interface PointsEntry {
  repId: string;
  dials: TimeSlot;
  dnc: TimeSlot;
  notInterested: TimeSlot;
  sets: TimeSlot;
}

export interface CompetitionState {
  reps: Rep[];
  trackerEntries: TrackerEntry[];
  pointsEntries: PointsEntry[];
  pointsParticipantIds: string[];
  date: string;
}

export type TrackerMetric = 'dials' | 'pickUps' | 'sets';
export type PointsMetric = 'dials' | 'dnc' | 'notInterested' | 'sets';
export type Period = 'morning' | 'afternoon';
export type TabType = 'tracker' | 'points';
