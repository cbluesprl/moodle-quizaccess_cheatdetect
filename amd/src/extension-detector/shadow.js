/**
 * @fileoverview Shadow DOM monitor for extension element detection
 * @module quizaccess_cheatdetect/extension-detector/shadow
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([
    'quizaccess_cheatdetect/extension-detector/config'
], function(Config) {
    'use strict';

    /**
     * @typedef {Object} ElementInfo
     * @property {string} DOM - Element outer HTML
     * @property {string|null} shadowDOM - Shadow DOM HTML if present
     * @property {string} detection - Detection method used
     */

    /**
     * @typedef {Object} ShadowMonitorState
     * @property {boolean} hasDetectedElements - At least one element detected
     * @property {number} totalDetections - Total number of detections
     */

    /**
     * Shadow DOM monitor constructor
     * @class ShadowMonitor
     * @param {Function} onDetected - Callback called when extension is detected
     * @example
     * const monitor = new ShadowMonitor((key, ext, method) => {
     *   console.log('Extension detected:', ext.name);
     * });
     * @since 1.0.0
     */
    var ShadowMonitor = function(onDetected) {
        this.onDetected = onDetected;
        this.onExtensionIdDetected = null; // Callback for ID detection
        this.observers = new Map();
        this.processedShadowRoots = new WeakSet();
        this.detectedExtensions = new Set();
        this.detectedExtensionIds = new Set(); // To avoid duplicate ID detections
        this.isActive = false;
        this.scanInterval = null;
        this.metricsManager = null;

        // Simple metrics state
        this.metricsState = {
            hasDetectedElements: false,
            totalDetections: 0
        };
    };

    /**
     * Set the metrics manager reference
     * @memberof ShadowMonitor
     * @function setMetricsManager
     * @param {Object} metricsManager - Metrics manager instance
     * @example
     * monitor.setMetricsManager(metricsManagerInstance);
     * @since 1.0.0
     */
    ShadowMonitor.prototype.setMetricsManager = function(metricsManager) {
        this.metricsManager = metricsManager;
    };

    /**
     * Set the callback for extension ID detection
     * @memberof ShadowMonitor
     * @function setExtensionIdDetectedCallback
     * @param {Function} callback - Callback called when extension ID is detected
     * @example
     * monitor.setExtensionIdDetectedCallback((extensionKey, extensionId, extensionPath) => {
     *   console.log('ID detected:', extensionId);
     * });
     * @since 1.0.0
     */
    ShadowMonitor.prototype.setExtensionIdDetectedCallback = function(callback) {
        this.onExtensionIdDetected = callback;
    };

    /**
     * Start DOM and Shadow DOM monitoring
     * @memberof ShadowMonitor
     * @function start
     * @throws {Error} If startup fails
     * @example
     * monitor.start();
     * @since 1.0.0
     */
    ShadowMonitor.prototype.start = function() {
        if (this.isActive) {
            return;
        }

        this.isActive = true;

        try {
            this._scanAllElements();
            this._createObserver();
            this._startPeriodicScan();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('🧩 Extension Detector: Failed to start monitoring', error);
            this.isActive = false;
        }
    };

    /**
     * Start periodic element scanning
     * @memberof ShadowMonitor
     * @function _startPeriodicScan
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._startPeriodicScan = function() {
        var self = this;

        this.scanInterval = setInterval(function() {
            if (!self.isActive) {
                return;
            }
            self._scanAllElements();
        }, 1000);
    };

    /**
     * Scan all document elements
     * @memberof ShadowMonitor
     * @function _scanAllElements
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._scanAllElements = function() {
        try {
            var allElements = document.querySelectorAll('*');

            for (var i = 0; i < allElements.length; i++) {
                var element = allElements[i];

                this._checkAndProcessElement(element, 'periodicScan');

                if (element.shadowRoot && !this.processedShadowRoots.has(element.shadowRoot)) {
                    this._handleShadowRoot(element);
                }
            }
        } catch (error) {
            if (Config.SETTINGS.enableLogging) {
                // eslint-disable-next-line no-console
                console.warn('🧩 Extension Detector: Error during periodic scan', error);
            }
        }
    };

    /**
     * Create a MutationObserver to monitor DOM changes
     * @memberof ShadowMonitor
     * @function _createObserver
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._createObserver = function() {
        var self = this;

        var observer = new MutationObserver(function(mutations) {
            if (!self.isActive) {
                return;
            }

            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            self._checkAndProcessElement(node, 'mutationObserver');

                            if (node.querySelectorAll) {
                                var children = node.querySelectorAll('*');
                                for (var i = 0; i < children.length; i++) {
                                    self._checkAndProcessElement(children[i], 'mutationObserver');
                                }
                            }

                            if (node.shadowRoot) {
                                self._handleShadowRoot(node);
                            }
                        }
                    });
                }

                if (mutation.type === 'attributes') {
                    var target = mutation.target;
                    if (target && target.nodeType === Node.ELEMENT_NODE) {
                        self._checkAndProcessElement(target, 'attributeChange');
                    }
                }
            });
        });

        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true
        });

        this.observers.set('main', observer);
    };

    /**
     * Check and process an element to detect extensions
     * @memberof ShadowMonitor
     * @function _checkAndProcessElement
     * @param {Element} element - Element to check
     * @returns {boolean} True if an extension was detected
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._checkAndProcessElement = function(element) {
        if (!element) {
            return false;
        }

        var extensions = Config.getAllExtensions();

        for (var i = 0; i < extensions.length; i++) {
            var extension = extensions[i];

            if (this._detectExtensionElement(element, extension)) {
                this._processDetectedElement(extension.key, element);
                return true;
            }
        }

        return false;
    };

    /**
     * Detect if an element belongs to an extension
     * @memberof ShadowMonitor
     * @function _detectExtensionElement
     * @param {Element} element - Element to analyze
     * @param {Object} extension - Extension configuration
     * @returns {boolean} True if element belongs to the extension
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._detectExtensionElement = function(element, extension) {
        if (!extension) {
            return false;
        }

        // SECURITY: Never try to remove critical elements
        if (element === document.body || element === document.documentElement ||
            element.tagName === 'BODY' || element.tagName === 'HTML' || element.tagName === 'HEAD') {
            return false;
        }

        // 1. First check by extension ID (static or dynamic)
        if (this._containsAnyExtensionId(element, extension)) {
            return true;
        }

        // 2. Detect by keywords/id/class and extract extension ID if found
        var detectedByPattern = false;

        if (extension.textKeywords && element.textContent) {
            for (var k = 0; k < extension.textKeywords.length; k++) {
                var keyword = extension.textKeywords[k];
                if (element.textContent.includes(keyword)) {
                    detectedByPattern = true;
                    break;
                }
            }
        }

        if (!detectedByPattern && extension.patterns.ids && element.id) {
            var elementId = element.id.toLowerCase();
            for (var j = 0; j < extension.patterns.ids.length; j++) {
                var pattern = extension.patterns.ids[j].toLowerCase();
                if (elementId.includes(pattern)) {
                    detectedByPattern = true;
                    break;
                }
            }
        }

        if (!detectedByPattern && extension.patterns.classes && element.className) {
            var className = element.className.toLowerCase();
            for (var i = 0; i < extension.patterns.classes.length; i++) {
                var classPattern = extension.patterns.classes[i].toLowerCase();
                if (className.includes(classPattern)) {
                    detectedByPattern = true;
                    break;
                }
            }
        }

        // If detected by pattern, try to extract extension ID
        if (detectedByPattern) {
            this._extractAndStoreExtensionId(element, extension);
            return true;
        }

        return false;
    };

    /**
     * Process a detected element (logging and removal)
     * @memberof ShadowMonitor
     * @function _processDetectedElement
     * @param {string} extensionKey - Extension key
     * @param {Element} element - Detected element
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._processDetectedElement = function(extensionKey, element) {
        this.metricsState.totalDetections++;

        // Extract element information
        var elementInfo = this._extractElementInfo(element);

        // Log detection (ALWAYS)
        if (this.metricsManager) {
            this.metricsManager.logDetectedElement(extensionKey, elementInfo);

            if (Config.SETTINGS.enableLogging) {

                console.log('🧩 Extension Detector: 🚨 ' + extensionKey + ' : element detected', elementInfo);
            }
        }

        // Try to remove if setting allows
        if (Config.SETTINGS.removeDetectedElements) {
            var removed = this._tryRemoveElement(element);

            if (removed) {
                if (Config.SETTINGS.enableLogging) {

                    // Console.log('🧩 Extension Detector: ✅ ' + extensionKey + ' : element removed', elementInfo);
                }
            } else {
                if (Config.SETTINGS.enableLogging) {
                    // eslint-disable-next-line no-console
                    console.log('🧩 Extension Detector: ❌ ' + extensionKey +
                        ' - element removal failed', elementInfo);
                }
            }
        }

        // FIX: ALWAYS notify on first detection
        // even if startDetection = false in backend params
        if (!this.detectedExtensions.has(extensionKey)) {
            this.detectedExtensions.add(extensionKey);
            if (this.onDetected) {
                var extensionConfig = Config.getExtension(extensionKey);
                this.onDetected(extensionKey, extensionConfig, 'DOM detection');
            }
        }
    };

    /**
     * Extract relevant information from a detected element
     * @memberof ShadowMonitor
     * @function _extractElementInfo
     * @param {Element} element - Element to analyze
     * @returns {ElementInfo} Information extracted from the element
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._extractElementInfo = function(element) {
        var method = '';

        // Determine method based on what triggered detection
        var extensions = Config.getAllExtensions();
        for (var i = 0; i < extensions.length; i++) {
            var extension = extensions[i];
            if (this._containsAnyExtensionId(element, extension)) {
                // Extract just the extension ID found in the element
                var outerHTML = element.outerHTML;
                var shadowHTML = element.shadowRoot ? element.shadowRoot.innerHTML : '';
                var combinedHTML = outerHTML + shadowHTML;
                var match = combinedHTML.match(Config.EXTENSION_URL_REGEX);
                if (match && match[2]) {
                    method = 'Browser extension found by extension ID: ' + match[2];
                } else {
                    method = 'Browser extension found';
                }
                break;
            } else if (extension.textKeywords && element.textContent) {
                var found = false;
                for (var l = 0; l < extension.textKeywords.length; l++) {
                    if (element.textContent.includes(extension.textKeywords[l])) {
                        method = 'Text keyword found: ' + extension.textKeywords[l];
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            } else if (extension.patterns.ids && element.id) {
                var elementId = element.id.toLowerCase();
                for (var j = 0; j < extension.patterns.ids.length; j++) {
                    var pattern = extension.patterns.ids[j].toLowerCase();
                    if (elementId.includes(pattern)) {
                        method = 'ID found: ' + pattern;
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            } else if (extension.patterns.classes && element.className) {
                var className = element.className.toLowerCase();
                for (var k = 0; k < extension.patterns.classes.length; k++) {
                    var classPattern = extension.patterns.classes[k].toLowerCase();
                    if (className.includes(classPattern)) {
                        method = 'Class found: ' + classPattern;
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
        }

        return {
            DOM: element.outerHTML,
            shadowDOM: element.shadowRoot ? element.shadowRoot.innerHTML : null,
            detection: method
        };
    };

    /**
     * Try to safely remove an element
     * @memberof ShadowMonitor
     * @function _tryRemoveElement
     * @param {Element} element - Element to remove
     * @returns {boolean} True if removal succeeded
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._tryRemoveElement = function(element) {
        if (!element ||
            element === document.body ||
            element === document.documentElement ||
            element.tagName === 'BODY' ||
            element.tagName === 'HTML' ||
            element.tagName === 'HEAD') {
            return false;
        }

        try {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                return true;
            } else if (element.remove) {
                element.remove();
                return true;
            }
        } catch (error) {
            // Silent failure
        }
        return false;
    };

    /**
     * Check if element contains an extension ID (static or dynamic)
     * @memberof ShadowMonitor
     * @function _containsAnyExtensionId
     * @param {Element} element - Element to check
     * @param {Object} extension - Extension configuration
     * @returns {boolean} True if an extension ID is found
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._containsAnyExtensionId = function(element, extension) {
        var allIds = Config.getAllExtensionIds(extension.key);
        if (!allIds || allIds.length === 0) {
            return false;
        }

        var outerHTML = element.outerHTML;
        var shadowHTML = element.shadowRoot ? element.shadowRoot.innerHTML : '';
        var combinedHTML = outerHTML + shadowHTML;

        // Check with regex to detect extension URLs
        var match = combinedHTML.match(Config.EXTENSION_URL_REGEX);
        if (!match) {
            return false;
        }

        var foundExtensionId = match[2]; // ID extracted from regex

        // Check if found ID matches one of configured IDs (static or dynamic)
        return allIds.indexOf(foundExtensionId) !== -1;
    };

    /**
     * Extract extension ID from element content and store it
     * @memberof ShadowMonitor
     * @function _extractAndStoreExtensionId
     * @param {Element} element - Element to analyze
     * @param {Object} extension - Extension configuration
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._extractAndStoreExtensionId = function(element, extension) {
        var outerHTML = element.outerHTML;
        var shadowHTML = element.shadowRoot ? element.shadowRoot.innerHTML : '';
        var combinedHTML = outerHTML + shadowHTML;

        // Search all extension URL occurrences
        var regex = new RegExp(Config.EXTENSION_URL_REGEX, 'g');
        var match;

        while ((match = regex.exec(combinedHTML)) !== null) {
            var extensionProtocol = match[1]; // chrome-extension:// or moz-extension://
            var extensionId = match[2];
            var extensionPath = extensionProtocol + extensionId;

            // Avoid processing the same ID multiple times
            if (this.detectedExtensionIds.has(extensionPath)) {
                continue;
            }

            this.detectedExtensionIds.add(extensionPath);

            // Add ID to configuration
            var added = Config.addDetectedExtensionId(extension.key, extensionId);

            if (added && Config.SETTINGS.enableLogging) {
                // eslint-disable-next-line no-console
                console.log('🧩 Extension Detector: New extension ID extracted for ' +
                    extension.name + ': ' + extensionId);
            }

            // Notify main detector to remove all elements with this ID
            if (this.onExtensionIdDetected && added) {
                this.onExtensionIdDetected(extension.key, extensionId);
            }
        }
    };

    /**
     * Check extension ID with multi-browser regex (legacy)
     * @memberof ShadowMonitor
     * @function _containsSpecificExtensionId
     * @param {Element} element - Element to check
     * @param {Object} extension - Extension configuration
     * @returns {boolean} True if extension ID is found
     * @private
     * @deprecated Use _containsAnyExtensionId instead
     * @since 1.0.0
     */
    ShadowMonitor.prototype._containsSpecificExtensionId = function(element, extension) {
        return this._containsAnyExtensionId(element, extension);
    };

    /**
     * Handle a detected Shadow Root
     * @memberof ShadowMonitor
     * @function _handleShadowRoot
     * @param {Element} element - Element containing the Shadow Root
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._handleShadowRoot = function(element) {
        var shadowRoot = element.shadowRoot;
        if (this.processedShadowRoots.has(shadowRoot)) {
            return;
        }

        this.processedShadowRoots.add(shadowRoot);
        this._observeShadowRoot(shadowRoot);
        this._scanShadowRoot(shadowRoot);
    };

    /**
     * Observe changes in a Shadow Root
     * @memberof ShadowMonitor
     * @function _observeShadowRoot
     * @param {ShadowRoot} shadowRoot - Shadow Root to observe
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._observeShadowRoot = function(shadowRoot) {
        if (this.observers.has(shadowRoot)) {
            return;
        }

        var self = this;
        var shadowObserver = new MutationObserver(function(mutations) {
            if (!self.isActive) {
                return;
            }

            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            self._checkAndProcessElement(node, 'shadowDOM');
                        }
                    });
                }
            });
        });

        shadowObserver.observe(shadowRoot, {
            childList: true,
            subtree: true,
            attributes: true
        });

        this.observers.set(shadowRoot, shadowObserver);
    };

    /**
     * Scan all elements in a Shadow Root
     * @memberof ShadowMonitor
     * @function _scanShadowRoot
     * @param {ShadowRoot} shadowRoot - Shadow Root to scan
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._scanShadowRoot = function(shadowRoot) {
        try {
            var elements = shadowRoot.querySelectorAll('*');
            for (var i = 0; i < elements.length; i++) {
                this._checkAndProcessElement(elements[i], 'shadowDOM');
            }
        } catch (error) {
            // Silent failure
        }
    };

    /**
     * Stop monitoring
     * @memberof ShadowMonitor
     * @function stop
     * @example
     * monitor.stop();
     * @since 1.0.0
     */
    ShadowMonitor.prototype.stop = function() {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;

        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        this._cleanup();
    };

    /**
     * Cleanup used resources
     * @memberof ShadowMonitor
     * @function _cleanup
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._cleanup = function() {
        this.observers.forEach(function(observer) {
            try {
                observer.disconnect();
            } catch (error) {
                // Silent failure
            }
        });

        this.observers.clear();
        this.processedShadowRoots = new WeakSet();
        this.detectedExtensions.clear();
    };

    /**
     * Reset monitor state
     * @memberof ShadowMonitor
     * @function reset
     * @example
     * monitor.reset();
     * @since 1.0.0
     */
    ShadowMonitor.prototype.reset = function() {
        this.detectedExtensions.clear();
        this.detectedExtensionIds.clear();
        this.metricsState = {
            hasDetectedElements: false,
            totalDetections: 0
        };
    };

    return {
        ShadowMonitor: ShadowMonitor
    };
});
