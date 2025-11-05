/**
 * @fileoverview Module de tracking d'activité utilisateur avec détection d'événements suspects
 * @module quizaccess_cheatdetect/tracking/index
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([
    'quizaccess_cheatdetect/extension-detector/index',
    'quizaccess_cheatdetect/shared/utils'
], function(ExtensionDetector, SharedUtils) {
    'use strict';

    /**
     * @typedef {Object} BackendParams
     * @property {boolean} [startDetection=true] - Active/désactive le tracking
     * @property {string} [sessionId] - ID de session
     * @property {number} [attemptid] - ID de la tentative
     * @property {number} [userid] - ID de l'utilisateur
     * @property {number} [quizid] - ID du quiz
     * @property {number} [slot] - Numéro de slot de question
     */

    /**
     * @typedef {Object} UserEvent
     * @property {Object} timestamp - Horodatage avec timezone
     * @property {string} action - Type d'action effectuée
     * @property {Object} data - Données associées à l'événement
     */

    /**
     * @typedef {Object} FieldModificationData
     * @property {Object} target - Informations sur l'élément cible
     * @property {number} valueLength - Longueur de la valeur saisie
     * @property {string} userValue - Valeur saisie par l'utilisateur
     */

    var init = function(backendParams) {

        const userActivityTracker = () => {
            let db = null;
            let isCurrentlyFocused = !document.hidden;

            let lastCopyTime = null;
            let lastCopyContent = "";

            let lastKnownExtensions = {};
            let extensionCheckInterval = null;
            let extensionDetectedDataAlreadySent = new Set();

            /**
             *
             */
            function getExtensionsMetrics() {
                try {
                    const metricsJSON = ExtensionDetector.getMetrics();

                    const metrics = JSON.parse(metricsJSON);

                    if (!metrics.timestamp || !metrics.extensionDetection) {
                        console.warn('Extension Detector: Structure de métriques invalide reçue');
                        return {};
                    }

                    return metrics.extensionDetection;

                } catch (error) {
                    console.warn('Extension Detector: Erreur lors de la récupération des métriques d\'extension:', error);
                    return {};
                }
            }

            /**
             *
             */
            function checkForNewExtensions() {
                const currentExtensions = getExtensionsMetrics();
                const newData = [];

                for (const [key, value] of Object.entries(currentExtensions)) {
                    for (const detectedElement of value.detected) {
                        const _data = JSON.stringify({extensionKey: key, detectedElementUid: detectedElement.uid});
                        if (!extensionDetectedDataAlreadySent.has(_data)) {
                            extensionDetectedDataAlreadySent.add(_data);
                            newData.push(detectedElement);
                        }
                    }
                }

                if (newData.length > 0) {
                    logEvent({
                        action: "extensions_detected",
                        data: newData
                    });
                }
            }

            /**
             *
             */
            function startExtensionMonitoring() {
                checkForNewExtensions();

                const initialExtensions = getExtensionsMetrics();
                lastKnownExtensions = initialExtensions;

                extensionCheckInterval = setInterval(() => {
                    checkForNewExtensions();
                }, 5000);
            }

            /**
             *
             */
            function stopExtensionMonitoring() {
                if (extensionCheckInterval) {
                    clearInterval(extensionCheckInterval);
                    extensionCheckInterval = null;
                }
            }

            /**
             *
             */
            function checkIndexedDBAvailability() {
                return window.indexedDB;
            }

            /**
             *
             */
            function initIndexedDB() {
                return new Promise((resolve, reject) => {
                    if (!checkIndexedDBAvailability()) {
                        reject("IndexedDB n'est pas disponible.");
                        return;
                    }

                    const request = indexedDB.open("UserActivityDB", 1);

                    request.onupgradeneeded = (event) => {
                        const database = event.target.result;
                        if (!database.objectStoreNames.contains("events")) {
                            database.createObjectStore("events", {autoIncrement: true});
                        }
                    };

                    request.onsuccess = (event) => {
                        db = event.target.result;
                        resolve();
                    };

                    request.onerror = (event) => {
                        console.error("Erreur lors de l'ouverture d'IndexedDB:", event.target.error);
                        reject(event.target.error);
                    };
                });
            }

            /**
             *
             * @param newEvent
             */
            function logEvent(newEvent) {
                if (db) {
                    const transaction = db.transaction("events", "readwrite");
                    const objectStore = transaction.objectStore("events");

                    const _newEvent = {
                        timestamp: SharedUtils.generateTimestamp(),
                        ...newEvent
                    };

                    console.log('Nouvelle action utilisateur stockée', _newEvent);
                    objectStore.add(_newEvent);
                }
            }

            /**
             *
             * @param event
             */
            function trackFieldModification(event) {
                const element = event.target;
                const tagName = element.tagName.toLowerCase();

                if (!['input', 'textarea', 'select'].includes(tagName)) {
                    return;
                }

                let userValue;
                if (element.type === 'checkbox') {
                    userValue = element.checked ? element.value : null;
                } else if (element.type === 'radio') {
                    userValue = element.checked ? element.value : null;
                } else {
                    userValue = element.value;
                }

                if (element.type === 'radio' && !element.checked) {
                    return;
                }

                const attributesObject = Object.fromEntries(
                    element.getAttributeNames().map(attr => [attr, element.getAttribute(attr)])
                );

                const newEvent = {
                    action: "field_modified",
                    data: {
                        target: {
                            tag: tagName,
                            attributes: attributesObject
                        },
                        valueLength: userValue ? userValue.length : 0,
                        userValue: userValue,
                    }
                };

                logEvent(newEvent);
            }

            /**
             *
             * @param event
             */
            function trackDocumentState(event) {
                const now = performance.now();
                let type = event.type;

                if (event.type === 'visibilitychange') {
                    if (document.visibilityState === 'visible') {
                        type = 'focus';
                    } else if (document.visibilityState === 'hidden') {
                        type = 'blur';
                    }
                }

                if (type === 'focus') {
                    if (!isCurrentlyFocused) {
                        isCurrentlyFocused = true;

                        const focusEvent = {
                            action: "page_foreground",
                            data: {
                                previousState: "background"
                            }
                        };
                        logEvent(focusEvent);
                    }
                } else if (type === 'blur') {
                    if (isCurrentlyFocused) {
                        isCurrentlyFocused = false;

                        const blurEvent = {
                            action: "page_background",
                            data: {
                                previousState: "foreground"
                            }
                        };
                        logEvent(blurEvent);

                        checkSuspiciousCopyThenBackground(now);
                    }
                }
            }

            /**
             *
             * @param event
             */
            function trackCopy(event) {
                const copiedText = window.getSelection().toString();
                if (copiedText) {
                    lastCopyTime = performance.now();
                    lastCopyContent = copiedText;

                    const newEvent = {
                        action: "copy",
                        data: {
                            content: copiedText
                        }
                    };
                    logEvent(newEvent);
                }
            }

            /**
             *
             * @param event
             */
            function trackPaste(event) {
                const pastedText = (event.clipboardData || window.clipboardData)?.getData("text");
                if (pastedText) {
                    const element = event.target;
                    const tagName = element.tagName.toLowerCase();
                    const pasteSameAsCopy = pastedText === lastCopyContent;
                    const attributesObject = Object.fromEntries(
                        element.getAttributeNames().map(attr => [attr, element.getAttribute(attr)])
                    );

                    const newEvent = {
                        action: "paste",
                        data: {
                            content: pastedText,
                            pasteSameAsCopy: pasteSameAsCopy,
                            target: {
                                tag: tagName,
                                attributes: attributesObject
                            }
                        }
                    };
                    logEvent(newEvent);

                    if (!lastCopyContent || pastedText !== lastCopyContent) {
                        const suspiciousEvent = {
                            action: "paste_different_content",
                            data: {
                                lastCopy: lastCopyContent || null,
                                currentPaste: pastedText,
                                target: {
                                    tag: tagName,
                                    attributes: attributesObject
                                }
                            }
                        };
                        logEvent(suspiciousEvent);
                    }
                }
            }

            /**
             *
             * @param currentTime
             */
            function checkSuspiciousCopyThenBackground(currentTime) {
                if (lastCopyTime && lastCopyContent) {
                    const timeSinceCopy = currentTime - lastCopyTime;

                    if (timeSinceCopy < 30000) {
                        const suspiciousEvent = {
                            action: "copy_then_background",
                            data: {
                                copiedContent: lastCopyContent
                            }
                        };
                        logEvent(suspiciousEvent);

                        lastCopyTime = null;
                        lastCopyContent = "";
                    }
                }
            }

            /**
             *
             */
            function initTracking() {
                if (window._trackingInitialized) {
                    console.warn('Tracking déjà initialisé, ignoré');
                    return;
                }
                window._trackingInitialized = true;

                const pageLoadEvent = {
                    action: "page_load",
                    data: {
                        url: window.location.href,
                        referrer: document.referrer || null,
                        userAgent: navigator.userAgent
                    }
                };
                logEvent(pageLoadEvent);

                // Démarrer le détecteur d'extensions
                ExtensionDetector.init(backendParams);

                startExtensionMonitoring();

                document.addEventListener("visibilitychange", trackDocumentState);

                document.addEventListener("blur", trackDocumentState, true);

                window.addEventListener("focus", trackDocumentState);

                window.addEventListener("blur", trackDocumentState);

                document.addEventListener("copy", (event) => trackCopy(event));

                document.addEventListener("paste", (event) => trackPaste(event));

                document.addEventListener("cut", (event) => trackCopy(event));

                document.addEventListener("input", (event) => trackFieldModification(event));
                document.addEventListener("change", (event) => trackFieldModification(event));

                window.addEventListener("beforeunload", () => {
                    stopExtensionMonitoring();

                    const pageUnloadEvent = {
                        action: "page_unload",
                        data: {}
                    };
                    logEvent(pageUnloadEvent);

                    flushEvents();
                });

                trackDocumentState({type: 'visibilitychange'});
            }

            /**
             *
             */
            function flushEvents() {
                if (db) {
                    const transaction = db.transaction("events", "readonly");
                    const objectStore = transaction.objectStore("events");
                    const request = objectStore.getAll();

                    request.onsuccess = () => {
                        const events = request.result;
                        if (events.length > 0) {
                            const data = {
                                session_id: backendParams.sessionId,
                                attemptid: backendParams.attemptid,
                                userid: backendParams.userid,
                                quizid: backendParams.quizid,
                                slot: backendParams.slot,
                                events: events
                            };

                            fetch('/local/rest/api/quizaccess_cheatdetect/save-data', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(data)
                            }).then(response => {
                                if (response.ok) {
                                    console.log('Action(s) utilisateur envoyée(s) au serveur', data);
                                    clearStoredEvents();
                                } else {
                                    console.error('Erreur lors de l\'envoi des événements');
                                }
                            }).catch(error => {
                                console.error('Erreur réseau:', error);
                            });
                        } else {
                            console.log('Aucune action utilisateur à sauvegarder');
                        }
                    };

                    request.onerror = (error) => {
                        console.error("Erreur lors de la récupération des événements depuis IndexedDB:", error);
                    };
                }
            }

            /**
             *
             */
            function clearStoredEvents() {
                const transaction = db.transaction("events", "readwrite");
                const objectStore = transaction.objectStore("events");
                objectStore.clear();
            }

            initIndexedDB().then(() => {
                initTracking();
                setInterval(() => {
                    flushEvents();
                }, 5000);
            }).catch((error) => {
                console.error("Échec de l'initialisation d'IndexedDB:", error);
            });
        };

        userActivityTracker();
    };

    return {
        init: init
    };
});
