/**
 * File: [`lib/smartDelivery.js`](lib/smartDelivery.js:1)
 *
 * Story 4.3 — Smart delivery behaviors hooks (ramp-up volume, in-hand heuristics)
 *
 * Purpose:
 * - Provide a small, platform-agnostic strategy interface that the delivery layer can use
 *   to attach advisory delivery hints to notification content (since many OS APIs limit
 *   direct control over device volume / proximity).
 * - Offer default ramp-up volume hints and an "in-hand" heuristic hook (stubbed) so the
 *   rest of the app can wire platform/sensor-specific behavior later.
 *
 * Acceptance target:
 * - Delivery layer supports a strategy interface and degrades gracefully per platform.
 *
 * Notes:
 * - This module does NOT attempt to change device volume or use private APIs.
 *   Instead it produces advisory metadata that `NotificationService` or native code can
 *   consume when scheduling notifications, and exposes small helper utilities for tests.
 * - To integrate real sensors (motion/proximity), the app should implement a sensor provider
 *   and call `evaluateInHandHeuristic` with runtime sensor data. This file provides a
 *   safe default (no-op / conservative) implementation.
 */

/* Example shape of hints added to notification content:
 *
 * content.data._poco_smart_delivery = {
 *    strategy: 'default_ramp',            // strategy id
 *    rampUp: [ { step: 0, pct: 0.2, afterSeconds: 0 }, { step:1, pct:0.6, afterSeconds:8 }, ... ],
 *    inHandPreferred: true|false|null,    // whether to prefer louder/different delivery if in-hand
 *    notes: 'advisory text'
 * }
 */

const DEFAULT_STRATEGY_ID = 'default_ramp';

function clampPct(v) {
  if (typeof v !== 'number' || isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * generateDefaultRampUpSequence(reminder)
 *
 * Create an advisory ramp-up volume sequence.
 * - Returns an array of steps: { step, volumePct, afterSeconds }.
 *
 * Notes:
 * - These are advisory only. Changing device volume is platform-specific and MUST be
 *   implemented in native code or via a dedicated OS API where permitted.
 */
export function generateDefaultRampUpSequence(reminder = {}) {
  // Base choice can be influenced by tier hints (e.g., T1 -> more aggressive)
  const tier = reminder?.data?._poco_tier || reminder?.tier || null;
  // small maps to aggressive/default/soft
  const aggressiveTiers = ['T1'];
  const softTiers = ['T3'];

  let seq;
  if (tier && aggressiveTiers.includes(tier)) {
    // Quick aggressive ramp
    seq = [
      { step: 0, volumePct: clampPct(0.3), afterSeconds: 0 },
      { step: 1, volumePct: clampPct(0.7), afterSeconds: 8 },
      { step: 2, volumePct: clampPct(1.0), afterSeconds: 15 },
    ];
  } else if (tier && softTiers.includes(tier)) {
    // Gentle non-intrusive ramp (may be ignored by native)
    seq = [
      { step: 0, volumePct: clampPct(0.1), afterSeconds: 0 },
      { step: 1, volumePct: clampPct(0.2), afterSeconds: 12 },
    ];
  } else {
    // Default moderate ramp
    seq = [
      { step: 0, volumePct: clampPct(0.2), afterSeconds: 0 },
      { step: 1, volumePct: clampPct(0.5), afterSeconds: 10 },
      { step: 2, volumePct: clampPct(0.8), afterSeconds: 20 },
    ];
  }

  // Attach small metadata
  return seq.map((s, i) => ({ ...s, step: i }));
}

/**
 * evaluateInHandHeuristic(sensorData)
 *
 * Small helper that inspects provided sensor data and returns:
 * - true  => most-likely in-hand (prefer louder / full-screen)
 * - false => likely not in-hand (prefer conservative delivery)
 * - null  => unknown / insufficient data
 *
 * sensorData is an app-defined object. Example recommended fields:
 *  { lastMotionEventSecondsAgo, proximityState, lastTouchEventSecondsAgo, screenOn }
 *
 * Default implementation is conservative and will return null (unknown).
 * Apps should supply real sensor data from device APIs and call this function
 * to get a hint.
 */
export function evaluateInHandHeuristic(sensorData = {}) {
  try {
    if (!sensorData || typeof sensorData !== 'object') return null;

    const { lastMotionEventSecondsAgo, proximityState, lastTouchEventSecondsAgo, screenOn } = sensorData;

    // If screen is off, assume not in hand
    if (screenOn === false) return false;

    // If proximity sensor says 'near' or last touch was recent, assume in-hand
    if (proximityState === 'near') return true;
    if (typeof lastTouchEventSecondsAgo === 'number' && lastTouchEventSecondsAgo < 10) return true;

    // If motion recent (e.g., <8s), lean towards in-hand
    if (typeof lastMotionEventSecondsAgo === 'number' && lastMotionEventSecondsAgo < 8) return true;

    // Not enough signal: unknown
    return null;
  } catch (err) {
    // degrade gracefully
    console.warn('evaluateInHandHeuristic failed', err);
    return null;
  }
}

/**
 * applySmartDeliveryHints(content, reminder, opts)
 *
 * - content: expo-notifications content object (cloned and returned)
 * - reminder: reminder object (may contain tier hints in reminder.data._poco_tier)
 * - opts:
 *    - sensorData: optional object passed to evaluateInHandHeuristic to compute in-hand preference
 *    - forceStrategy: optional strategy id override
 *
 * This function returns a new content object with advisory delivery metadata.
 * It never changes core notification fields (title/body) directly; only attaches
 * advisory metadata under content.data._poco_smart_delivery and content.data._poco_ramp_up.
 */
export function applySmartDeliveryHints(content = {}, reminder = {}, opts = {}) {
  const contentCopy = { ...(content || {}) };
  contentCopy.data = { ...(contentCopy.data || {}) };

  const sensorData = opts.sensorData || null;
  const strategyId = opts.forceStrategy || DEFAULT_STRATEGY_ID;

  // Determine in-hand hint
  const inHand = sensorData ? evaluateInHandHeuristic(sensorData) : null;

  // Attach a default ramp-up sequence (may be tuned by tier)
  const rampUp = generateDefaultRampUpSequence(reminder);

  contentCopy.data._poco_smart_delivery = {
    strategy: strategyId,
    inHandPreferred: inHand,
    notes:
      'Advisory smart delivery hints: rampUp sequence and inHandPreferred. Native/platform code should map these hints to actual delivery APIs where permitted.',
  };

  // Attach the ramp-up as a first-class field too for convenience
  contentCopy.data._poco_ramp_up = rampUp;

  // Also add an explicit in-hand hint key
  contentCopy.data._poco_in_hand_hint = inHand;

  return contentCopy;
}

/**
 * createStrategyPlaceholder()
 *
 * Returns an object that documents the interface expected by NotificationService/native code.
 * This is useful for tests or simple wiring.
 */
export function createStrategyPlaceholder() {
  return {
    id: DEFAULT_STRATEGY_ID,
    description: 'Default ramp-up strategy (advisory only).',
    generateRampUpSequence: generateDefaultRampUpSequence,
    evaluateInHandHeuristic,
    applyHints: applySmartDeliveryHints,
  };
}

/* Default export: simple object with helpers */
const SmartDelivery = {
  DEFAULT_STRATEGY_ID,
  generateDefaultRampUpSequence,
  evaluateInHandHeuristic,
  applySmartDeliveryHints: applySmartDeliveryHints,
  createStrategyPlaceholder,
};

export default SmartDelivery;