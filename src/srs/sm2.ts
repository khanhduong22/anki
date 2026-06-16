export interface SRSState {
  repetitions: number;
  interval: number;
  easeFactor: number;
}

/**
 * Calculates the next review interval and ease factor based on the SM-2 algorithm.
 * @param quality Rating of recall quality from 0 to 5.
 *                0: "Total blackout", complete failure to recall
 *                1: "Incorrect response; the correct one seemed easy to recall"
 *                2: "Incorrect response; where the correct one seemed easy to remember"
 *                3: "Correct response recalled with serious difficulty"
 *                4: "Correct response after a hesitation"
 *                5: "Perfect response"
 * @param prevRepetitions Previous number of consecutive correct repetitions
 * @param prevInterval Previous interval in days
 * @param prevEaseFactor Previous Ease Factor (EF)
 */
export function calculateSM2(
  quality: number,
  prevRepetitions: number,
  prevInterval: number,
  prevEaseFactor: number
): SRSState {
  let repetitions = prevRepetitions;
  let interval = prevInterval;
  let easeFactor = prevEaseFactor;

  // If failed (quality < 3), reset repetitions and interval to 1 day
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 4; // We can use 4 days (original SM2 uses 6, but 4 is popular for faster learning cycles)
    } else {
      interval = Math.round(prevInterval * easeFactor);
    }
    repetitions = repetitions + 1;
  }

  // Calculate new ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Limit EF to minimum of 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return {
    repetitions,
    interval,
    easeFactor,
  };
}
