/**
 * Cheat detection monitoring module, the module that is executed on every attemps page (where we will integrate local_insights logic)
 *
 * @module     quizaccess_cheatdetect/detector
 * @copyright  2025 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 *  * @author      gnormand@cblue.be
 */

define(['jquery', 'core/ajax', 'core/notification'], function() {

    var attemptId = null;

    /**
     * Initialize the detector
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
     * Get the attempt ID from the page
     */
    var getAttemptId = function() {
        var match = window.location.href.match(/attempt=(\d+)/);
        return match ? match[1] : null;
    };

    return {
        init: init
    };
});