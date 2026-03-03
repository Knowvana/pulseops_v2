// ============================================================================
// TimezoneService — PulseOps V2 Shared Service
//
// PURPOSE: Centralized timezone management for the entire platform. Fetches
// the user-configured timezone from General Settings and provides formatting
// utilities that respect the selected timezone.
//
// USAGE:
//   import TimezoneService from '@shared/services/timezoneService';
//   TimezoneService.init();  // Call once at app start
//   TimezoneService.formatTime(isoString); // Format with configured timezone
//   TimezoneService.getTimezone(); // Get current timezone string
//   TimezoneService.setTimezone('Asia/Kolkata'); // Update timezone immediately
//
// ARCHITECTURE: Singleton service. Fetches from /api/general-settings on init.
// Components subscribe to timezone changes via subscribe/unsubscribe pattern.
// ============================================================================
import urls from '@config/urls.json';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

class TimezoneServiceClass {
  constructor() {
    this._timezone = DEFAULT_TIMEZONE;
    this._listeners = new Set();
    this._initialized = false;
  }

  /**
   * Initialize the service by fetching timezone from general settings API
   */
  async init() {
    if (this._initialized) return;
    this._initialized = true;
    try {
      const res = await fetch(urls.generalSettings.get, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data?.timezone) {
        this._timezone = json.data.timezone;
        this._notify();
      }
    } catch {
      // Keep default timezone on error
    }
  }

  /**
   * Get the current configured timezone
   */
  getTimezone() {
    return this._timezone;
  }

  /**
   * Set the timezone immediately (called after saving settings)
   */
  setTimezone(tz) {
    if (tz && tz !== this._timezone) {
      this._timezone = tz;
      this._notify();
    }
  }

  /**
   * Subscribe to timezone changes
   * @param {Function} callback - Called with new timezone string
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Format an ISO timestamp string using the configured timezone
   * @param {string} isoString - ISO date string to format
   * @returns {string} Formatted date/time string
   */
  formatTime(isoString) {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        timeZone: this._timezone,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  }

  /**
   * Get current time formatted in the configured timezone
   * @returns {string} Formatted current time
   */
  formatCurrentTime() {
    return new Date().toLocaleString('en-IN', {
      timeZone: this._timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  /**
   * Get current time as ISO string with timezone offset
   * @returns {string} ISO-like string with timezone offset
   */
  toTimezoneISO() {
    const now = new Date();
    // Use Intl to get the offset for the configured timezone
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: this._timezone,
        timeZoneName: 'shortOffset',
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(p => p.type === 'timeZoneName');
      const offset = offsetPart ? offsetPart.value.replace('GMT', '') : '+00:00';
      // Format: local time in that zone as ISO
      const localStr = now.toLocaleString('sv-SE', { timeZone: this._timezone });
      return localStr.replace(' ', 'T') + (offset || '+00:00');
    } catch {
      return now.toISOString();
    }
  }

  /**
   * Notify all listeners of timezone change
   */
  _notify() {
    this._listeners.forEach(cb => {
      try { cb(this._timezone); } catch { /* ignore listener errors */ }
    });
  }
}

const TimezoneService = new TimezoneServiceClass();
export default TimezoneService;
