/**
 * @fileoverview Configuration pour la détection d'extensions
 * @module quizaccess_cheatdetect/extension-detector/config
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([], function() {
    'use strict';

    /**
     * @typedef {Object} ExtensionConfig
     * @property {string} name - Nom affiché de l'extension
     * @property {Object.<string, string>} extensionIds - IDs d'extension par navigateur
     * @property {string[]} textKeywords - Mots-clés à rechercher dans le contenu texte
     * @property {Object.<string, string[]>} files - Fichiers d'extension à vérifier
     * @property {PatternConfig} patterns - Motifs d'attributs HTML
     */

    /**
     * @typedef {Object} PatternConfig
     * @property {string[]} ids - Motifs d'ID d'élément
     * @property {string[]} classes - Motifs de classe CSS
     */

    /**
     * @typedef {Object} SettingsConfig
     * @property {number} shadowDOMCheckDelay - Délai de vérification du Shadow DOM (ms)
     * @property {number} fileCheckTimeout - Timeout pour la vérification des fichiers (ms)
     * @property {boolean} removeDetectedElements - Supprimer les éléments détectés
     * @property {boolean} enableLogging - Activer les logs de débogage
     */

    /**
     * Configurations de détection d'extensions
     * @type {Object.<string, ExtensionConfig>}
     * @readonly
     */
    var EXTENSIONS = {
        crowdly: {
            key: 'crowdly',
            name: 'Crowdly – AI Study Assistant for Moodle',

            // IDs d'extension par navigateur
            extensionIds: {
                chrome: 'idipjdgkafkkbklacjonnhkammdpigol',
                edge: 'idipjdgkafkkbklacjonnhkammdpigol',
            },

            // Mots-clés à rechercher dans le contenu texte
            textKeywords: ['crowdly.sh/', 'AI Magic'],

            // Fichiers d'extension à vérifier avec validation de contenu
            files: {
                'src/styles.css': [
                    '#page-question-preview',
                    '#page-mod-quiz-edit'
                ],
                'manifest.json': [
                    '"name"',
                    '"version"'
                ]
            },

            // Motifs d'attributs HTML
            patterns: {
                // Motifs d'ID d'élément
                ids: ['crowd'],

                // Motifs de classe CSS
                classes: ['crowd']
            }
        }
    };

    /**
     * Paramètres de détection
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
     * Expression régulière pour détecter les URLs d'extension multi-navigateur
     * @type {RegExp}
     * @readonly
     */
    var EXTENSION_URL_REGEX = /(chrome-extension:\/\/|moz-extension:\/\/)([a-z0-9-]+)/;

    /**
     * Obtient la configuration d'extension par clé
     * @function getExtension
     * @param {string} key - Clé de l'extension
     * @returns {ExtensionConfig|null} Configuration de l'extension ou null si non trouvée
     * @example
     * const crowdlyConfig = getExtension('crowdly');
     * console.log(crowdlyConfig.name); // "Crowdly – AI Study Assistant for Moodle"
     * @since 1.0.0
     */
    var getExtension = function(key) {
        return EXTENSIONS[key] || null;
    };

    /**
     * Obtient toutes les extensions configurées
     * @function getAllExtensions
     * @returns {Array.<ExtensionConfig & {key: string}>} Tableau de toutes les extensions avec leur clé
     * @example
     * const allExtensions = getAllExtensions();
     * allExtensions.forEach(ext => console.log(ext.key, ext.name));
     * @since 1.0.0
     */
    var getAllExtensions = function() {
        return Object.keys(EXTENSIONS).map(function(key) {
            return Object.assign({ key: key }, EXTENSIONS[key]);
        });
    };

    /**
     * Obtient tous les IDs d'extension pour tous les navigateurs
     * @function getExtensionId
     * @param {string} extensionKey - Clé de l'extension
     * @returns {Object.<string, string>|null} Objet avec les IDs par navigateur ou null
     * @example
     * const ids = getExtensionId('crowdly');
     * // { chrome: "abc123", edge: "abc123", firefox: "abc123" }
     * @since 1.0.0
     */
    var getExtensionId = function(extensionKey) {
        var extension = getExtension(extensionKey);
        if (!extension || !extension.extensionIds) return null;

        return extension.extensionIds;
    };

    // API publique
    return {
        EXTENSIONS: EXTENSIONS,
        SETTINGS: SETTINGS,
        EXTENSION_URL_REGEX: EXTENSION_URL_REGEX,
        getExtension: getExtension,
        getAllExtensions: getAllExtensions,
        getExtensionId: getExtensionId
    };
});