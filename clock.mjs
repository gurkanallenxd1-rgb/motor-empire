export const HOUR_MS = 2500;
export const DAY_MS = HOUR_MS * 24;
export const OFFLINE_LIMIT = 60 * DAY_MS;

export const startClock = wall => ({wall, offset:0, paused:false});

export function elapsedWall(clock, now) {
  return clock.paused ? 0 : Math.min(OFFLINE_LIMIT,Math.max(0,now-clock.wall));
}

export function projectedOffset(clock, now) {
  return Math.min(DAY_MS,clock.offset+elapsedWall(clock,now));
}

export function gameTime(day, offset = 0) {
  return (day-1)*DAY_MS+offset;
}

export function deliveryTime(bike) {
  return bike.shipping.arrivalMs ?? gameTime(bike.shipping.arrivalDay);
}
