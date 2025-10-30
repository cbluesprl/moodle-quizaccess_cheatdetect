/**
 * This JS is made to enhance the /mod/quiz/report.php?id=X&mode=overview core_moodle report table
 *
 * @module     quizaccess_cheatdetect/report_enhancer
 * @package     quizaccess_cheatdetect
 * @copyright   2025 CBlue SPRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

define(['jquery', 'core/ajax', 'core/notification'], function($) {

    var config = {};

    /**
     * Initialize the report enhancer
     * @param {object} params Configuration parameters
     */
    var init = function(params) {
        config = params;
        // Wait for DOM to be ready
        $(document).ready(function() {
            enhanceReportTable();
        });
    };

    /**
     * Enhance the report table with cheat detection information
     */
    var enhanceReportTable = function() {
        // Find the report table
        var domtable = $('table.generaltable');

        if (domtable.length === 0) {
            console.warn('CheatDetect: Report table not found');
            return;
        }

        console.log('CheatDetect: Enhancing report table');

        // Add icons next to "Relecture de cette tentative" links
        addIconsToReviewLinks();

        // Add icons next to question results
        addIconsToQuestionResults();

        // Get all attempt IDs from the table
        var attemptIds = [1,45,78]; // futur : extractAttemptIds($table);

        if (attemptIds.length === 0) {
            console.warn('CheatDetect: No attempts found');
            return;
        }

        return attemptIds;

    };

    /**
     * Add icons next to "Relecture de cette tentative" links
     */
    var addIconsToReviewLinks = function() {
        // Find all review links
        $('.reviewlink').each(function() {
            var $link = $(this);

            // Check if icon already added
            if ($link.find('.cheatdetect-icon').length > 0) {
                return;
            }

            // Create icon element
            var $icon = $('<i>')
                .addClass('fa fa-eye cheatdetect-icon')
                .attr('aria-hidden', 'true')
                .css({
                    'margin-left': '8px',
                    'color': '#0066cc'
                });

            // Append icon to the link
            $link.append(' ').append($icon);
        });
    };

    /**
     * Add icons next to question results
     */
    var addIconsToQuestionResults = function() {
        // Find all question result links (links in cells that contain question grades)
        $('table.generaltable tbody tr').each(function() {
            var $row = $(this);

            // Find cells with question results (columns after c8, which is the total grade)
            $row.find('td[class*="c9"], td[class*="c10"], td[class*="c11"], td[class*="c12"], td[class*="c13"],' +
                      'td[class*="c14"], td[class*="c15"], td[class*="c16"], td[class*="c17"], td[class*="c18"]').each(function() {
                var $cell = $(this);
                var $link = $cell.find('a[href*="reviewquestion.php"]');

                if ($link.length > 0) {
                    // Check if icon already added
                    if ($link.find('.cheatdetect-qicon').length > 0) {
                        return;
                    }

                    // Create icon element
                    var $icon = $('<i>')
                        .addClass('fa fa-flag cheatdetect-qicon')
                        .attr('aria-hidden', 'true')
                        .css({
                            'margin-left': '6px',
                            'color': '#ff6600',
                            'font-size': '0.9em'
                        });

                    // Append icon after the link content
                    $link.append(' ').append($icon);
                }
            });
        });
    };
    return {
        init: init
    };
});