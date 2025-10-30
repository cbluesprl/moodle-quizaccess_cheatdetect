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
     * @typedef {Object} UIConfig
     * @property {ModalConfig} modal - Configuration de la modale d'avertissement
     */

    /**
     * @typedef {Object} ModalConfig
     * @property {string} icon - Icône à afficher
     * @property {string} title - Titre de la modale
     * @property {string} message - Message HTML avec placeholder %extension.name%
     * @property {string} buttonText - Texte du bouton
     * @property {ThemeConfig} theme - Configuration du thème visuel
     */

    /**
     * @typedef {Object} ThemeConfig
     * @property {string} primaryColor - Couleur primaire
     * @property {string} backgroundColor - Couleur de fond
     * @property {string} borderRadius - Rayon des bordures
     * @property {number} zIndex - Index Z pour l'affichage
     */

    /**
     * @typedef {Object} SettingsConfig
     * @property {number} shadowDOMCheckDelay - Délai de vérification du Shadow DOM (ms)
     * @property {number} fileCheckTimeout - Timeout pour la vérification des fichiers (ms)
     * @property {boolean} removeDetectedElements - Supprimer les éléments détectés
     * @property {boolean} reloadOnModalClose - Recharger la page à la fermeture de la modale
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
     * Configuration de l'interface utilisateur
     * @type {UIConfig}
     * @readonly
     */
    var UI = {
        modal: {
            icon: `⚠️`,
            title: `Avertissement d'intégrité académique.`,
            message: `<p>L'extension <b>&laquo; %extension.name% &raquo;</b> a été détectée sur votre navigateur. Cette extension est incompatible avec les normes d'intégrité académique de notre plateforme. Veuillez la désactiver ou la désinstaller de votre navigateur pour continuer.</p>`,
            buttonText: `OK — J'ai retiré l'extension et je continue`,

            // Style
            theme: {
                primaryColor: `var(--primary, "#d73502")`,
                backgroundColor: `#ffffff`,
                borderRadius: `12px`,
                zIndex: 10000
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
        reloadOnModalClose: false,
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
        UI: UI,
        SETTINGS: SETTINGS,
        EXTENSION_URL_REGEX: EXTENSION_URL_REGEX,
        getExtension: getExtension,
        getAllExtensions: getAllExtensions,
        getExtensionId: getExtensionId
    };
});