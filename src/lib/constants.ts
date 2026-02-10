/**
 * Application constants
 * Centralized configuration values that can be easily adjusted
 */

/**
 * Auto-refresh interval for inventory data (in milliseconds)
 * Default: 2 minutes (120000ms) - 2 minute
 * Adjust this value to change how often the inventory auto-refreshes
 */
export const AUTO_REFRESH_INTERVAL_MS = 120000; // 2 minutes

/**
 * Default state for auto-refresh toggle
 * Set to false to reduce server requests by default
 */
export const AUTO_REFRESH_DEFAULT_ENABLED = false;
