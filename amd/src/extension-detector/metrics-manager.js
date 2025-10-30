/**
 * @fileoverview Gestionnaire de métriques ultra-simplifié pour la détection d'extensions
 * @module quizaccess_cheatdetect/extension-detector/metrics-manager
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
     * @typedef {Object} DetectedElement
     * @property {string} uid - Identifiant unique de l'élément détecté
     * @property {string} timestamp - Horodatage ISO de la détection
     * @property {string} DOM - HTML externe de l'élément
     * @property {string|null} shadowDOM - HTML du Shadow DOM si présent
     * @property {string} detection - Méthode de détection utilisée
     */

    /**
     * @typedef {Object} ExtensionMetrics
     * @property {DetectedElement[]} detectedElements - Liste des éléments détectés
     */

    /**
     * @typedef {Object} MetricsData
     * @property {Object.<string, ExtensionMetrics>} extensions - Métriques par extension
     */

    /**
     * @typedef {Object} ExportData
     * @property {string} timestamp - Horodatage de l'export
     * @property {Object.<string, Object>} extensionDetection - Données d'export par extension
     */

    /**
     * Constructeur du gestionnaire de métriques
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
     * Enregistre un élément détecté pour une extension
     * @memberof MetricsManager
     * @function logDetectedElement
     * @param {string} extensionKey - Clé de l'extension
     * @param {Object} elementInfo - Informations sur l'élément détecté
     * @param {string} elementInfo.DOM - HTML externe de l'élément
     * @param {string|null} elementInfo.shadowDOM - HTML du Shadow DOM
     * @param {string} elementInfo.detection - Méthode de détection
     * @example
     * manager.logDetectedElement('crowdly', {
     *   DOM: '<div class="crowd-element">...</div>',
     *   shadowDOM: null,
     *   detection: 'Classe trouvée : crowd'
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

        // Copier les propriétés de elementInfo
        for (var key in elementInfo) {
            if (elementInfo.hasOwnProperty(key)) {
                detectedElement[key] = elementInfo[key];
            }
        }

        this.data.extensions[extensionKey].detectedElements.push(detectedElement);
    };

    /**
     * Initialise les données d'extension si nécessaire
     * @memberof MetricsManager
     * @function _initExtension
     * @param {string} extensionKey - Clé de l'extension
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
     * Exporte toutes les données au format JSON
     * @memberof MetricsManager
     * @function exportMetricsAsJSON
     * @returns {string} Chaîne JSON contenant toutes les métriques
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

        // Transformer la structure pour chaque extension
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
     * Réinitialise toutes les données
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
     * Obtient les données actuelles
     * @memberof MetricsManager
     * @function getData
     * @returns {MetricsData} Données actuelles du gestionnaire
     * @example
     * const data = manager.getData();
     * console.log('Extensions suivies:', Object.keys(data.extensions));
     * @since 1.0.0
     */
    MetricsManager.prototype.getData = function() {
        return this.data;
    };

    return {
        MetricsManager: MetricsManager
    };
});