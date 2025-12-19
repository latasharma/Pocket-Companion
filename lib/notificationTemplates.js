/**
 * Notification templates & copy tone system
 * File: [`lib/notificationTemplates.js`](lib/notificationTemplates.js:1)
 *
 * Purpose:
 * - Provide a small, testable template system that renders warm, contextual
 *   notification title/body pairs for reminders (Story 9.2).
 * - Exports `renderNotificationText(reminder)` which returns { title, body }.
 *
 * Notes:
 * - Designed to be simple and deterministic (no external i18n dependency).
 * - Templates can be registered/overridden via registerTemplate(name, fn).
 * - Reminder object convention:
 *    - id, title, description
 *    - category (e.g., 'medications', 'appointments', 'other')
 *    - reminder_time (ISO string)
 *    - metadata: optional object with contextual fields (medication_name, location, etc.)
 */
 
// Small set of registered template renderers
const templates = {};

/**
 * Helper: safe getter
 */
function get(obj, path, fallback = null) {
  if (!obj) return fallback;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return fallback;
    }
  }
  return cur == null ? fallback : cur;
}

/**
 * Determine a friendly greeting based on local time-of-day of the reminder.
 * Returns strings like: "Good morning", "Good afternoon", "Good evening"
 */
function greetingForIso(iso) {
  try {
    const d = iso ? new Date(iso) : new Date();
    const hour = d.getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  } catch (e) {
    return 'Hello';
  }
}

/**
 * Format ISO time to a short human-friendly string.
 * Uses toLocaleTimeString with hour/minute; callers can adapt if required.
 */
function formatTimeShort(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return iso;
  }
}

/**
 * Safe truncate helper for short notification bodies
 */
function truncateShort(s, max = 120) {
  if (!s || typeof s !== 'string') return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * Default medication template
 * - greeting + medication name or reminder.title fallback
 * - body includes dose instructions when available
 */
function medicationTemplate(reminder) {
  const medName = get(reminder, 'metadata.medication_name', reminder.title || 'your medication');
  const dose = get(reminder, 'metadata.dose') || get(reminder, 'metadata.instructions') || null;
  const timeStr = reminder.reminder_time ? formatTimeShort(reminder.reminder_time) : null;
  const greeting = greetingForIso(reminder.reminder_time);
 
  const title = `${greeting} — time for ${medName}`;
  let body = '';
  if (dose) {
    body = `Take ${dose}${timeStr ? ` — ${timeStr}` : ''}.`;
  } else if (reminder.description) {
    body = truncateShort(reminder.description);
  } else {
    body = timeStr ? `Scheduled at ${timeStr}.` : 'Tap to view details.';
  }
  return { title, body };
}

/**
 * Default appointment template
 * - greeting + brief description
 * - body includes time, location and a helpful phrase
 */
function appointmentTemplate(reminder) {
  const titleText = reminder.title || 'Appointment';
  const location = get(reminder, 'metadata.location') || null;
  const timeStr = reminder.reminder_time ? formatTimeShort(reminder.reminder_time) : null;
  const greeting = greetingForIso(reminder.reminder_time);
 
  const title = `${greeting} — ${titleText}`;
  let pieces = [];
  if (timeStr) pieces.push(`At ${timeStr}`);
  if (location) pieces.push(`Location: ${location}`);
  if (get(reminder, 'metadata.needs_ride')) pieces.push('Don’t forget to arrange transport.');
  if (get(reminder, 'description')) pieces.push(truncateShort(reminder.description, 80));
  const body = pieces.length > 0 ? pieces.join(' • ') : 'Tap to view appointment details.';
  return { title, body };
}

/**
 * Default generic template
 */
function genericTemplate(reminder) {
  const title = reminder.title || 'Reminder';
  const body = reminder.description ? truncateShort(reminder.description) : 'Tap to view details.';
  // prepend a gentle greeting when we can
  const greeting = greetingForIso(reminder.reminder_time);
  return { title: `${greeting} — ${title}`, body };
}

/**
 * Register built-in defaults
 */
templates['medications'] = medicationTemplate;
templates['appointments'] = appointmentTemplate;
templates['default'] = genericTemplate;

/**
 * Public: register or override a template for a category.
 * - name: string (category name)
 * - fn: function(reminder) => { title, body }
 */
export function registerTemplate(name, fn) {
  if (!name || typeof fn !== 'function') {
    throw new Error('registerTemplate: invalid arguments');
  }
  templates[name] = fn;
}

/**
 * Render notification text for a reminder object.
 * - Tries category-specific template, falls back to 'default'.
 * - Returns { title, body } where both are strings.
 */
export function renderNotificationText(reminder = {}) {
  try {
    const category = (reminder.category || reminder.type || 'default') || 'default';
    const key = typeof category === 'string' ? category.toLowerCase() : 'default';
    const renderer = templates[key] || templates['default'];
    const out = renderer(reminder);
    // ensure strings
    return {
      title: out && out.title ? String(out.title) : 'Reminder',
      body: out && out.body ? String(out.body) : '',
    };
  } catch (err) {
    // Fallback safe output
    return {
      title: reminder.title || 'Reminder',
      body: reminder.description || '',
    };
  }
}

/**
 * Export the templates map for introspection / testing.
 */
export function _getTemplates() {
  return { ...templates };
}

export default {
  renderNotificationText,
  registerTemplate,
  _getTemplates,
};