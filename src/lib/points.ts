import { PointsEntry } from './types';
import { POINT_VALUES } from './constants';

export function calculatePoints(entry: PointsEntry): number {
  const totalDials = entry.dials.morning + entry.dials.afternoon;
  const totalDnc = entry.dnc.morning + entry.dnc.afternoon;
  const totalNotInterested = entry.notInterested.morning + entry.notInterested.afternoon;
  const totalSets = entry.sets.morning + entry.sets.afternoon;

  return (
    totalDials * POINT_VALUES.dials +
    totalDnc * POINT_VALUES.dnc +
    totalNotInterested * POINT_VALUES.notInterested +
    totalSets * POINT_VALUES.sets
  );
}
