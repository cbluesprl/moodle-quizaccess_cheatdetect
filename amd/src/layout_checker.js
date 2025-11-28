/**
 * @fileoverview Layout checker module for quiz question pagination warning
 *
 * This module:
 * 1. Finds the #id_questionsperpage field (auto-generated Moodle ID)
 * 2. Finds the alert container #cheatdetect_layout_warning
 * 3. Checks the value on initial load (when editing an existing quiz)
 * 4. Listens for changes with on('change')
 * 5. Shows/hides with animation (slideDown/slideUp)
 *
 * @module     quizaccess_cheatdetect/layout_checker
 * @copyright  2025 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since      1.0.0
 */

define(['jquery'], function($) {

    /**
     * Initialize the layout checker module
     * Sets up warning display based on questions per page setting
     * @function init
     * @returns {void}
     * @since 1.0.0
     */
    var init = function() {
        var $layoutField = $('#id_questionsperpage');
        var $warningDiv = $('#cheatdetect_layout_warning');

        $warningDiv.insertAfter($layoutField);

        if ($layoutField.length === 0 || $warningDiv.length === 0) {
            return;
        }

        /**
         * Check layout setting and show/hide warning accordingly
         * Warning is shown when questions per page is not 1
         * @function checkLayout
         * @returns {void}
         * @private
         */
        var checkLayout = function() {
            var selectedValue = parseInt($layoutField.val());

            if (selectedValue !== 1) {
                $warningDiv.slideDown(300);
            } else {
                $warningDiv.slideUp(300);
            }
        };

        checkLayout();
        $layoutField.on('change', checkLayout);
    };

    return {
        init: init
    };
});