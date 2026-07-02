/**
 * Room of the Day logic
 * - Manages rotating through rooms (tags) in a deterministic cycle
 * - Handles daily advancement and override state
 * - Selects featured tasks for the day
 */

/**
 * Shuffle array using Fisher-Yates, seeded by date string
 * Same date input = same output (deterministic)
 */
function seededShuffle<T>(array: T[], dateSeed: string): T[] {
  const arr = [...array];
  const seed = parseInt(dateSeed.replace(/-/g, ''), 10);
  let rng = seed % 32767;

  for (let i = arr.length - 1; i > 0; i--) {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    const j = (rng / 65536) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if we need to advance the cycle (crossing day boundary)
 */
export function shouldAdvanceCycle(lastAdvancedDate: string): boolean {
  return lastAdvancedDate !== getTodayDateString();
}

/**
 * Advance the room cycle pointer, respecting the cycle queue.
 * If we've cycled through all rooms, re-shuffle and reset pointer.
 */
export function advanceCycle(
  cycle: string[],
  pointer: number
): { newCycle: string[]; newPointer: number } {
  if (cycle.length === 0) {
    return { newCycle: cycle, newPointer: 0 };
  }

  let newPointer = pointer + 1;
  let newCycle = cycle;

  // If we've gone past the end, reshuffle and reset
  if (newPointer >= cycle.length) {
    newCycle = seededShuffle(cycle, getTodayDateString());
    newPointer = 0;
  }

  return { newCycle, newPointer };
}

/**
 * Initialize or update the cycle based on available rooms.
 * If rooms have changed, rebuild the cycle with the new set.
 */
export function initializeCycle(
  availableRooms: string[],
  currentCycle: string[],
  currentPointer: number
): { newCycle: string[]; newPointer: number } {
  // If rooms haven't changed, keep existing cycle
  if (
    currentCycle.length === availableRooms.length &&
    currentCycle.every((room) => availableRooms.includes(room))
  ) {
    return { newCycle: currentCycle, newPointer: currentPointer };
  }

  // Rooms have changed: reshuffle with new set
  const newCycle = seededShuffle(availableRooms, getTodayDateString());
  return { newCycle, newPointer: 0 };
}

/**
 * Determine which room to feature today.
 * Takes into account override state and cycle.
 */
export function getTodayRoom(
  cycle: string[],
  pointer: number,
  overrideDate: string | null,
  overrideRoom: string | null
): string | null {
  const today = getTodayDateString();

  // If override is active for today, use it
  if (overrideDate === today && overrideRoom) {
    return overrideRoom;
  }

  // Otherwise use the cycle
  if (cycle.length === 0) return null;
  return cycle[pointer];
}

/**
 * Deterministically select up to 5 tasks for today.
 * Uses date as seed so same tasks are shown all day.
 */
export function selectFeaturedTasks<T extends { id: string }>(
  tasks: T[],
  maxCount: number = 5
): T[] {
  if (tasks.length <= maxCount) {
    return tasks;
  }

  // Shuffle deterministically by date, then take first maxCount
  const shuffled = seededShuffle(tasks, getTodayDateString());
  return shuffled.slice(0, maxCount);
}

export interface AppConfig {
  id: string;
  owner: string;
  room_cycle: string[];
  cycle_pointer: number;
  cycle_last_advanced_date: string;
  display_override_date: string | null;
  display_override_room: string | null;
  created_at: string;
  updated_at: string;
}
