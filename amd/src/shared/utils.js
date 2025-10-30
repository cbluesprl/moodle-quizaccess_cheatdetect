/**
 * @fileoverview Utilitaires partagés entre les modules d'extension-detector et tracking
 * @module quizaccess_cheatdetect/shared/utils
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([], function() {
    'use strict';

    /**
     * Génère un identifiant unique aléatoire
     * @function generateUniqueId
     * @returns {string} Identifiant unique de longueur variable (8-16 caractères)
     * @example
     * const id = generateUniqueId();
     * console.log(id); // "a7B9x_2K"
     * @since 1.0.0
     */
    var generateUniqueId = function() {
        var validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
        var length = Math.floor(Math.random() * 9) + 8;
        var result = '';

        var firstCharOptions = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
        result += firstCharOptions[Math.floor(Math.random() * firstCharOptions.length)];

        for (var i = 1; i < length; i++) {
            result += validChars[Math.floor(Math.random() * validChars.length)];
        }

        return result;
    };

    /**
     * Génère un horodatage fiable avec informations de timezone
     * @function generateTimestamp
     * @returns {Object} Objet contenant le timestamp Unix et le timezone
     * @property {number} unix - Timestamp Unix en millisecondes
     * @property {string} timezone - Timezone locale de l'utilisateur
     * @example
     * const timestamp = generateTimestamp();
     * // { unix: 1640995200000, timezone: "Europe/Paris" }
     * @since 1.0.0
     */
    var generateTimestamp = function() {
        return {
            unix: Date.now(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    };

    /**
     * Fetch avec timeout personnalisé
     * @function fetchWithTimeout
     * @param {string} url - URL à récupérer
     * @param {number} [timeout=5000] - Timeout en millisecondes
     * @returns {Promise<Object>} Promesse qui résout avec le résultat de fetch
     * @property {boolean} success - Indique si la requête a réussi
     * @property {number} [status] - Code de statut HTTP si succès
     * @property {Response} [response] - Objet Response si succès
     * @property {string} [error] - Message d'erreur si échec
     * @example
     * fetchWithTimeout('https://example.com/api', 3000)
     *   .then(result => {
     *     if (result.success) {
     *       return result.response.json();
     *     }
     *   });
     * @since 1.0.0
     */
    var fetchWithTimeout = function(url, timeout) {
        timeout = timeout || 5000;

        return new Promise(function(resolve) {
            var controller = new AbortController();
            var timeoutId = setTimeout(function() {
                controller.abort();
            }, timeout);

            fetch(url, { signal: controller.signal })
                .then(function(response) {
                    clearTimeout(timeoutId);
                    resolve({
                        success: response.ok,
                        status: response.status,
                        response: response.ok ? response : null
                    });
                })
                .catch(function(error) {
                    clearTimeout(timeoutId);
                    resolve({
                        success: false,
                        error: error.name === 'AbortError' ? 'Timeout' : error.message
                    });
                });
        });
    };

    /**
     * Fonction de debounce pour limiter la fréquence d'exécution
     * @function debounce
     * @param {Function} func - Fonction à débouncer
     * @param {number} delay - Délai en millisecondes
     * @returns {Function} Fonction débouncée
     * @example
     * const debouncedHandler = debounce(() => {
     *   console.log('Exécuté!');
     * }, 300);
     * @since 1.0.0
     */
    var debounce = function(func, delay) {
        var timeoutId;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(function() {
                func.apply(context, args);
            }, delay);
        };
    };

    /**
     * Extrait l'ID d'extension depuis une URL ou du contenu
     * @function extractExtensionId
     * @param {string} content - Contenu à analyser
     * @returns {string|null} URL d'extension trouvée ou null
     * @example
     * const id = extractExtensionId('chrome-extension://abcdef123456/script.js');
     * // "chrome-extension://abcdef123456"
     * @since 1.0.0
     */
    var extractExtensionId = function(content) {
        var regex = /(chrome-extension:\/\/|moz-extension:\/\/)([a-z0-9-]+)/;
        var match = content.match(regex);
        return match ? match[0] : null;
    };

    /**
     * Vérifie si un nœud DOM contient des mots-clés spécifiés
     * @function containsKeywords
     * @param {Node} node - Nœud DOM à analyser
     * @param {string[]} keywords - Tableau de mots-clés à rechercher
     * @returns {boolean} True si au moins un mot-clé est trouvé
     * @example
     * const hasKeywords = containsKeywords(element, ['crowdly', 'AI Magic']);
     * @since 1.0.0
     */
    var containsKeywords = function(node, keywords) {
        if (!node || !keywords || keywords.length === 0) return false;

        if (node.textContent && keywords.some(function(keyword) {
            return node.textContent.toLowerCase().includes(keyword.toLowerCase());
        })) {
            return true;
        }

        if (node.childNodes) {
            for (var i = 0; i < node.childNodes.length; i++) {
                var childNode = node.childNodes[i];
                if (childNode.nodeType === Node.ELEMENT_NODE && containsKeywords(childNode, keywords)) {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Vérifie si un élément correspond aux motifs spécifiés
     * @function matchesPatterns
     * @param {Element} element - Élément DOM à vérifier
     * @param {string[]} patterns - Motifs à rechercher dans l'ID et les classes
     * @returns {boolean} True si l'élément correspond à au moins un motif
     * @example
     * const matches = matchesPatterns(element, ['crowd', 'ai-helper']);
     * @since 1.0.0
     */
    var matchesPatterns = function(element, patterns) {
        if (!element || !patterns) return false;

        var elementId = (element.id || '').toLowerCase();
        var className = (element.className || '').toLowerCase();

        return patterns.some(function(pattern) {
            var lowerPattern = pattern.toLowerCase();
            return elementId.includes(lowerPattern) || className.includes(lowerPattern);
        });
    };

    /**
     * Vérifie si le contenu contient des motifs spécifiés
     * @function containsPatterns
     * @param {string} content - Contenu à analyser
     * @param {string[]} patterns - Motifs à rechercher
     * @returns {boolean} True si au moins un motif est trouvé
     * @example
     * const hasPatterns = containsPatterns(text, ['extension', 'browser']);
     * @since 1.0.0
     */
    var containsPatterns = function(content, patterns) {
        if (!content || !patterns) return false;

        return patterns.some(function(pattern) {
            return content.toLowerCase().includes(pattern.toLowerCase());
        });
    };

    /**
     * Supprime un élément DOM de manière sécurisée
     * @function removeElement
     * @param {Element} element - Élément à supprimer
     * @returns {boolean} True si la suppression a réussi
     * @example
     * const removed = removeElement(suspiciousElement);
     * if (removed) console.log('Élément supprimé avec succès');
     * @since 1.0.0
     */
    var removeElement = function(element) {
        if (!element) return false;

        try {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                return true;
            } else {
                element.remove();
                return true;
            }
        } catch (error) {
            return false;
        }
    };

    return {
        generateUniqueId: generateUniqueId,
        generateTimestamp: generateTimestamp,
        fetchWithTimeout: fetchWithTimeout,
        debounce: debounce,
        extractExtensionId: extractExtensionId,
        containsKeywords: containsKeywords,
        matchesPatterns: matchesPatterns,
        containsPatterns: containsPatterns,
        removeElement: removeElement
    };
});
