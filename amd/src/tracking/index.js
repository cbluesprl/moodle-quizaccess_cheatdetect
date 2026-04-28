/**
 * @fileoverview User activity tracking module with suspicious event detection
 * @module quizaccess_cheatdetect/tracking/index
 * @copyright 2025 CBlue SRL <support@cblue.be>
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since 1.0.0
 */

define([
    'core/ajax',
    'quizaccess_cheatdetect/extension-detector/index',
    'quizaccess_cheatdetect/shared/utils'
], function(Ajax, ExtensionDetector, SharedUtils) {
    'use strict';

    const DEBUG_SHOW_CONSOLE_LOG = false;

    /**
     * @typedef {Object} BackendParams
     * @property {boolean} [startDetection=true] - Enable/disable tracking
     * @property {string} [sessionId] - Session ID
     * @property {number} [attemptid] - Attempt ID
     * @property {number} [userid] - User ID
     * @property {number} [quizid] - Quiz ID
     * @property {number} [slot] - Question slot number
     */

    /**
     * Initialize the user activity tracking module
     * Sets up event listeners and IndexedDB for storing tracking data
     * @function init
     * @param {BackendParams} backendParams - Configuration parameters from backend
     * @returns {void}
     * @since 1.0.0
     */
    const init = function(backendParams) {
        // Do nothing if startDetection is not explicitly true
        if (backendParams.startDetection !== true) {
            if (DEBUG_SHOW_CONSOLE_LOG) {
                // eslint-disable-next-line no-console
                console.log('Tracking disabled: startDetection !== true');
            }
            return;
        }

        const userActivityTracker = () => {
            let db = null;
            let isCurrentlyFocused = !document.hidden;

            let extensionCheckInterval = null;
            let extensionDetectedDataAlreadySent = new Set();

            // Embedded-mode detection: when the attempt page is loaded inside an iframe
            // (e.g. boostcamp_episode format), the iframe's own window.focus/blur events
            // fire on every click in the parent chrome and produce false-positive focus_loss.
            // In that case we delegate visibility/focus tracking to the parent_bridge module
            // which posts authoritative signals via window.postMessage.
            const isEmbedded = window.self !== window.top || backendParams.embedded === 1;
            const PARENT_BRIDGE_SRC = 'cheatdetect.parent';
            const PARENT_BRIDGE_TIMEOUT_MS = 3000;
            let lastParentBeat = Date.now();

            /**
             * Retrieve current extension detection metrics
             * @function getExtensionsMetrics
             * @returns {Object} Extension detection metrics object
             * @private
             */
            function getExtensionsMetrics() {
                try {
                    const metricsJSON = ExtensionDetector.getMetrics();

                    const metrics = JSON.parse(metricsJSON);

                    if (!metrics.timestamp || !metrics.extensionDetection) {
                        // eslint-disable-next-line no-console
                        console.warn('Extension Detector: Invalid metrics structure received');
                        return {};
                    }

                    return metrics.extensionDetection;

                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.warn('Extension Detector: Error retrieving extension metrics:', error);
                    return {};
                }
            }

            /**
             * Check for newly detected extensions and log them
             * Compares current metrics with already sent data to avoid duplicates
             * @function checkForNewExtensions
             * @returns {void}
             * @private
             */
            function checkForNewExtensions() {
                const currentExtensions = getExtensionsMetrics();
                const newData = [];

                for (const [key, value] of Object.entries(currentExtensions)) {
                    for (const detectedElement of value.detected) {
                        const _data = JSON.stringify({extensionKey: key, detectedElementUid: detectedElement.uid});
                        if (!extensionDetectedDataAlreadySent.has(_data)) {
                            extensionDetectedDataAlreadySent.add(_data);
                            newData.push({
                                extensionKey: key,
                                uid: detectedElement.uid ?? null,
                                name: detectedElement.name ?? null
                            });
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
             * Start periodic extension monitoring
             * Checks for new extensions every 5 seconds
             * @function startExtensionMonitoring
             * @returns {void}
             * @private
             */
            function startExtensionMonitoring() {
                checkForNewExtensions();

                extensionCheckInterval = setInterval(() => {
                    checkForNewExtensions();
                }, 5000);
            }

            /**
             * Stop extension monitoring interval
             * @function stopExtensionMonitoring
             * @returns {void}
             * @private
             */
            function stopExtensionMonitoring() {
                if (extensionCheckInterval) {
                    clearInterval(extensionCheckInterval);
                    extensionCheckInterval = null;
                }
            }

            /**
             * Check if IndexedDB is available in the browser
             * @function checkIndexedDBAvailability
             * @returns {IDBFactory|undefined} IndexedDB factory or undefined
             * @private
             */
            function checkIndexedDBAvailability() {
                return window.indexedDB;
            }

            /**
             * Initialize IndexedDB database for storing user activity events
             * @function initIndexedDB
             * @returns {Promise<void>} Promise that resolves when database is ready
             * @private
             */
            function initIndexedDB() {
                return new Promise((resolve, reject) => {
                    if (!checkIndexedDBAvailability()) {
                        reject("IndexedDB is not available.");
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
                        // eslint-disable-next-line no-console
                        console.error("Error opening IndexedDB:", event.target.error);
                        reject(event.target.error);
                    };
                });
            }

            /**
             * Log a user activity event to IndexedDB
             * @function logEvent
             * @param {Object} newEvent - Event object to store
             * @param {string} newEvent.action - Type of action (e.g., 'copy', 'page_load')
             * @param {Object} newEvent.data - Additional event data
             * @returns {void}
             * @private
             */
            function logEvent(newEvent) {
                if (db) {
                    const transaction = db.transaction("events", "readwrite");
                    const objectStore = transaction.objectStore("events");

                    const _newEvent = {
                        timestamp: {
                            unix: SharedUtils.generateTimestamp().unix
                        },
                        action: newEvent.action,
                        data: newEvent.data !== undefined && newEvent.data !== null
                            ? JSON.stringify(newEvent.data)
                            : null
                    };

                    if (DEBUG_SHOW_CONSOLE_LOG) {
                        // eslint-disable-next-line no-console
                        console.log('New user action stored', JSON.stringify(_newEvent, null, 2));
                    }
                    objectStore.add(_newEvent);
                }
            }

            /**
             * Track document visibility state changes (focus/blur)
             * @function trackDocumentState
             * @param {Event} event - Visibility change or focus/blur event
             * @returns {void}
             * @private
             */
            function trackDocumentState(event) {
                let type = event.type;

                // Ignore blur/focus events from form elements (INPUT, BUTTON, etc.)
                // We only care about window/document level visibility changes
                if ((event.type === 'blur' || event.type === 'focus') && event.target !== window) {
                    return;
                }

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
                            action: "focus_gain",
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
                            action: "focus_loss",
                            data: {
                                previousState: "foreground"
                            }
                        };
                        logEvent(blurEvent);
                    }
                }
            }

            /**
             * Handle a focus/visibility signal forwarded by the parent window via postMessage.
             * Reasons map to suspicion levels:
             *   - tab_hidden / tab_visible : level 'high'   (whole tab toggled hidden)
             *   - app_blur   / app_focus   : level 'medium' (parent window lost OS focus)
             * The function only emits an event when the focused state actually changes,
             * to avoid duplicates when both visibilitychange and window blur fire together.
             * @function handleParentSignal
             * @param {string} reason - Reason tag carried in the parent message
             * @param {string} level - Suspicion level ('high'|'medium'|'low')
             * @returns {void}
             * @private
             */
            function handleParentSignal(reason, level) {
                const isLossSignal = (reason === 'tab_hidden' || reason === 'app_blur');
                if (isLossSignal && isCurrentlyFocused) {
                    isCurrentlyFocused = false;
                    logEvent({
                        action: 'focus_loss',
                        data: {
                            level: level,
                            reason: reason,
                            previousState: 'foreground'
                        }
                    });
                } else if (!isLossSignal && !isCurrentlyFocused) {
                    isCurrentlyFocused = true;
                    logEvent({
                        action: 'focus_gain',
                        data: {
                            level: level,
                            reason: reason,
                            previousState: 'background'
                        }
                    });
                }
            }

            /**
             * Track copy events only within .qtext elements inside question divs
             * Only logs copies from question text areas to detect potential cheating
             * @function trackCopy
             * @param {ClipboardEvent} event - Copy event from document
             * @returns {void}
             * @private
             */
            function trackCopy(event) { // eslint-disable-line no-unused-vars
                const selection = window.getSelection();
                const copiedText = selection.toString();

                if (!copiedText) {
                    return;
                }

                // Check if the selection is within a .qtext element
                const anchorNode = selection.anchorNode;
                if (!anchorNode) {
                    return;
                }

                // Get the parent element (anchorNode might be a text node)
                let element = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;

                // Traverse up to find .qtext element
                let qtextElement = null;
                let currentElement = element;
                while (currentElement && currentElement !== document.body) {
                    if (currentElement.classList && currentElement.classList.contains('qtext')) {
                        qtextElement = currentElement;
                        break;
                    }
                    currentElement = currentElement.parentElement;
                }

                if (!qtextElement) {
                    return; // Not inside a .qtext element
                }

                // Check if .qtext is inside a question div with id pattern question-x-y
                let questionElement = null;
                currentElement = qtextElement;
                const questionIdPattern = /^question-\d+-\d+$/;

                while (currentElement && currentElement !== document.body) {
                    if (currentElement.id && questionIdPattern.test(currentElement.id)) {
                        questionElement = currentElement;
                        break;
                    }
                    currentElement = currentElement.parentElement;
                }

                if (!questionElement) {
                    return; // Not inside a valid question div
                }

                // Log the copy event with question context
                const newEvent = {
                    action: "copy",
                    data: {
                        content: copiedText,
                        questionId: questionElement.id
                    }
                };
                logEvent(newEvent);
            }


            /**
             * Initialize all tracking event listeners
             * Sets up listeners for visibility, focus, copy, and unload events
             * @function initTracking
             * @returns {void}
             * @private
             */
            function initTracking() {
                if (window._trackingInitialized) {
                    if (DEBUG_SHOW_CONSOLE_LOG) {
                        // eslint-disable-next-line no-console
                        console.warn('Tracking already initialized, skipped');
                    }
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

                // Start extension detector
                ExtensionDetector.init(backendParams);

                startExtensionMonitoring();

                // visibilitychange is reliable in both modes: per MDN, an iframe's
                // visibilityState mirrors the parent document, so this acts as a fallback
                // even when the parent_bridge is not yet ready.
                document.addEventListener("visibilitychange", trackDocumentState);

                if (!isEmbedded) {
                    // Standalone mode: keep the historical window-level focus tracking.
                    document.addEventListener("blur", trackDocumentState, true);
                    window.addEventListener("focus", trackDocumentState);
                    window.addEventListener("blur", trackDocumentState);
                } else {
                    // Embedded mode: focus is delegated to the parent_bridge.
                    // We only accept messages from the same origin and tagged with our SRC marker
                    // (defends against any other postMessage producer on the page).
                    window.addEventListener("message", (event) => {
                        if (event.origin !== window.location.origin) {
                            return;
                        }
                        const msg = event.data;
                        if (!msg || msg.src !== PARENT_BRIDGE_SRC) {
                            return;
                        }

                        lastParentBeat = Date.now();

                        if (msg.type === 'visibility') {
                            handleParentSignal(msg.hidden ? 'tab_hidden' : 'tab_visible', 'high');
                        } else if (msg.type === 'window_focus') {
                            handleParentSignal(msg.focused ? 'app_focus' : 'app_blur', 'medium');
                        }
                        // 'heartbeat' messages only refresh lastParentBeat above.
                    });

                    // Self-inject the parent_bridge into the parent window. This keeps the
                    // bridge protocol fully encapsulated inside quizaccess_cheatdetect: no
                    // host-page (course format / theme / local plugin) needs to know about
                    // it. Same-origin only — cross-origin parents will throw on the property
                    // access below, in which case the watchdog will log parent_bridge_missing.
                    if (window.parent && window.parent !== window) {
                        try {
                            const parentRequire = window.parent.require;
                            if (typeof parentRequire === 'function'
                                && !window.parent._cheatdetectParentBridgeInitialized) {
                                parentRequire(['quizaccess_cheatdetect/parent_bridge'], function(bridge) {
                                    bridge.init();
                                });
                            }
                        } catch (e) {
                            // Cross-origin parent or no AMD loader available; silent fallback.
                        }
                    }

                    // Watchdog: if the parent_bridge stops sending heartbeats, log it once
                    // (suspicious: page may have been re-parented or bridge module not loaded).
                    setInterval(() => {
                        if (Date.now() - lastParentBeat > PARENT_BRIDGE_TIMEOUT_MS) {
                            logEvent({
                                action: 'parent_bridge_missing',
                                data: {
                                    level: 'medium',
                                    reason: 'no_heartbeat_3s'
                                }
                            });
                            // Reset so we don't spam: next missing window will fire after another timeout.
                            lastParentBeat = Date.now();
                        }
                    }, PARENT_BRIDGE_TIMEOUT_MS);
                }

                document.addEventListener("copy", (event) => trackCopy(event));

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
             * Filter out spurious page_background events caused by page navigation
             * @function filterSpuriousEvents
             * @param {Array} events - Array of events to filter
             * @returns {Array} Filtered events array
             * @private
             */
            function filterSpuriousEvents(events) {
                return events.filter((event, index, arr) => {
                    if (event.action === "focus_loss" && index < arr.length - 1) {
                        const nextAction = arr[index + 1].action;
                        // Remove page_background if immediately followed by page_unload or page_load
                        // (page_load means it's an orphan from previous navigation)
                        if (nextAction === "page_unload" || nextAction === "page_load") {
                            return false;
                        }
                    }
                    return true;
                });
            }

            /**
             * Send all stored events to the server via REST API
             * Clears local storage after successful transmission
             * @function flushEvents
             * @returns {void}
             * @private
             */
            function flushEvents() {
                if (db) {
                    const transaction = db.transaction("events", "readonly");
                    const objectStore = transaction.objectStore("events");
                    const request = objectStore.getAll();

                    request.onsuccess = () => {
                        const events = filterSpuriousEvents(request.result).map(event => {
                            return {
                                action: event.action,
                                timestamp: {
                                    unix: event.timestamp?.unix ?? event.timestamp
                                },
                                data: event.data !== undefined && event.data !== null
                                    ? (typeof event.data === 'string'
                                        ? event.data
                                        : JSON.stringify(event.data))
                                    : null
                            };
                        });

                        if (events.length > 0) {
                            Ajax.call([{
                                methodname: 'quizaccess_cheatdetect_save_data',
                                args: {
                                    session_id: backendParams.sessionId,
                                    attemptid: backendParams.attemptid,
                                    userid: backendParams.userid,
                                    quizid: backendParams.quizid,
                                    slot: backendParams.slot ?? null,
                                    events: events
                                }
                            }])[0].then((response) => {
                                if (response && response.success) {
                                    if (DEBUG_SHOW_CONSOLE_LOG) {
                                        // eslint-disable-next-line no-console
                                        console.log(
                                            'User action(s) sent to server',
                                            JSON.stringify(response, null, 2)
                                        );
                                    }
                                    clearStoredEvents();
                                } else {
                                    // eslint-disable-next-line no-console
                                    console.error('Server error saving events', response?.error);
                                }
                            }).catch((error) => {
                                // eslint-disable-next-line no-console
                                console.error('AJAX error saving events', error);
                            });
                        } else {
                            if (DEBUG_SHOW_CONSOLE_LOG) {
                                // eslint-disable-next-line no-console
                                console.log('No user actions to save');
                            }
                        }
                    };

                    request.onerror = (error) => {
                        // eslint-disable-next-line no-console
                        console.error("Error retrieving events from IndexedDB:", error);
                    };
                }
            }

            /**
             * Clear all stored events from IndexedDB
             * Called after successful server transmission
             * @function clearStoredEvents
             * @returns {void}
             * @private
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
                // eslint-disable-next-line no-console
                console.error("Failed to initialize IndexedDB:", error);
            });
        };

        userActivityTracker();
    };

    return {
        init: init
    };
});
