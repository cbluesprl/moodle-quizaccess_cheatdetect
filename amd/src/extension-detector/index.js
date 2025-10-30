/**
 * @fileoverview Point d'entrée AMD pour le détecteur d'extensions avec exports sécurisés
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
     * Instance privée du détecteur
     * @type {Object|null}
     * @private
     */
    let detectorInstance = null;

    /**
     * Initialise le système de détection d'extensions
     * Appelé par Moodle via $PAGE->requires->js_call_amd()
     * @function init
     * @param {Object} [backendParams] - Paramètres du backend (non utilisé actuellement)
     * @returns {Object|null} Instance du détecteur ou null si échec
     * @example
     * // Appelé depuis PHP/Moodle
     * ExtensionDetector.init(backendParams);
     * @since 1.0.0
     */
    var init = function(backendParams) {
        try {
            // Vérification des prérequis de base
            if (typeof MutationObserver === 'undefined') {
                return null;
            }

            // CORRECTION CRITIQUE: Attendre que le tracking soit prêt
            // avant de démarrer la détection d'extensions
            if (!window._trackingInitialized) {

                // Attendre que le tracking soit initialisé
                const checkTracking = setInterval(() => {
                    if (window._trackingInitialized) {
                        clearInterval(checkTracking);
                        startDetector();
                    }
                }, 100); // Vérifier toutes les 100ms

                // Timeout de sécurité après 5 secondes
                setTimeout(() => {
                    clearInterval(checkTracking);
                    if (!detectorInstance) {
                        console.warn('🧩 Extension Detector: Timeout, démarrage forcé sans tracking');
                        startDetector();
                    }
                }, 5000);

                return null;
            } else {
                // Le tracking est déjà prêt
                return startDetector();
            }

        } catch (error) {
            console.error('🧩 Extension Detector: Erreur d\'initialisation', error);
            return null;
        }
    };

    /**
     * Démarre le détecteur d'extensions
     * @function startDetector
     * @returns {Object|null} Instance du détecteur
     * @private
     */
    function startDetector() {
        try {
            if (detectorInstance) {
                console.log('🧩 Extension Detector: Instance déjà créée');
                return detectorInstance;
            }

            // Création et démarrage du détecteur
            detectorInstance = new ExtensionDetector.ExtensionDetector();
            detectorInstance.start();

            console.log('🧩 Extension Detector: Démarré avec succès');
            return detectorInstance;

        } catch (error) {
            console.error('🧩 Extension Detector: Erreur de démarrage', error);
            return null;
        }
    }

    /**
     * Récupère les métriques d'extensions au format JSON
     * Méthode sécurisée pour que d'autres modules accèdent aux métriques
     * @function getMetrics
     * @returns {string} Chaîne JSON des métriques actuelles ou objet vide si non disponible
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

    // API publique
    return {
        init: init,
        getMetrics: getMetrics
    };
});