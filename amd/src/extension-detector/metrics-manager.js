/**
 * @fileoverview Ultra-simplified metrics manager for extension detection
 * @module quizaccess_cheatdetect/extension-detector/metrics-manager
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([
    'quizaccess_cheatdetect/extension-detector/config'
], function(Config) {
    'use strict';

    /**
     * @typedef {Object} DetectedElement
     * @property {string} uid - Unique identifier of detected element
     * @property {string} timestamp - ISO timestamp of detection
     * @property {string} DOM - Element outer HTML
     * @property {string|null} shadowDOM - Shadow DOM HTML if present
     * @property {string} detection - Detection method used
     */

    /**
     * @typedef {Object} ExtensionMetrics
     * @property {DetectedElement[]} detectedElements - List of detected elements
     */

    /**
     * @typedef {Object} MetricsData
     * @property {Object.<string, ExtensionMetrics>} extensions - Metrics per extension
     */

    /**
     * @typedef {Object} ExportData
     * @property {string} timestamp - Export timestamp
     * @property {Object.<string, Object>} extensionDetection - Export data per extension
     */

    /**
     * Metrics manager constructor
     * @class MetricsManager
     * @example
     * const manager = new MetricsManager();
     * @since 1.0.0
     */
    var MetricsManager = function() {
        this.data = {
            extensions: {}
        };

        this._sessionStart = Date.now();
    };

    /**
     * Log a detected element for an extension
     * @memberof MetricsManager
     * @function logDetectedElement
     * @param {string} extensionKey - Extension key
     * @param {Object} elementInfo - Detected element information
     * @param {string} elementInfo.DOM - Element outer HTML
     * @param {string|null} elementInfo.shadowDOM - Shadow DOM HTML
     * @param {string} elementInfo.detection - Detection method
     * @example
     * manager.logDetectedElement('crowdly', {
     *   DOM: '<div class="crowd-element">...</div>',
     *   shadowDOM: null,
     *   detection: 'Class found: crowd'
     * });
     * @since 1.0.0
     */
    MetricsManager.prototype.logDetectedElement = function(extensionKey, elementInfo) {
        this._initExtension(extensionKey);

        var detectedElement = {
            uid: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            extensionKey: extensionKey,
            timestamp: new Date().toISOString()
        };

        // Copy elementInfo properties
        for (var key in elementInfo) {
            if (elementInfo.hasOwnProperty(key)) {
                detectedElement[key] = elementInfo[key];
            }
        }

        this.data.extensions[extensionKey].detectedElements.push(detectedElement);
    };

    /**
     * Initialize extension data if necessary
     * @memberof MetricsManager
     * @function _initExtension
     * @param {string} extensionKey - Extension key
     * @private
     * @since 1.0.0
     */
    MetricsManager.prototype._initExtension = function(extensionKey) {
        if (!this.data.extensions[extensionKey]) {
            this.data.extensions[extensionKey] = {
                detectedElements: []
            };
        }
    };

    /**
     * Export all data as JSON
     * @memberof MetricsManager
     * @function exportMetricsAsJSON
     * @returns {string} JSON string containing all metrics
     * @example
     * const jsonData = manager.exportMetricsAsJSON();
     * const metrics = JSON.parse(jsonData);
     * console.log(metrics.extensionDetection);
     * @since 1.0.0
     */
    MetricsManager.prototype.exportMetricsAsJSON = function() {
        var exportData = {
            timestamp: new Date().toISOString(),
            extensionDetection: {}
        };

        // Transform structure for each extension
        var self = this;
        Object.keys(this.data.extensions).forEach(function(extensionKey) {
            var ext = self.data.extensions[extensionKey];
            var extensionConfig = Config.getExtension(extensionKey);

            exportData.extensionDetection[extensionKey] = {
                name: extensionConfig ? extensionConfig.name : extensionKey,
                detected: ext.detectedElements
            };
        });

        return JSON.stringify(exportData, null, 2);
    };

    /**
     * Reset all data
     * @memberof MetricsManager
     * @function reset
     * @example
     * manager.reset();
     * @since 1.0.0
     */
    MetricsManager.prototype.reset = function() {
        this.data = {
            extensions: {}
        };
        this._sessionStart = Date.now();
    };

    /**
     * Get current data
     * @memberof MetricsManager
     * @function getData
     * @returns {MetricsData} Current manager data
     * @example
     * const data = manager.getData();
     * console.log('Tracked extensions:', Object.keys(data.extensions));
     * @since 1.0.0
     */
    MetricsManager.prototype.getData = function() {
        return this.data;
    };

    return {
        MetricsManager: MetricsManager
    };
});
