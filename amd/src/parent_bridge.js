// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Parent-side bridge for quizaccess_cheatdetect when a quiz attempt is loaded
 * inside a same-origin iframe (e.g. by the boostcamp_episode course format).
 *
 * The cheatdetect tracker, running inside the iframe, cannot reliably read
 * tab-visibility or window-focus state on its own because:
 *   - clicks anywhere in the parent chrome trigger window.blur in the iframe,
 *     producing false-positive focus_loss events;
 *   - alt-tabbing or switching tabs is felt by the parent window first.
 *
 * This module owns the truth from the parent context and forwards each change
 * to every quiz iframe through window.postMessage. The receiving tracker
 * authenticates messages by origin (same-origin guard) and by a static
 * source tag ('cheatdetect.parent') before reacting.
 *
 * The bridge is auto-injected by the tracker itself (see tracking/index.js)
 * via window.parent.require, so no host-page integration is required.
 *
 * @module     quizaccess_cheatdetect/parent_bridge
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([], function() {
    'use strict';

    /**
     * Static tag stamped on every outgoing message. The iframe-side tracker
     * checks event.data.src against this exact value before processing.
     * @type {string}
     */
    const SRC_TAG = 'cheatdetect.parent';

    /**
     * Heartbeat interval. The iframe tracker considers the bridge missing
     * after 3s of silence, so 2s gives one buffered tick of margin.
     * @type {number}
     */
    const HEARTBEAT_MS = 2000;

    /**
     * Strict CSS selector for quiz attempt iframes only. Restricting it to
     * mod/quiz/attempt.php keeps the bridge inert for any other embedded
     * activity (questionnaire, scorm, etc.).
     * @type {string}
     */
    const FRAME_SELECTOR = 'iframe[src*="/mod/quiz/attempt.php"]';

    /** @type {string} Origin used as targetOrigin in postMessage. Never '*'. */
    const ORIGIN = window.location.origin;

    /**
     * @typedef {Object} VisibilitySnapshot
     * @property {boolean} hidden  - Mirrors document.hidden of the parent.
     * @property {boolean} focused - Mirrors document.hasFocus() of the parent.
     */

    return {
        /**
         * Wire up parent-side listeners and start the heartbeat.
         * Idempotent: a flag on window prevents double-binding when the
         * format renderer happens to call init() more than once.
         * @returns {void}
         */
        init: function() {
            if (window._cheatdetectParentBridgeInitialized) {
                return;
            }
            window._cheatdetectParentBridgeInitialized = true;

            /** @type {HTMLIFrameElement[]} */
            let frames = [];

            /** @type {VisibilitySnapshot} */
            const snapshot = {
                hidden: document.hidden,
                focused: document.hasFocus()
            };

            /**
             * Re-query the DOM for matching iframes. Called on each event and
             * on each heartbeat to handle iframes that mount after init().
             * @returns {void}
             */
            const refreshFrames = function() {
                frames = Array.prototype.slice.call(
                    document.querySelectorAll(FRAME_SELECTOR)
                );
            };

            /**
             * Build and dispatch a parent-bridge message to all known iframes.
             * Errors from contentWindow access (cross-origin races, detached
             * frames) are swallowed because they are recoverable on the next tick.
             * @param {string} type  Message kind: 'visibility' | 'window_focus' | 'heartbeat'.
             * @param {string} level Suspicion level: 'high' | 'medium' | 'info'.
             * @returns {void}
             */
            const send = function(type, level) {
                const msg = {
                    src: SRC_TAG,
                    type: type,
                    level: level,
                    hidden: snapshot.hidden,
                    focused: snapshot.focused,
                    ts: Date.now()
                };
                for (let i = 0; i < frames.length; i++) {
                    try {
                        frames[i].contentWindow.postMessage(msg, ORIGIN);
                    } catch (e) {
                        // Iframe may not be ready yet or has been removed; ignore.
                    }
                }
            };

            // Tab-level visibility is the strongest cheating signal.
            document.addEventListener('visibilitychange', function() {
                snapshot.hidden = document.hidden;
                refreshFrames();
                send('visibility', document.hidden ? 'high' : 'info');
            });

            // Application-window focus: medium signal (alt-tab, click outside browser).
            window.addEventListener('blur', function() {
                snapshot.focused = false;
                refreshFrames();
                send('window_focus', 'medium');
            });

            window.addEventListener('focus', function() {
                snapshot.focused = true;
                refreshFrames();
                send('window_focus', 'info');
            });

            // Heartbeat: keeps the iframe-side watchdog quiet and picks up
            // late-mounted iframes from the React bundle.
            setInterval(function() {
                refreshFrames();
                send('heartbeat', 'info');
            }, HEARTBEAT_MS);
        }
    };
});
