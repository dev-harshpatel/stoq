/**
 * Application constants
 * Centralized configuration values that can be easily adjusted
 */

/**
 * Auto-refresh interval for inventory data (in milliseconds)
 * Default: 2 minutes (120000ms)
 * Adjust this value to change how often the inventory auto-refreshes
 */
export const AUTO_REFRESH_INTERVAL_MS = 10000; // 10 seconds

/**
 * Default state for auto-refresh toggle
 * Set to false to reduce server requests by default
 */
export const AUTO_REFRESH_DEFAULT_ENABLED = false;
