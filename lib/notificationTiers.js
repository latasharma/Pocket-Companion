/**
 * File: [`lib/notificationTiers.js`](lib/notificationTiers.js:1)
 *
 * Story 4.2 — Tier profiles (T1/T2/T3) configuration
 *
 * Purpose:
 * - Centralize tier profile definitions (sound, vibration, priority, full-screen intent flags).
 * - Provide a configurable mapping from reminder category -> tier.
 * - Small helper to attach tier info onto notification content before scheduling.
 *
 * Notes:
 * - This is a platform-agnostic configuration layer. Actual platform-specific behavior
 *   (Android channels / iOS interruption levels) should be wired in the native/channel setup
 *   and when scheduling notifications in NotificationService.
 */

const DEFAULT_TIER_PROFILES = {
  T1: {
    id: 'T1',
    name: 'Tier 1 - High Interruptiveness',
    // Suggested playback sound key or system sound name
    sound: 'alarm', // developer may map to platform-specific resource
    // Vibration pattern (ms): [on, off, on, ...] — advisory, platform-specific
    vibrationPattern: [500, 200, 500],
    // Relative priority hint (string for readability; NotificationService may map to platform constants)
    priority: 'max',
    // Whether this tier should attempt to use full-screen intent on Android where possible
    fullScreenIntent: true,
    // Channels / delivery channels suggested
    channels: ['push', 'in_app', 'voice'],
    // Human-readable description
    description: 'Highest interruptiveness: sounds, vibration, and full-screen when feasible.',
  },
  T2: {
    id: 'T2',
    name: 'Tier 2 - Medium Interruptiveness',
    sound: 'gentle_chime',
    vibrationPattern: [200, 150, 200],
    priority: 'high',
    fullScreenIntent: false,
    channels: ['push', 'in_app'],
    description: 'Medium interruptiveness: noticeable sound/vibration but avoids full-screen unless explicitly configured.',
  },
  T3: {
    id: 'T3',
    name: 'Tier 3 - Low / Non-intrusive',
    sound: 'default',
    vibrationPattern: [], // empty = no vibration by default
    priority: 'low',
    fullScreenIntent: false,
    channels: ['push'],
    description: 'Non-intrusive delivery: badge/list-only when feasible; no sound/vibration by default.',
  },
};

/**
 * Default mapping from category -> tier id.
 * This is configurable by app settings; callers can override via setCategoryTierMap.
 *
 * Default choices (opinionated, changeable):
 * - medications -> T1 (time-critical)
 * - appointments -> T2 (important but less urgent)
 * - other/important_dates -> T3 (non-intrusive by default)
 */
let CATEGORY_TIER_MAP = {
  medications: 'T1',
  appointments: 'T2',
  important_dates: 'T3',
  other: 'T3',
};

/**
 * Get tier profile by id (e.g., 'T1') or return null.
 */
export function getTierProfileById(tierId) {
  if (!tierId) return null;
  return DEFAULT_TIER_PROFILES[tierId] || null;
}

/**
 * Resolve a category string to a tier profile.
 * Accepts either a tier id or a reminder category; returns the profile object.
 */
export function resolveTierForCategory(categoryOrTierId) {
  if (!categoryOrTierId) return getTierProfileById(CATEGORY_TIER_MAP.other);
  const s = String(categoryOrTierId).trim();
  // If it's already a tier id like 'T1', return directly
  if (DEFAULT_TIER_PROFILES[s]) return DEFAULT_TIER_PROFILES[s];
  // Normalize category key
  const key = String(s).toLowerCase();
  const mappedTier = CATEGORY_TIER_MAP[key] || CATEGORY_TIER_MAP.other;
  return getTierProfileById(mappedTier);
}

/**
 * Allow app to override the category->tier map at runtime.
 * Pass an object like { medications: 'T2', appointments: 'T1' }
 */
export function setCategoryTierMap(map) {
  if (!map || typeof map !== 'object') return;
  const normalized = {};
  for (const k of Object.keys(map)) {
    try {
      const key = String(k).toLowerCase();
      const v = String(map[k]);
      if (DEFAULT_TIER_PROFILES[v]) {
        normalized[key] = v;
      } else {
        // ignore invalid tier ids
      }
    } catch (e) {
      // ignore malformed entries
    }
  }
  // merge with existing map
  CATEGORY_TIER_MAP = { ...CATEGORY_TIER_MAP, ...normalized };
  return CATEGORY_TIER_MAP;
}

/**
 * Expose the full tier profiles so the rest of the app can inspect available tiers.
 */
export function getAllTierProfiles() {
  return { ...DEFAULT_TIER_PROFILES };
}

/**
 * Attach tier hints to a notification content object before scheduling.
 * - content: the expo-notifications content object (will be cloned)
 * - tierProfile: either a tier id string or a tier profile object
 *
 * This function returns a NEW content object with advisory fields added:
 *  - data._poco_tier -> tier id
 *  - sound set according to profile (if not already present)
 *  - android / ios hints may be added for later wiring by NotificationService/native code
 */
export function attachTierToContent(content = {}, tierProfileOrId) {
  const contentCopy = { ...(content || {}) };
  const tier =
    typeof tierProfileOrId === 'string'
      ? getTierProfileById(tierProfileOrId)
      : tierProfileOrId && tierProfileOrId.id
      ? tierProfileOrId
      : null;

  if (!tier) return contentCopy;

  // Ensure data container exists
  contentCopy.data = { ...(contentCopy.data || {}) };
  contentCopy.data._poco_tier = tier.id;

  // Prefer explicit content.sound if provided; otherwise use tier.sound
  if (!contentCopy.sound && tier.sound) {
    contentCopy.sound = tier.sound;
  }

  // Attach a platform-agnostic hint for vibration pattern and priority
  contentCopy.data._poco_vibration = tier.vibrationPattern || [];
  contentCopy.data._poco_priority = tier.priority || 'default';
  contentCopy.data._poco_fullscreen = !!tier.fullScreenIntent;

  // Android / iOS specific hint objects (these are advisory — NotificationService should map them to actual platform APIs)
  contentCopy._poco_platform_hints = {
    android: {
      // channelId choice could be derived later; include recommended channel id for full control
      recommendedChannelId: `poco_${tier.id.toLowerCase()}`,
      importanceHint: tier.priority || 'default',
      fullScreenIntent: !!tier.fullScreenIntent,
    },
    ios: {
      // interruptionLevel hints on iOS 15+ (e.g., passive, active, time-sensitive, critical)
      interruptionLevel: tier.id === 'T1' ? 'time-sensitive' : tier.id === 'T2' ? 'active' : 'passive',
    },
  };

  return contentCopy;
}

const NotificationTiers = {
  getAllTierProfiles,
  getTierProfileById,
  resolveTierForCategory,
  setCategoryTierMap,
  attachTierToContent,
  // Expose current mapping for debugging / UI settings
  _CATEGORY_TIER_MAP: () => ({ ...CATEGORY_TIER_MAP }),
  _DEFAULT_TIER_PROFILES: () => ({ ...DEFAULT_TIER_PROFILES }),
};

export default NotificationTiers;