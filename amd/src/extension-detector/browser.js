/**
 * @fileoverview Browser handler for extension file verification
 * @module quizaccess_cheatdetect/extension-detector/browser
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([
    'quizaccess_cheatdetect/extension-detector/config',
    'quizaccess_cheatdetect/shared/utils'
], function(Config, SharedUtils) {
    'use strict';

    /**
     * @typedef {Object} FileCheckResult
     * @property {string} file - Verified file name
     * @property {boolean} success - Verification success
     * @property {boolean} detected - File detected successfully
     * @property {string} [reason] - Result reason
     * @property {string} [error] - Error message if failed
     * @property {number} [contentLength] - Content size if available
     * @property {boolean} [skipped] - File skipped (duplicate request)
     */

    /**
     * @typedef {Object} AnalysisResult
     * @property {boolean} success - Overall analysis success
     * @property {number} totalFiles - Total number of files checked
     * @property {number} successfulChecks - Number of successful checks
     * @property {number} detectedFiles - Number of detected files
     * @property {number} failedChecks - Number of failed checks
     * @property {boolean} detected - At least one file detected
     * @property {FileCheckResult[]} results - Detailed results
     * @property {string[]} evidence - List of detected files (evidence)
     */

    /**
     * Browser handler constructor
     * @class BrowserHandler
     * @example
     * const handler = new BrowserHandler();
     * @since 1.0.0
     */
    var BrowserHandler = function() {
        this.activeRequests = new Set();
    };

    /**
     * Check specified extension files
     * @memberof BrowserHandler
     * @function checkFiles
     * @param {string} extensionPath - Extension base path
     * @param {Object.<string, string[]>} filesToCheck - Files to check with their content patterns
     * @returns {Promise<AnalysisResult>} Promise resolving with analysis results
     * @example
     * handler.checkFiles('chrome-extension://abc123', {
     *   'manifest.json': ['"name"', '"version"'],
     *   'script.js': ['crowdly']
     * }).then(result => {
     *   if (result.detected) console.log('Extension detected!');
     * });
     * @since 1.0.0
     */
    BrowserHandler.prototype.checkFiles = function(extensionPath, filesToCheck) {
        var self = this;

        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Checking ' + Object.keys(filesToCheck).length + ' files');
        }

        return this._checkMultipleFiles(extensionPath, filesToCheck)
            .then(function(results) {
                return self._analyzeResults(results);
            });
    };

    /**
     * Extract extension ID from content
     * @memberof BrowserHandler
     * @function extractExtensionId
     * @param {string} content - Content to analyze
     * @returns {string|null} Extracted extension URL or null
     * @example
     * const id = handler.extractExtensionId('chrome-extension://abc123/script.js');
     * // "chrome-extension://abc123"
     * @since 1.0.0
     */
    BrowserHandler.prototype.extractExtensionId = function(content) {
        if (!content) {
            return null;
        }

        var match = content.match(Config.EXTENSION_URL_REGEX);
        return match ? match[0] : null;
    };

    /**
     * Check if extension path is accessible
     * @memberof BrowserHandler
     * @function isExtensionAccessible
     * @param {string} extensionPath - Extension path to check
     * @returns {Promise<boolean>} Promise resolving with true if accessible
     * @example
     * handler.isExtensionAccessible('chrome-extension://abc123')
     *   .then(accessible => {
     *     if (accessible) console.log('Extension accessible');
     *   });
     * @since 1.0.0
     */
    BrowserHandler.prototype.isExtensionAccessible = function(extensionPath) {
        var manifestUrl = extensionPath + '/manifest.json';
        return SharedUtils.fetchWithTimeout(manifestUrl, 3000)
            .then(function(result) {
                return result.success;
            });
    };

    /**
     * Check multiple files in parallel
     * @memberof BrowserHandler
     * @function _checkMultipleFiles
     * @param {string} extensionPath - Extension base path
     * @param {Object.<string, string[]>} filesToCheck - Files to check
     * @returns {Promise<FileCheckResult[]>} Promise with all file results
     * @private
     * @since 1.0.0
     */
    BrowserHandler.prototype._checkMultipleFiles = function(extensionPath, filesToCheck) {
        var self = this;

        var promises = Object.keys(filesToCheck).map(function(fileName) {
            var contentChecks = filesToCheck[fileName];
            return self._checkSingleFile(extensionPath, fileName, contentChecks);
        });

        return Promise.all(promises);
    };

    /**
     * Check a single file with content validation
     * @memberof BrowserHandler
     * @function _checkSingleFile
     * @param {string} extensionPath - Extension base path
     * @param {string} fileName - File name to check
     * @param {string[]} contentChecks - Patterns to search in content
     * @returns {Promise<FileCheckResult>} Promise with verification result
     * @private
     * @since 1.0.0
     */
    BrowserHandler.prototype._checkSingleFile = function(extensionPath, fileName, contentChecks) {
        var self = this;
        var fileUrl = extensionPath + '/' + fileName;
        var requestId = extensionPath + ':' + fileName;

        // Avoid duplicate requests
        if (this.activeRequests.has(requestId)) {
            return Promise.resolve({ file: fileName, skipped: true });
        }

        this.activeRequests.add(requestId);

        return SharedUtils.fetchWithTimeout(fileUrl, Config.SETTINGS.fileCheckTimeout)
            .then(function(fetchResult) {
                self.activeRequests.delete(requestId);

                if (!fetchResult.success) {
                    return {
                        file: fileName,
                        success: false,
                        error: fetchResult.error,
                        detected: false
                    };
                }

                // If no content validation needed, file existence is enough
                if (!contentChecks || contentChecks.length === 0) {
                    return {
                        file: fileName,
                        success: true,
                        detected: true,
                        reason: 'File exists'
                    };
                }

                // Validate file content
                return fetchResult.response.text().then(function(content) {
                    var detected = self._validateContent(content, contentChecks);

                    return {
                        file: fileName,
                        success: true,
                        detected: detected,
                        reason: detected ? 'Content validation successful' : 'Content validation failed',
                        contentLength: content.length
                    };
                });
            })
            .catch(function(error) {
                self.activeRequests.delete(requestId);
                return {
                    file: fileName,
                    success: false,
                    error: error.message,
                    detected: false
                };
            });
    };

    /**
     * Validate file content against specified patterns
     * @memberof BrowserHandler
     * @function _validateContent
     * @param {string} content - File content
     * @param {string[]} patterns - Patterns to search
     * @returns {boolean} True if at least one pattern is found
     * @private
     * @since 1.0.0
     */
    BrowserHandler.prototype._validateContent = function(content, patterns) {
        if (!content || !patterns || patterns.length === 0) {
            return false;
        }

        // Check if a pattern is found in content
        return patterns.some(function(pattern) {
            return content.includes(pattern);
        });
    };

    /**
     * Analyze file verification results
     * @memberof BrowserHandler
     * @function _analyzeResults
     * @param {FileCheckResult[]} results - Raw verification results
     * @returns {AnalysisResult} Consolidated results analysis
     * @private
     * @since 1.0.0
     */
    BrowserHandler.prototype._analyzeResults = function(results) {
        var successful = results.filter(function(r) { return r.success; });
        var detected = results.filter(function(r) { return r.detected; });
        var failed = results.filter(function(r) { return !r.success; });

        // Log results for debugging
        if (Config.SETTINGS.enableLogging) {
            if (detected.length > 0) {
                var detectedFiles = detected.map(function(r) { return r.file; }).join(', ');
                console.log('🧩 Extension Detector: Files detected - ' + detectedFiles);
            }

            if (failed.length > 0) {
                var failedFiles = failed.map(function(r) { return r.file; }).join(', ');
                console.warn('🧩 Extension Detector: File checks failed - ' + failedFiles);
            }
        }

        return {
            success: true,
            totalFiles: results.length,
            successfulChecks: successful.length,
            detectedFiles: detected.length,
            failedChecks: failed.length,
            detected: detected.length > 0,
            results: results,
            evidence: detected.map(function(r) { return r.file; })
        };
    };

    /**
     * Clean up active requests
     * @memberof BrowserHandler
     * @function cleanup
     * @example
     * handler.cleanup();
     * @since 1.0.0
     */
    BrowserHandler.prototype.cleanup = function() {
        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Cleaning up ' + this.activeRequests.size + ' active requests');
        }
        this.activeRequests.clear();
    };

    return {
        BrowserHandler: BrowserHandler
    };
});
