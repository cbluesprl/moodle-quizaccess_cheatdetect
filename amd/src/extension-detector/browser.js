/**
 * @fileoverview Gestionnaire de navigateur pour la vérification des fichiers d'extension
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
     * @property {string} file - Nom du fichier vérifié
     * @property {boolean} success - Succès de la vérification
     * @property {boolean} detected - Fichier détecté avec succès
     * @property {string} [reason] - Raison du résultat
     * @property {string} [error] - Message d'erreur si échec
     * @property {number} [contentLength] - Taille du contenu si disponible
     * @property {boolean} [skipped] - Fichier ignoré (requête dupliquée)
     */

    /**
     * @typedef {Object} AnalysisResult
     * @property {boolean} success - Succès de l'analyse globale
     * @property {number} totalFiles - Nombre total de fichiers vérifiés
     * @property {number} successfulChecks - Nombre de vérifications réussies
     * @property {number} detectedFiles - Nombre de fichiers détectés
     * @property {number} failedChecks - Nombre de vérifications échouées
     * @property {boolean} detected - Au moins un fichier détecté
     * @property {FileCheckResult[]} results - Résultats détaillés
     * @property {string[]} evidence - Liste des fichiers détectés (preuves)
     */

    /**
     * Constructeur du gestionnaire de navigateur
     * @class BrowserHandler
     * @example
     * const handler = new BrowserHandler();
     * @since 1.0.0
     */
    var BrowserHandler = function() {
        this.activeRequests = new Set();
    };

    /**
     * Vérifie les fichiers d'extension spécifiés
     * @memberof BrowserHandler
     * @function checkFiles
     * @param {string} extensionPath - Chemin de base de l'extension
     * @param {Object.<string, string[]>} filesToCheck - Fichiers à vérifier avec leurs motifs de contenu
     * @returns {Promise<AnalysisResult>} Promesse qui résout avec les résultats d'analyse
     * @example
     * handler.checkFiles('chrome-extension://abc123', {
     *   'manifest.json': ['"name"', '"version"'],
     *   'script.js': ['crowdly']
     * }).then(result => {
     *   if (result.detected) console.log('Extension détectée!');
     * });
     * @since 1.0.0
     */
    BrowserHandler.prototype.checkFiles = function(extensionPath, filesToCheck) {
        var self = this;

        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Vérification de ' + Object.keys(filesToCheck).length + ' fichiers');
        }

        return this._checkMultipleFiles(extensionPath, filesToCheck)
            .then(function(results) {
                return self._analyzeResults(results);
            });
    };

    /**
     * Extrait l'ID d'extension du contenu
     * @memberof BrowserHandler
     * @function extractExtensionId
     * @param {string} content - Contenu à analyser
     * @returns {string|null} URL d'extension extraite ou null
     * @example
     * const id = handler.extractExtensionId('chrome-extension://abc123/script.js');
     * // "chrome-extension://abc123"
     * @since 1.0.0
     */
    BrowserHandler.prototype.extractExtensionId = function(content) {
        if (!content) return null;

        var match = content.match(Config.EXTENSION_URL_REGEX);
        return match ? match[0] : null;
    };

    /**
     * Vérifie si le chemin d'extension est accessible
     * @memberof BrowserHandler
     * @function isExtensionAccessible
     * @param {string} extensionPath - Chemin de l'extension à vérifier
     * @returns {Promise<boolean>} Promesse qui résout avec true si accessible
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
     * Vérifie plusieurs fichiers en parallèle
     * @memberof BrowserHandler
     * @function _checkMultipleFiles
     * @param {string} extensionPath - Chemin de base de l'extension
     * @param {Object.<string, string[]>} filesToCheck - Fichiers à vérifier
     * @returns {Promise<FileCheckResult[]>} Promesse avec les résultats de tous les fichiers
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
     * Vérifie un seul fichier avec validation de contenu
     * @memberof BrowserHandler
     * @function _checkSingleFile
     * @param {string} extensionPath - Chemin de base de l'extension
     * @param {string} fileName - Nom du fichier à vérifier
     * @param {string[]} contentChecks - Motifs à rechercher dans le contenu
     * @returns {Promise<FileCheckResult>} Promesse avec le résultat de vérification
     * @private
     * @since 1.0.0
     */
    BrowserHandler.prototype._checkSingleFile = function(extensionPath, fileName, contentChecks) {
        var self = this;
        var fileUrl = extensionPath + '/' + fileName;
        var requestId = extensionPath + ':' + fileName;

        // Éviter les requêtes dupliquées
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

                // Si aucune validation de contenu nécessaire, l'existence du fichier suffit
                if (!contentChecks || contentChecks.length === 0) {
                    return {
                        file: fileName,
                        success: true,
                        detected: true,
                        reason: 'Le fichier existe'
                    };
                }

                // Valider le contenu du fichier
                return fetchResult.response.text().then(function(content) {
                    var detected = self._validateContent(content, contentChecks);

                    return {
                        file: fileName,
                        success: true,
                        detected: detected,
                        reason: detected ? 'Validation du contenu réussie' : 'Validation du contenu échouée',
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
     * Valide le contenu du fichier contre les motifs spécifiés
     * @memberof BrowserHandler
     * @function _validateContent
     * @param {string} content - Contenu du fichier
     * @param {string[]} patterns - Motifs à rechercher
     * @returns {boolean} True si au moins un motif est trouvé
     * @private
     * @since 1.0.0
     */
    BrowserHandler.prototype._validateContent = function(content, patterns) {
        if (!content || !patterns || patterns.length === 0) return false;

        // Vérifier si un motif est trouvé dans le contenu
        return patterns.some(function(pattern) {
            return content.includes(pattern);
        });
    };

    /**
     * Analyse les résultats de vérification des fichiers
     * @memberof BrowserHandler
     * @function _analyzeResults
     * @param {FileCheckResult[]} results - Résultats bruts de vérification
     * @returns {AnalysisResult} Analyse consolidée des résultats
     * @private
     * @since 1.0.0
     */
    BrowserHandler.prototype._analyzeResults = function(results) {
        var successful = results.filter(function(r) { return r.success; });
        var detected = results.filter(function(r) { return r.detected; });
        var failed = results.filter(function(r) { return !r.success; });

        // Logger les résultats pour le débogage
        if (Config.SETTINGS.enableLogging) {
            if (detected.length > 0) {
                var detectedFiles = detected.map(function(r) { return r.file; }).join(', ');
                console.log('🧩 Extension Detector: Fichiers détectés - ' + detectedFiles);
            }

            if (failed.length > 0) {
                var failedFiles = failed.map(function(r) { return r.file; }).join(', ');
                console.warn('🧩 Extension Detector: Vérifications de fichiers échouées - ' + failedFiles);
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
     * Nettoie les requêtes actives
     * @memberof BrowserHandler
     * @function cleanup
     * @example
     * handler.cleanup();
     * @since 1.0.0
     */
    BrowserHandler.prototype.cleanup = function() {
        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Nettoyage de ' + this.activeRequests.size + ' requêtes actives');
        }
        this.activeRequests.clear();
    };

    return {
        BrowserHandler: BrowserHandler
    };
});