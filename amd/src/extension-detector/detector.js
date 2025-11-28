/**
 * @fileoverview Main extension detector with metrics manager
 * @module quizaccess_cheatdetect/extension-detector/detector
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([
    'quizaccess_cheatdetect/extension-detector/config',
    'quizaccess_cheatdetect/extension-detector/browser',
    'quizaccess_cheatdetect/extension-detector/shadow',
    'quizaccess_cheatdetect/shared/utils',
    'quizaccess_cheatdetect/extension-detector/metrics-manager'
], function(Config, Browser, Shadow, SharedUtils, MetricsManager) {
    'use strict';

    /**
     * @typedef {Object} ExtensionDetectorState
     * @property {Set<string>} detectedExtensions - Detected extensions
     * @property {Map<string, number>} extensionPaths - Extension paths with timestamp
     * @property {boolean} isRunning - Running state
     */

    /**
     * Main extension detector constructor
     * @class ExtensionDetector
     * @throws {Error} If browser is not supported
     * @example
     * const detector = new ExtensionDetector();
     * detector.start();
     * @since 1.0.0
     */
    var ExtensionDetector = function() {
        var self = this;

        this.browserHandler = new Browser.BrowserHandler();
        this.shadowMonitor = new Shadow.ShadowMonitor(function(extensionKey, extension, method) {
            self._onExtensionDetected(extensionKey, extension, method);
        });

        // Simplified metrics manager
        this.metricsManager = new MetricsManager.MetricsManager();

        // Connect metrics manager to shadow monitor
        this.shadowMonitor.setMetricsManager(this.metricsManager);

        // Connect callback for extension ID detection
        this.shadowMonitor.setExtensionIdDetectedCallback(function(extensionKey, extensionId) {
            // Scan DOM to remove all elements with this ID
            self._scanAndRemoveElementsWithExtensionId(extensionKey, extensionId);
        });

        // Detection state
        this.detectedExtensions = new Set();
        this.isRunning = false;
    };

    /**
     * Start the detection system
     * @memberof ExtensionDetector
     * @function start
     * @throws {Error} If startup fails
     * @example
     * detector.start();
     * @since 1.0.0
     */
    ExtensionDetector.prototype.start = function() {
        if (this.isRunning) {
            if (Config.SETTINGS.enableLogging) {
                // eslint-disable-next-line no-console
                console.warn('🧩 Extension Detector: Already running');
            }
            return;
        }

        this.isRunning = true;

        try {
            // Reset state
            this._resetState();

            // Start Shadow DOM monitoring
            this.shadowMonitor.start();

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('🧩 Extension Detector: Startup failed', error);
            this.isRunning = false;
            throw error;
        }
    };

    /**
     * Stop the detection system
     * @memberof ExtensionDetector
     * @function stop
     * @example
     * detector.stop();
     * @since 1.0.0
     */
    ExtensionDetector.prototype.stop = function() {
        if (!this.isRunning) {
            return;
        }

        if (Config.SETTINGS.enableLogging) {
            // eslint-disable-next-line no-console
            console.log('🧩 Extension Detector: Stopping detection system');
        }
        this.isRunning = false;

        // Stop components
        this.shadowMonitor.stop();
        this.browserHandler.cleanup();

        if (Config.SETTINGS.enableLogging) {
            // eslint-disable-next-line no-console
            console.log('🧩 Extension Detector: Detection system stopped');
        }
    };

    /**
     * Restart the detection system
     * @memberof ExtensionDetector
     * @function restart
     * @example
     * detector.restart();
     * @since 1.0.0
     */
    ExtensionDetector.prototype.restart = function() {
        var self = this;
        if (Config.SETTINGS.enableLogging) {
            // eslint-disable-next-line no-console
            console.log('🧩 Extension Detector: Restarting system');
        }
        this.stop();
        setTimeout(function() {
            self.start();
        }, 1000);
    };

    /**
     * Handle extension detection
     * @memberof ExtensionDetector
     * @function _onExtensionDetected
     * @param {string} extensionKey - Extension key
     * @param {Object} extension - Extension configuration
     * @param {string} method - Detection method used
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._onExtensionDetected = function(extensionKey, extension, method) {
        // Avoid duplicate detections
        if (this.detectedExtensions.has(extensionKey)) {
            return;
        }

        this.detectedExtensions.add(extensionKey);

        if (Config.SETTINGS.enableLogging) {
            // eslint-disable-next-line no-console
            console.log('🚨 Extension Detector: ' + extension.name + ' detected via ' + method);
        }

        // Log detection event
        if (Config.SETTINGS.enableLogging) {
            this._logDetection(extensionKey, extension.name, method);
        }
    };

    /**
     * Scan and remove all DOM elements containing a specific extension ID
     * @memberof ExtensionDetector
     * @function _scanAndRemoveElementsWithExtensionId
     * @param {string} extensionKey - Extension key
     * @param {string} extensionId - Extension ID to search for
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._scanAndRemoveElementsWithExtensionId = function(extensionKey, extensionId) {
        if (!Config.SETTINGS.removeDetectedElements) {
            return;
        }

        if (Config.SETTINGS.enableLogging) {
            // eslint-disable-next-line no-console
            console.log('🧩 Extension Detector: Scanning DOM to remove all elements with extension ID: ' +
                extensionId);
        }

        var removedCount = 0;

        // Scan main DOM
        removedCount += this._scanElementsForExtensionId(document.body, extensionKey, extensionId);

        // Scan all existing Shadow DOMs
        var allElements = document.querySelectorAll('*');
        for (var i = 0; i < allElements.length; i++) {
            var element = allElements[i];
            if (element.shadowRoot) {
                removedCount += this._scanShadowRootForExtensionId(element.shadowRoot, extensionKey, extensionId);
            }
        }

        if (Config.SETTINGS.enableLogging) {
            // eslint-disable-next-line no-console
            console.log('🧩 Extension Detector: ' + removedCount + ' elements removed with extension ID ' + extensionId);
        }
    };

    /**
     * Scan an element and its children for an extension ID and remove them
     * @memberof ExtensionDetector
     * @function _scanElementsForExtensionId
     * @param {Element} rootElement - Root element to scan
     * @param {string} extensionKey - Extension key
     * @param {string} extensionId - Extension ID to search for
     * @returns {number} Number of elements removed
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._scanElementsForExtensionId = function(rootElement, extensionKey, extensionId) {
        if (!rootElement) {
            return 0;
        }

        var removedCount = 0;
        var elementsToRemove = [];

        // Find all elements containing the extension ID
        var allElements = rootElement.querySelectorAll('*');
        for (var i = 0; i < allElements.length; i++) {
            var element = allElements[i];

            // Security: never remove body, html, head
            if (element === document.body || element === document.documentElement ||
                element.tagName === 'BODY' || element.tagName === 'HTML' || element.tagName === 'HEAD') {
                continue;
            }

            if (this._elementContainsExtensionId(element, extensionId)) {
                elementsToRemove.push(element);
            }
        }

        // Remove found elements
        for (var j = 0; j < elementsToRemove.length; j++) {
            var elementToRemove = elementsToRemove[j];
            try {
                // Log element before removal if logging enabled
                if (Config.SETTINGS.enableLogging) {
                    var elementInfo = {
                        tag: elementToRemove.tagName,
                        id: elementToRemove.id || '(no id)',
                        class: elementToRemove.className || '(no class)',
                        html: elementToRemove.outerHTML.substring(0, 200) + '...'
                    };
                    // eslint-disable-next-line no-console
                    console.log('🧩 Extension Detector:   → Element #' + (j + 1) + ' removed:', elementInfo);
                }

                if (elementToRemove.parentNode) {
                    elementToRemove.parentNode.removeChild(elementToRemove);
                    removedCount++;
                } else if (elementToRemove.remove) {
                    elementToRemove.remove();
                    removedCount++;
                }
            } catch (error) {
                // Silent failure
            }
        }

        return removedCount;
    };

    /**
     * Scan a Shadow Root for an extension ID and remove elements
     * @memberof ExtensionDetector
     * @function _scanShadowRootForExtensionId
     * @param {ShadowRoot} shadowRoot - Shadow Root to scan
     * @param {string} extensionKey - Extension key
     * @param {string} extensionId - Extension ID to search for
     * @returns {number} Number of elements removed
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._scanShadowRootForExtensionId = function(shadowRoot, extensionKey, extensionId) {
        if (!shadowRoot) {
            return 0;
        }

        var removedCount = 0;
        var elementsToRemove = [];

        try {
            var allElements = shadowRoot.querySelectorAll('*');
            for (var i = 0; i < allElements.length; i++) {
                var element = allElements[i];

                if (this._elementContainsExtensionId(element, extensionId)) {
                    elementsToRemove.push(element);
                }

                // Recursively scan nested Shadow DOMs
                if (element.shadowRoot) {
                    removedCount += this._scanShadowRootForExtensionId(element.shadowRoot, extensionKey, extensionId);
                }
            }

            // Remove found elements
            for (var j = 0; j < elementsToRemove.length; j++) {
                var elementToRemove = elementsToRemove[j];
                try {
                    // Log element before removal if logging enabled
                    if (Config.SETTINGS.enableLogging) {
                        var elementInfo = {
                            tag: elementToRemove.tagName,
                            id: elementToRemove.id || '(no id)',
                            class: elementToRemove.className || '(no class)',
                            html: elementToRemove.outerHTML.substring(0, 200) + '...',
                            location: 'Shadow DOM'
                        };
                        // eslint-disable-next-line no-console
                        console.log('🧩 Extension Detector:   → Element removed from Shadow DOM:', elementInfo);
                    }

                    if (elementToRemove.parentNode) {
                        elementToRemove.parentNode.removeChild(elementToRemove);
                        removedCount++;
                    } else if (elementToRemove.remove) {
                        elementToRemove.remove();
                        removedCount++;
                    }
                } catch (error) {
                    // Silent failure
                }
            }
        } catch (error) {
            // Silent failure
        }

        return removedCount;
    };

    /**
     * Check if an element contains a specific extension ID
     * @memberof ExtensionDetector
     * @function _elementContainsExtensionId
     * @param {Element} element - Element to check
     * @param {string} extensionId - Extension ID to search for
     * @returns {boolean} True if element contains the extension ID
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._elementContainsExtensionId = function(element, extensionId) {
        if (!element || !extensionId) {
            return false;
        }

        var outerHTML = element.outerHTML;
        var shadowHTML = element.shadowRoot ? element.shadowRoot.innerHTML : '';
        var combinedHTML = outerHTML + shadowHTML;

        // Search for extension ID in HTML
        return combinedHTML.indexOf(extensionId) !== -1;
    };

    /**
     * Reset detection state
     * @memberof ExtensionDetector
     * @function _resetState
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._resetState = function() {
        this.detectedExtensions.clear();
        this.shadowMonitor.reset();
        this.metricsManager.reset();
    };

    /**
     * Get detection statistics with simplified metrics
     * @memberof ExtensionDetector
     * @function getStatistics
     * @returns {Object} Detection statistics
     * @property {number} totalDetections - Total number of detections
     * @property {number} uniquePaths - Number of unique paths
     * @property {number} sessionDetections - Session detections
     * @property {string[]} detectedExtensionsList - List of detected extensions
     * @property {Object|null} lastDetection - Last detection
     * @property {Object} metricsData - Metrics data
     * @example
     * const stats = detector.getStatistics();
     * console.log('Detected extensions:', stats.detectedExtensionsList);
     * @since 1.0.0
     */
    ExtensionDetector.prototype.getStatistics = function() {
        var sessionDetections = [];
        try {
            sessionDetections = JSON.parse(sessionStorage.getItem('extensionDetections') || '[]');
        } catch (error) {
            if (Config.SETTINGS.enableLogging) {
                // eslint-disable-next-line no-console
                console.warn('🧩 Extension Detector: Unable to read session detections', error);
            }
        }

        return {
            totalDetections: this.detectedExtensions.size,
            sessionDetections: sessionDetections.length,
            detectedExtensionsList: Array.from(this.detectedExtensions),
            lastDetection: sessionDetections.length > 0 ? sessionDetections[sessionDetections.length - 1] : null,
            metricsData: this.metricsManager.getData()
        };
    };

    /**
     * Export metrics as JSON
     * @memberof ExtensionDetector
     * @function exportMetricsAsJSON
     * @returns {string} JSON string of metrics
     * @example
     * const jsonMetrics = detector.exportMetricsAsJSON();
     * const metrics = JSON.parse(jsonMetrics);
     * @since 1.0.0
     */
    ExtensionDetector.prototype.exportMetricsAsJSON = function() {
        return this.metricsManager.exportMetricsAsJSON();
    };

    /**
     * Add support for a new extension
     * @memberof ExtensionDetector
     * @function addExtensionSupport
     * @param {string} extensionKey - Extension key
     * @param {string} extensionName - Extension name
     * @example
     * detector.addExtensionSupport('newExt', 'New Extension');
     * @since 1.0.0
     */
    ExtensionDetector.prototype.addExtensionSupport = function(extensionKey, extensionName) {
        if (Config.SETTINGS.enableLogging) {
            // eslint-disable-next-line no-console
            console.log('🧩 Extension Detector: Support added for extension: ' + extensionName);
        }
    };

    /**
     * Get extension configuration
     * @memberof ExtensionDetector
     * @function getExtensionConfig
     * @param {string} extensionKey - Extension key
     * @returns {Object|null} Extension configuration
     * @example
     * const config = detector.getExtensionConfig('crowdly');
     * @since 1.0.0
     */
    ExtensionDetector.prototype.getExtensionConfig = function(extensionKey) {
        return Config.getExtension(extensionKey);
    };

    /**
     * Cleanup resources
     * @memberof ExtensionDetector
     * @function cleanup
     * @example
     * detector.cleanup();
     * @since 1.0.0
     */
    ExtensionDetector.prototype.cleanup = function() {
        if (Config.SETTINGS.enableLogging) {
            // eslint-disable-next-line no-console
            console.log('🧩 Extension Detector: Cleaning up resources');
        }

        this.stop();
    };

    /**
     * Log a detection event
     * @memberof ExtensionDetector
     * @function _logDetection
     * @param {string} extensionKey - Extension key
     * @param {string} extensionName - Extension name
     * @param {string} method - Detection method
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._logDetection = function(extensionKey, extensionName, method) {
        if (!Config.SETTINGS.enableLogging) {
            return;
        }

        var event = {
            timestamp: SharedUtils.generateTimestamp().unix,
            extension: extensionKey,
            extensionName: extensionName,
            method: method,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        try {
            var history = JSON.parse(sessionStorage.getItem('extensionDetections') || '[]');
            history.push(event);
            sessionStorage.setItem('extensionDetections', JSON.stringify(history));
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('🧩 Extension Detector: Unable to save detection event', error);
        }
    };

    return {
        ExtensionDetector: ExtensionDetector
    };
});
