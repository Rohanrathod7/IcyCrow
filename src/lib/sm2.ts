/**
 * SM-2 Spaced Repetition Algorithm
 * Pure function — no side effects, no storage access.
 *
 * @param quality - User self-rating 0–5 (0=blackout, 5=perfect)
 * @param repetition - Current successful repetition count
 * @param easeFactor - Current ease factor (default 2.5)
 * @param interval - Current interval in days
 * @returns Updated scheduling state
 */
export function sm2(
  quality: number,
  repetition: number,
  easeFactor: number,
  interval: number
): {
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReviewAt: string;
} {
  // Clamp quality to [0, 5]
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let newInterval: number;
  let newRepetition: number;
  let newEaseFactor: number;

  if (q < 3) {
    // Failed recall — reset
    newRepetition = 0;
    newInterval = 1;
    // EF doesn't change on failure per original SM-2
    newEaseFactor = easeFactor;
  } else {
    // Successful recall
    newRepetition = repetition + 1;

    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }

    // Update ease factor
    newEaseFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  }

  // EF floor of 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  // Cap interval at 365 days
  if (newInterval > 365) {
    newInterval = 365;
  }

  const now = new Date();
  const nextReview = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  return {
    interval: newInterval,
    repetition: newRepetition,
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    nextReviewAt: nextReview.toISOString(),
  };
}
