/**
 * @fileoverview Configuration for extension detection
 * @module quizaccess_cheatdetect/extension-detector/config
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([], function() {
    'use strict';

    /**
     * @typedef {Object} ExtensionConfig
     * @property {string} name - Display name of the extension
     * @property {Object.<string, string>} extensionIds - Extension IDs per browser
     * @property {string[]} textKeywords - Keywords to search in text content
     * @property {Object.<string, string[]>} files - Extension files to check
     * @property {PatternConfig} patterns - HTML attribute patterns
     */

    /**
     * @typedef {Object} PatternConfig
     * @property {string[]} ids - Element ID patterns
     * @property {string[]} classes - CSS class patterns
     */

    /**
     * @typedef {Object} SettingsConfig
     * @property {number} shadowDOMCheckDelay - Shadow DOM check delay (ms)
     * @property {number} fileCheckTimeout - File check timeout (ms)
     * @property {boolean} removeDetectedElements - Remove detected elements
     * @property {boolean} enableLogging - Enable debug logging
     */

    /**
     * Extension detection configurations
     * @type {Object.<string, ExtensionConfig>}
     * @readonly
     */
    var EXTENSIONS = {
        crowdly: {
            key: 'crowdly',
            name: 'Crowdly – AI Study Assistant for Moodle',

            // Dynamically detected extension IDs (filled at runtime during detection)
            detectedIds: [],

            // Keywords to search in text content
            textKeywords: ['crowdly.sh/', 'AI Magic'],

            // HTML attribute patterns
            patterns: {
                // Element ID patterns
                ids: ['crowd'],

                // CSS class patterns
                classes: ['crowd']
            }
        }
    };

    /**
     * Detection settings
     * @type {SettingsConfig}
     * @readonly
     */
    var SETTINGS = {
        shadowDOMCheckDelay: 1000,
        fileCheckTimeout: 5000,
        removeDetectedElements: true,
        enableLogging: true
    };

    /**
     * Regular expression to detect multi-browser extension URLs
     * @type {RegExp}
     * @readonly
     */
    var EXTENSION_URL_REGEX = /(chrome-extension:\/\/|moz-extension:\/\/)([a-z0-9-]+)/;

    /**
     * Get extension configuration by key
     * @function getExtension
     * @param {string} key - Extension key
     * @returns {ExtensionConfig|null} Extension configuration or null if not found
     * @example
     * const crowdlyConfig = getExtension('crowdly');
     * console.log(crowdlyConfig.name); // "Crowdly – AI Study Assistant for Moodle"
     * @since 1.0.0
     */
    var getExtension = function(key) {
        return EXTENSIONS[key] || null;
    };

    /**
     * Get all configured extensions
     * @function getAllExtensions
     * @returns {Array.<ExtensionConfig & {key: string}>} Array of all extensions with their key
     * @example
     * const allExtensions = getAllExtensions();
     * allExtensions.forEach(ext => console.log(ext.key, ext.name));
     * @since 1.0.0
     */
    var getAllExtensions = function() {
        return Object.keys(EXTENSIONS).map(function(key) {
            return Object.assign({key: key}, EXTENSIONS[key]);
        });
    };

    /**
     * Get all dynamically detected extension IDs
     * @function getAllExtensionIds
     * @param {string} extensionKey - Extension key
     * @returns {string[]} Array of all detected extension IDs
     * @example
     * const ids = getAllExtensionIds('crowdly');
     * // ["abc123xyz", "def456ghi"]
     * @since 1.0.0
     */
    var getAllExtensionIds = function(extensionKey) {
        var extension = getExtension(extensionKey);
        if (!extension) {
            return [];
        }

        // Return only dynamically detected IDs
        return extension.detectedIds || [];
    };

    /**
     * Add a dynamically detected extension ID
     * @function addDetectedExtensionId
     * @param {string} extensionKey - Extension key
     * @param {string} extensionId - Extension ID to add
     * @returns {boolean} True if ID was added successfully
     * @example
     * addDetectedExtensionId('crowdly', 'abc123xyz');
     * @since 1.0.0
     */
    var addDetectedExtensionId = function(extensionKey, extensionId) {
        var extension = getExtension(extensionKey);
        if (!extension) {
            return false;
        }

        if (!extension.detectedIds) {
            extension.detectedIds = [];
        }

        // Avoid duplicates
        if (extension.detectedIds.indexOf(extensionId) === -1) {
            extension.detectedIds.push(extensionId);
            if (SETTINGS.enableLogging) {
                // eslint-disable-next-line no-console
                console.log('🧩 Extension Detector: Extension ID added for ' +
                    extensionKey + ': ' + extensionId);
            }
            return true;
        }

        return false;
    };

    /**
     * Check if an extension ID belongs to a configured extension
     * @function matchesExtensionId
     * @param {string} extensionKey - Extension key
     * @param {string} extensionId - Extension ID to check
     * @returns {boolean} True if ID matches the extension
     * @example
     * matchesExtensionId('crowdly', 'abc123xyz');
     * @since 1.0.0
     */
    var matchesExtensionId = function(extensionKey, extensionId) {
        var allIds = getAllExtensionIds(extensionKey);
        return allIds.indexOf(extensionId) !== -1;
    };

    // Public API
    return {
        EXTENSIONS: EXTENSIONS,
        SETTINGS: SETTINGS,
        EXTENSION_URL_REGEX: EXTENSION_URL_REGEX,
        getExtension: getExtension,
        getAllExtensions: getAllExtensions,
        getAllExtensionIds: getAllExtensionIds,
        addDetectedExtensionId: addDetectedExtensionId,
        matchesExtensionId: matchesExtensionId
    };
});
