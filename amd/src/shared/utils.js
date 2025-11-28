/**
 * @fileoverview Shared utilities between extension-detector and tracking modules
 * @module quizaccess_cheatdetect/shared/utils
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([], function() {
    'use strict';

    /**
     * Generate a reliable timestamp with timezone information
     * @function generateTimestamp
     * @returns {Object} Object containing Unix timestamp and timezone
     * @property {number} unix - Unix timestamp in milliseconds
     * @property {string} timezone - User's local timezone
     * @example
     * const timestamp = generateTimestamp();
     * // { unix: 1640995200000, timezone: "Europe/Paris" }
     * @since 1.0.0
     */
    var generateTimestamp = function() {
        return {
            unix: Date.now(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    };

    /**
     * Fetch with custom timeout
     * @function fetchWithTimeout
     * @param {string} url - URL to fetch
     * @param {number} [timeout=5000] - Timeout in milliseconds
     * @returns {Promise<Object>} Promise resolving with fetch result
     * @property {boolean} success - Indicates if request succeeded
     * @property {number} [status] - HTTP status code if successful
     * @property {Response} [response] - Response object if successful
     * @property {string} [error] - Error message if failed
     * @example
     * fetchWithTimeout('https://example.com/api', 3000)
     *   .then(result => {
     *     if (result.success) {
     *       return result.response.json();
     *     }
     *   });
     * @since 1.0.0
     */
    var fetchWithTimeout = function(url, timeout) {
        timeout = timeout || 5000;

        return new Promise(function(resolve) {
            var controller = new AbortController();
            var timeoutId = setTimeout(function() {
                controller.abort();
            }, timeout);

            fetch(url, { signal: controller.signal })
                .then(function(response) {
                    clearTimeout(timeoutId);
                    resolve({
                        success: response.ok,
                        status: response.status,
                        response: response.ok ? response : null
                    });
                })
                .catch(function(error) {
                    clearTimeout(timeoutId);
                    resolve({
                        success: false,
                        error: error.name === 'AbortError' ? 'Timeout' : error.message
                    });
                });
        });
    };

    return {
        generateTimestamp: generateTimestamp,
        fetchWithTimeout: fetchWithTimeout
    };
});
