/**
 * @fileoverview Cheat detection monitoring module executed on every attempt page
 * @module     quizaccess_cheatdetect/detector
 * @copyright  2025 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     gnormand@cblue.be
 * @since      1.0.0
 */

define(['jquery', 'core/ajax', 'core/notification'], function() {

    var attemptId = null;

    /**
     * Initialize the detector module
     * Retrieves the attempt ID from URL and sets up periodic logging
     * @function init
     * @returns {void}
     * @since 1.0.0
     */
    var init = function() {
        // Get attempt ID from the page
        attemptId = getAttemptId();

        if (!attemptId) {
            return; // Not on an attempt page
        }

        alert("Bienvenue sur l'attempt " + attemptId);
        // Send events periodically
        setInterval(function() {console.log(attemptId);}, 30000); // Every 30 seconds
    };

    /**
     * Extract the attempt ID from the current page URL
     * @function getAttemptId
     * @returns {string|null} The attempt ID if found in URL, null otherwise
     * @since 1.0.0
     */
    var getAttemptId = function() {
        var match = window.location.href.match(/attempt=(\d+)/);
        return match ? match[1] : null;
    };

    return {
        init: init
    };
});