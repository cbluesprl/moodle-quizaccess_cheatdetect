/**
 * @fileoverview Détecteur d'extensions principal avec gestionnaire de métriques
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
     * @property {Set<string>} detectedExtensions - Extensions détectées
     * @property {Map<string, number>} extensionPaths - Chemins d'extension avec timestamp
     * @property {boolean} isRunning - État de fonctionnement
     */

    /**
     * Constructeur du détecteur d'extensions principal
     * @class ExtensionDetector
     * @throws {Error} Si le navigateur n'est pas supporté
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

        // Gestionnaire de métriques simplifié
        this.metricsManager = new MetricsManager.MetricsManager();

        // Connexion du gestionnaire de métriques au moniteur shadow
        this.shadowMonitor.setMetricsManager(this.metricsManager);

        // État de détection
        this.detectedExtensions = new Set();
        this.extensionPaths = new Map();
        this.isRunning = false;
    };

    /**
     * Démarre le système de détection
     * @memberof ExtensionDetector
     * @function start
     * @throws {Error} Si le démarrage échoue
     * @example
     * detector.start();
     * @since 1.0.0
     */
    ExtensionDetector.prototype.start = function() {
        if (this.isRunning) {
            if (Config.SETTINGS.enableLogging) {
                console.warn('🧩 Extension Detector: Déjà en cours d\'exécution');
            }
            return;
        }

        this.isRunning = true;

        try {
            // Réinitialiser l'état
            this._resetState();

            // Démarrer la surveillance du Shadow DOM
            this.shadowMonitor.start();

        } catch (error) {
            console.error('🧩 Extension Detector: Échec du démarrage', error);
            this.isRunning = false;
            throw error;
        }
    };

    /**
     * Arrête le système de détection
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
            console.log('🧩 Extension Detector: Arrêt du système de détection');
        }
        this.isRunning = false;

        // Arrêter les composants
        this.shadowMonitor.stop();
        this.browserHandler.cleanup();

        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Système de détection arrêté');
        }
    };

    /**
     * Redémarre le système de détection
     * @memberof ExtensionDetector
     * @function restart
     * @example
     * detector.restart();
     * @since 1.0.0
     */
    ExtensionDetector.prototype.restart = function() {
        var self = this;
        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Redémarrage du système');
        }
        this.stop();
        setTimeout(function() {
            self.start();
        }, 1000);
    };

    /**
     * Gère la détection d'extension
     * @memberof ExtensionDetector
     * @function _onExtensionDetected
     * @param {string} extensionKey - Clé de l'extension
     * @param {Object} extension - Configuration de l'extension
     * @param {string} method - Méthode de détection utilisée
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._onExtensionDetected = function(extensionKey, extension, method) {
        // Éviter les détections dupliquées
        if (this.detectedExtensions.has(extensionKey)) {
 return;
}

        this.detectedExtensions.add(extensionKey);

        if (Config.SETTINGS.enableLogging) {
            console.log('🚨 Extension Detector: ' + extension.name + ' détectée via ' + method);
        }

        // Logger l'événement de détection
        if (Config.SETTINGS.enableLogging) {
            this._logDetection(extensionKey, extension.name, method);
        }
    };

    /**
     * Gère la détection d'ID d'extension
     * @memberof ExtensionDetector
     * @function _onExtensionIdDetected
     * @param {string} extensionPath - Chemin de l'extension
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._onExtensionIdDetected = function(extensionPath) {
        var self = this;

        console.log('extensionPath', extensionPath);
        if (this.extensionPaths.has(extensionPath)) {
 return;
}

        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Chemin d\'extension détecté - ' + extensionPath);
        }
        this.extensionPaths.set(extensionPath, Date.now());

        // Vérifier si l'extension est accessible
        this.browserHandler.isExtensionAccessible(extensionPath)
            .then(function(isAccessible) {
                if (!isAccessible) {
                    if (Config.SETTINGS.enableLogging) {
                        console.warn('🧩 Extension Detector: Extension à ' + extensionPath + ' non accessible');
                    }
                    return;
                }

                // Vérifier les fichiers pour toutes les extensions configurées
                self._checkFilesForAllExtensions(extensionPath);
            });
    };

    /**
     * Vérifie les fichiers d'extension pour toutes les configurations
     * @memberof ExtensionDetector
     * @function _checkFilesForAllExtensions
     * @param {string} extensionPath - Chemin de l'extension
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._checkFilesForAllExtensions = function(extensionPath) {
        var self = this;
        var extensions = Config.getAllExtensions();

        extensions.forEach(function(extension) {
            if (!extension.files || Object.keys(extension.files).length === 0) {
 return;
}

            self.browserHandler.checkFiles(extensionPath, extension.files)
                .then(function(result) {
                    if (result.detected) {
                        self._onExtensionDetected(extension.key, extension, 'fileCheck');
                    }
                })
                .catch(function(error) {
                    if (Config.SETTINGS.enableLogging) {
                        console.error('🧩 Extension Detector: Erreur lors de la vérification des fichiers pour ' + extension.key, error);
                    }
                });
        });
    };

    /**
     * Réinitialise l'état de détection
     * @memberof ExtensionDetector
     * @function _resetState
     * @private
     * @since 1.0.0
     */
    ExtensionDetector.prototype._resetState = function() {
        this.detectedExtensions.clear();
        this.extensionPaths.clear();
        this.shadowMonitor.reset();
        this.metricsManager.reset();
    };

    /**
     * Obtient les statistiques de détection avec métriques simplifiées
     * @memberof ExtensionDetector
     * @function getStatistics
     * @returns {Object} Statistiques de détection
     * @property {number} totalDetections - Nombre total de détections
     * @property {number} uniquePaths - Nombre de chemins uniques
     * @property {number} sessionDetections - Détections de session
     * @property {string[]} detectedExtensionsList - Liste des extensions détectées
     * @property {Object|null} lastDetection - Dernière détection
     * @property {Object} metricsData - Données de métriques
     * @example
     * const stats = detector.getStatistics();
     * console.log('Extensions détectées:', stats.detectedExtensionsList);
     * @since 1.0.0
     */
    ExtensionDetector.prototype.getStatistics = function() {
        var sessionDetections = [];
        try {
            sessionDetections = JSON.parse(sessionStorage.getItem('extensionDetections') || '[]');
        } catch (error) {
            if (Config.SETTINGS.enableLogging) {
                console.warn('🧩 Extension Detector: Impossible de lire les détections de session', error);
            }
        }

        return {
            totalDetections: this.detectedExtensions.size,
            uniquePaths: this.extensionPaths.size,
            sessionDetections: sessionDetections.length,
            detectedExtensionsList: Array.from(this.detectedExtensions),
            lastDetection: sessionDetections.length > 0 ? sessionDetections[sessionDetections.length - 1] : null,
            metricsData: this.metricsManager.getData()
        };
    };

    /**
     * Exporte les métriques au format JSON
     * @memberof ExtensionDetector
     * @function exportMetricsAsJSON
     * @returns {string} Chaîne JSON des métriques
     * @example
     * const jsonMetrics = detector.exportMetricsAsJSON();
     * const metrics = JSON.parse(jsonMetrics);
     * @since 1.0.0
     */
    ExtensionDetector.prototype.exportMetricsAsJSON = function() {
        return this.metricsManager.exportMetricsAsJSON();
    };

    /**
     * Ajoute le support pour une nouvelle extension
     * @memberof ExtensionDetector
     * @function addExtensionSupport
     * @param {string} extensionKey - Clé de l'extension
     * @param {string} extensionName - Nom de l'extension
     * @example
     * detector.addExtensionSupport('newExt', 'Nouvelle Extension');
     * @since 1.0.0
     */
    ExtensionDetector.prototype.addExtensionSupport = function(extensionKey, extensionName) {
        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Support ajouté pour l\'extension: ' + extensionName);
        }
    };

    /**
     * Obtient la configuration d'extension
     * @memberof ExtensionDetector
     * @function getExtensionConfig
     * @param {string} extensionKey - Clé de l'extension
     * @returns {Object|null} Configuration de l'extension
     * @example
     * const config = detector.getExtensionConfig('crowdly');
     * @since 1.0.0
     */
    ExtensionDetector.prototype.getExtensionConfig = function(extensionKey) {
        return Config.getExtension(extensionKey);
    };

    /**
     * Nettoie les ressources
     * @memberof ExtensionDetector
     * @function cleanup
     * @example
     * detector.cleanup();
     * @since 1.0.0
     */
    ExtensionDetector.prototype.cleanup = function() {
        if (Config.SETTINGS.enableLogging) {
            console.log('🧩 Extension Detector: Nettoyage des ressources');
        }

        this.stop();
    };

    /**
     * Enregistre un événement de détection
     * @memberof ExtensionDetector
     * @function _logDetection
     * @param {string} extensionKey - Clé de l'extension
     * @param {string} extensionName - Nom de l'extension
     * @param {string} method - Méthode de détection
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
            console.warn('🧩 Extension Detector: Impossible d\'enregistrer l\'événement de détection', error);
        }
    };

    return {
        ExtensionDetector: ExtensionDetector
    };
});