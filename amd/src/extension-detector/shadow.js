/**
 * @fileoverview Moniteur Shadow DOM pour la détection d'éléments d'extension
 * @module quizaccess_cheatdetect/extension-detector/shadow
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
     * @typedef {Object} ElementInfo
     * @property {string} DOM - HTML externe de l'élément
     * @property {string|null} shadowDOM - HTML du Shadow DOM si présent
     * @property {string} detection - Méthode de détection utilisée
     */

    /**
     * @typedef {Object} ShadowMonitorState
     * @property {boolean} hasDetectedElements - Au moins un élément détecté
     * @property {number} totalDetections - Nombre total de détections
     */

    /**
     * Constructeur du moniteur Shadow DOM
     * @class ShadowMonitor
     * @param {Function} onDetected - Callback appelé lors de la détection d'extension
     * @example
     * const monitor = new ShadowMonitor((key, ext, method) => {
     *   console.log('Extension détectée:', ext.name);
     * });
     * @since 1.0.0
     */
    var ShadowMonitor = function(onDetected) {
        this.onDetected = onDetected;
        this.observers = new Map();
        this.processedShadowRoots = new WeakSet();
        this.detectedExtensions = new Set();
        this.isActive = false;
        this.scanInterval = null;
        this.metricsManager = null;

        // État des métriques simples
        this.metricsState = {
            hasDetectedElements: false,
            totalDetections: 0
        };
    };

    /**
     * Définit la référence du gestionnaire de métriques
     * @memberof ShadowMonitor
     * @function setMetricsManager
     * @param {Object} metricsManager - Instance du gestionnaire de métriques
     * @example
     * monitor.setMetricsManager(metricsManagerInstance);
     * @since 1.0.0
     */
    ShadowMonitor.prototype.setMetricsManager = function(metricsManager) {
        this.metricsManager = metricsManager;
    };

    /**
     * Démarre la surveillance du DOM et Shadow DOM
     * @memberof ShadowMonitor
     * @function start
     * @throws {Error} Si le démarrage échoue
     * @example
     * monitor.start();
     * @since 1.0.0
     */
    ShadowMonitor.prototype.start = function() {
        if (this.isActive) {
            return;
        }

        this.isActive = true;

        try {
            this._scanAllElements();
            this._createObserver();
            this._startPeriodicScan();
        } catch (error) {
            console.error('🧩 Extension Detector: Échec du démarrage de la surveillance', error);
            this.isActive = false;
        }
    };

    /**
     * Démarre le scan périodique des éléments
     * @memberof ShadowMonitor
     * @function _startPeriodicScan
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._startPeriodicScan = function() {
        var self = this;

        this.scanInterval = setInterval(function() {
            if (!self.isActive) return;
            self._scanAllElements();
        }, 1000);
    };

    /**
     * Scanne tous les éléments du document
     * @memberof ShadowMonitor
     * @function _scanAllElements
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._scanAllElements = function() {
        try {
            var allElements = document.querySelectorAll('*');

            for (var i = 0; i < allElements.length; i++) {
                var element = allElements[i];

                this._checkAndProcessElement(element, 'periodicScan');

                if (element.shadowRoot && !this.processedShadowRoots.has(element.shadowRoot)) {
                    this._handleShadowRoot(element);
                }
            }
        } catch (error) {
            if (Config.SETTINGS.enableLogging) {
                console.warn('🧩 Extension Detector: Erreur pendant le scan périodique', error);
            }
        }
    };

    /**
     * Crée un MutationObserver pour surveiller les changements DOM
     * @memberof ShadowMonitor
     * @function _createObserver
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._createObserver = function() {
        var self = this;

        var observer = new MutationObserver(function(mutations) {
            if (!self.isActive) return;

            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            self._checkAndProcessElement(node, 'mutationObserver');

                            if (node.querySelectorAll) {
                                var children = node.querySelectorAll('*');
                                for (var i = 0; i < children.length; i++) {
                                    self._checkAndProcessElement(children[i], 'mutationObserver');
                                }
                            }

                            if (node.shadowRoot) {
                                self._handleShadowRoot(node);
                            }
                        }
                    });
                }

                if (mutation.type === 'attributes') {
                    var target = mutation.target;
                    if (target && target.nodeType === Node.ELEMENT_NODE) {
                        self._checkAndProcessElement(target, 'attributeChange');
                    }
                }
            });
        });

        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true
        });

        this.observers.set('main', observer);
    };

    /**
     * Vérifie et traite un élément pour détecter les extensions
     * @memberof ShadowMonitor
     * @function _checkAndProcessElement
     * @param {Element} element - Élément à vérifier
     * @param {string} source - Source de la détection
     * @returns {boolean} True si une extension a été détectée
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._checkAndProcessElement = function(element, source) {
        if (!element) return false;

        var extensions = Config.getAllExtensions();

        for (var i = 0; i < extensions.length; i++) {
            var extension = extensions[i];

            if (this._detectExtensionElement(element, extension, source)) {
                this._processDetectedElement(extension.key, element, source);
                return true;
            }
        }

        return false;
    };

    /**
     * Détecte si un élément appartient à une extension
     * @memberof ShadowMonitor
     * @function _detectExtensionElement
     * @param {Element} element - Élément à analyser
     * @param {Object} extension - Configuration de l'extension
     * @param {string} source - Source de la détection
     * @returns {boolean} True si l'élément appartient à l'extension
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._detectExtensionElement = function(element, extension, source) {
        if (!extension) return false;

        // SÉCURITÉ: Ne jamais essayer de supprimer des éléments critiques
        if (element === document.body || element === document.documentElement ||
            element.tagName === 'BODY' || element.tagName === 'HTML' || element.tagName === 'HEAD') {
            return false;
        }

        // Stratégies de détection
        if (this._containsSpecificExtensionId(element, extension)) {
            return true;
        }

        if (extension.textKeywords && element.textContent) {
            for (var k = 0; k < extension.textKeywords.length; k++) {
                var keyword = extension.textKeywords[k];
                if (element.textContent.includes(keyword)) {
                    return true;
                }
            }
        }

        if (extension.patterns.ids && element.id) {
            var elementId = element.id.toLowerCase();
            for (var j = 0; j < extension.patterns.ids.length; j++) {
                var pattern = extension.patterns.ids[j].toLowerCase();
                if (elementId.includes(pattern)) {
                    return true;
                }
            }
        }

        if (extension.patterns.classes && element.className) {
            var className = element.className.toLowerCase();
            for (var i = 0; i < extension.patterns.classes.length; i++) {
                var pattern = extension.patterns.classes[i].toLowerCase();
                if (className.includes(pattern)) {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Traite un élément détecté (enregistrement et suppression)
     * @memberof ShadowMonitor
     * @function _processDetectedElement
     * @param {string} extensionKey - Clé de l'extension
     * @param {Element} element - Élément détecté
     * @param {string} source - Source de la détection
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._processDetectedElement = function(extensionKey, element, source) {
        this.metricsState.totalDetections++;

        // Extraire les informations de l'élément
        var elementInfo = this._extractElementInfo(element, source);

        // Logger la détection (TOUJOURS)
        if (this.metricsManager) {
            this.metricsManager.logDetectedElement(extensionKey, elementInfo);

            if (Config.SETTINGS.enableLogging) {
                console.log('🧩 Extension Detector: 🚨 ' + extensionKey + ' : élément détecté', elementInfo);
            }
        }

        // Essayer de supprimer si le paramètre le permet
        if (Config.SETTINGS.removeDetectedElements) {
            var removed = this._tryRemoveElement(element);

            if (removed) {
                if (Config.SETTINGS.enableLogging) {
                    console.log('🧩 Extension Detector: ✅ ' + extensionKey + ' : élément supprimé', elementInfo);
                }
            } else {
                if (Config.SETTINGS.enableLogging) {
                    console.log('🧩 Extension Detector: ❌ ' + extensionKey + ' - échec de suppression d\'élément', elementInfo);
                }
            }
        }

        // CORRECTION: Notifier TOUJOURS lors de la première détection
        // même si startDetection = false dans les paramètres backend
        if (!this.detectedExtensions.has(extensionKey)) {
            this.detectedExtensions.add(extensionKey);
            if (this.onDetected) {
                var extensionConfig = Config.getExtension(extensionKey);
                this.onDetected(extensionKey, extensionConfig, source);
            }
        }
    };

    /**
     * Extrait les informations pertinentes d'un élément détecté
     * @memberof ShadowMonitor
     * @function _extractElementInfo
     * @param {Element} element - Élément à analyser
     * @param {string} source - Source de la détection
     * @returns {ElementInfo} Informations extraites de l'élément
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._extractElementInfo = function(element, source) {
        var method = '';

        // Déterminer la méthode basée sur ce qui a déclenché la détection
        var extensions = Config.getAllExtensions();
        for (var i = 0; i < extensions.length; i++) {
            var extension = extensions[i];
            if (this._containsSpecificExtensionId(element, extension)) {
                //Extraire juste l'ID d'extension trouvé dans l'élément
                var outerHTML = element.outerHTML;
                var match = outerHTML.match(Config.EXTENSION_URL_REGEX);
                if (match && match[2]) {
                    method = 'Extension de navigateur trouvée par son ID : ' + match[2];
                } else {
                    method = 'Extension de navigateur trouvée';
                }
                break;
            } else if (extension.textKeywords && element.textContent) {
                var found = false;
                for (var l = 0; l < extension.textKeywords.length; l++) {
                    if (element.textContent.includes(extension.textKeywords[l])) {
                        method = 'Mot-clé texte trouvé : ' + extension.textKeywords[l];
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            else if (extension.patterns.ids && element.id) {
                var elementId = element.id.toLowerCase();
                for (var j = 0; j < extension.patterns.ids.length; j++) {
                    var pattern = extension.patterns.ids[j].toLowerCase();
                    if (elementId.includes(pattern)) {
                        method = 'ID trouvé : ' + pattern;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            else if (extension.patterns.classes && element.className) {
                var className = element.className.toLowerCase();
                for (var k = 0; k < extension.patterns.classes.length; k++) {
                    var pattern = extension.patterns.classes[k].toLowerCase();
                    if (className.includes(pattern)) {
                        method = 'Classe trouvée : ' + pattern;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        }

        return {
            DOM: element.outerHTML,
            shadowDOM: element.shadowRoot ? element.shadowRoot.innerHTML : null,
            detection: method
        };
    };

    /**
     * Essaie de supprimer un élément de manière sécurisée
     * @memberof ShadowMonitor
     * @function _tryRemoveElement
     * @param {Element} element - Élément à supprimer
     * @returns {boolean} True si la suppression a réussi
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._tryRemoveElement = function(element) {
        if (!element ||
            element === document.body ||
            element === document.documentElement ||
            element.tagName === 'BODY' ||
            element.tagName === 'HTML' ||
            element.tagName === 'HEAD') {
            return false;
        }

        try {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                return true;
            } else if (element.remove) {
                element.remove();
                return true;
            }
        } catch (error) {
            // Échec silencieux
        }
        return false;
    };

    /**
     * Vérifie l'ID d'extension avec regex multi-navigateur
     * @memberof ShadowMonitor
     * @function _containsSpecificExtensionId
     * @param {Element} element - Élément à vérifier
     * @param {Object} extension - Configuration de l'extension
     * @returns {boolean} True si l'ID d'extension est trouvé
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._containsSpecificExtensionId = function(element, extension) {
        var extensionIds = Config.getExtensionId(extension.key);
        if (!extensionIds) return false;

        var outerHTML = element.outerHTML;

        // Vérifier avec la regex pour détecter les URLs d'extension
        var match = outerHTML.match(Config.EXTENSION_URL_REGEX);
        if (!match) return false;

        var foundExtensionId = match[2]; // L'ID extrait de la regex

        // Vérifier si l'ID trouvé correspond à un des IDs configurés
        for (var browser in extensionIds) {
            if (extensionIds[browser] === foundExtensionId) {
                return true;
            }
        }

        return false;
    };

    /**
     * Gère un Shadow Root détecté
     * @memberof ShadowMonitor
     * @function _handleShadowRoot
     * @param {Element} element - Élément contenant le Shadow Root
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._handleShadowRoot = function(element) {
        var shadowRoot = element.shadowRoot;
        if (this.processedShadowRoots.has(shadowRoot)) return;

        this.processedShadowRoots.add(shadowRoot);
        this._observeShadowRoot(shadowRoot);
        this._scanShadowRoot(shadowRoot);
    };

    /**
     * Observe les changements dans un Shadow Root
     * @memberof ShadowMonitor
     * @function _observeShadowRoot
     * @param {ShadowRoot} shadowRoot - Shadow Root à observer
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._observeShadowRoot = function(shadowRoot) {
        if (this.observers.has(shadowRoot)) return;

        var self = this;
        var shadowObserver = new MutationObserver(function(mutations) {
            if (!self.isActive) return;

            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            self._checkAndProcessElement(node, 'shadowDOM');
                        }
                    });
                }
            });
        });

        shadowObserver.observe(shadowRoot, {
            childList: true,
            subtree: true,
            attributes: true
        });

        this.observers.set(shadowRoot, shadowObserver);
    };

    /**
     * Scanne tous les éléments d'un Shadow Root
     * @memberof ShadowMonitor
     * @function _scanShadowRoot
     * @param {ShadowRoot} shadowRoot - Shadow Root à scanner
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._scanShadowRoot = function(shadowRoot) {
        try {
            var elements = shadowRoot.querySelectorAll('*');
            for (var i = 0; i < elements.length; i++) {
                this._checkAndProcessElement(elements[i], 'shadowDOM');
            }
        } catch (error) {
            // Échec silencieux
        }
    };

    /**
     * Arrête la surveillance
     * @memberof ShadowMonitor
     * @function stop
     * @example
     * monitor.stop();
     * @since 1.0.0
     */
    ShadowMonitor.prototype.stop = function() {
        if (!this.isActive) return;

        this.isActive = false;

        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        this._cleanup();
    };

    /**
     * Nettoie les ressources utilisées
     * @memberof ShadowMonitor
     * @function _cleanup
     * @private
     * @since 1.0.0
     */
    ShadowMonitor.prototype._cleanup = function() {
        this.observers.forEach(function(observer) {
            try {
                observer.disconnect();
            } catch (error) {
                // Échec silencieux
            }
        });

        this.observers.clear();
        this.processedShadowRoots = new WeakSet();
        this.detectedExtensions.clear();
    };

    /**
     * Réinitialise l'état du moniteur
     * @memberof ShadowMonitor
     * @function reset
     * @example
     * monitor.reset();
     * @since 1.0.0
     */
    ShadowMonitor.prototype.reset = function() {
        this.detectedExtensions.clear();
        this.metricsState = {
            hasDetectedElements: false,
            totalDetections: 0
        };
    };

    return {
        ShadowMonitor: ShadowMonitor
    };
});