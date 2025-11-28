/**
 * @fileoverview AMD entry point for extension detector with secure exports
 * @module quizaccess_cheatdetect/extension-detector/index
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([
    'quizaccess_cheatdetect/extension-detector/detector'
], function(ExtensionDetector) {
    'use strict';

    /**
     * Private detector instance
     * @type {Object|null}
     * @private
     */
    let detectorInstance = null;

    /**
     * Initialize the extension detection system
     * Called by Moodle via $PAGE->requires->js_call_amd()
     * @function init
     * @param {Object} [backendParams] - Backend parameters (not currently used)
     * @returns {Object|null} Detector instance or null if failed
     * @example
     * // Called from PHP/Moodle
     * ExtensionDetector.init(backendParams);
     * @since 1.0.0
     */
    var init = function(backendParams) { // eslint-disable-line no-unused-vars
        try {
            // Basic prerequisites check
            if (typeof MutationObserver === 'undefined') {
                return null;
            }

            // CRITICAL FIX: Wait for tracking to be ready
            // before starting extension detection
            if (!window._trackingInitialized) {

                // Wait for tracking to be initialized
                const checkTracking = setInterval(() => {
                    if (window._trackingInitialized) {
                        clearInterval(checkTracking);
                        startDetector();
                    }
                }, 100); // Check every 100ms

                // Safety timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkTracking);
                    if (!detectorInstance) {
                        console.warn('🧩 Extension Detector: Timeout, forced start without tracking');
                        startDetector();
                    }
                }, 5000);

                return null;
            } else {
                // Tracking is already ready
                return startDetector();
            }

        } catch (error) {
            console.error('🧩 Extension Detector: Initialization error', error);
            return null;
        }
    };

    /**
     * Start the extension detector
     * @function startDetector
     * @returns {Object|null} Detector instance
     * @private
     */
    function startDetector() {
        try {
            if (detectorInstance) {
                console.log('🧩 Extension Detector: Instance already created');
                return detectorInstance;
            }

            // Create and start detector
            detectorInstance = new ExtensionDetector.ExtensionDetector();
            detectorInstance.start();

            console.log('🧩 Extension Detector: Started successfully');
            return detectorInstance;

        } catch (error) {
            console.error('🧩 Extension Detector: Startup error', error);
            return null;
        }
    }

    /**
     * Get extension metrics as JSON
     * Secure method for other modules to access metrics
     * @function getMetrics
     * @returns {string} JSON string of current metrics or empty object if unavailable
     * @example
     * const metricsJSON = ExtensionDetector.getMetrics();
     * const metrics = JSON.parse(metricsJSON);
     * console.log(metrics.extensionDetection);
     * @since 1.0.0
     */
    var getMetrics = function() {
        if (!detectorInstance) {
            return JSON.stringify({
                timestamp: new Date().toISOString(),
                extensionDetection: {}
            });
        }

        try {
            return detectorInstance.exportMetricsAsJSON();
        } catch (error) {
            return JSON.stringify({
                timestamp: new Date().toISOString(),
                extensionDetection: {},
                error: error.message
            });
        }
    };

    // Public API
    return {
        init: init,
        getMetrics: getMetrics
    };
});
