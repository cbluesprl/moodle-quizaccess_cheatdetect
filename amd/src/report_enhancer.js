/**
 * This JS is made to enhance the /mod/quiz/report.php?id=X&mode=overview core_moodle report table
 * and /mod/quiz/reviewquestion.php pages
 *
 * @module     quizaccess_cheatdetect/report_enhancer
 * @package
 * @copyright   2025 CBlue SPRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

define(['jquery', 'core/ajax', 'core/notification', 'core/str'], function($, Ajax, Notification, Str) {

    var config = {}; // eslint-disable-line no-unused-vars

    /**
     * Initialize the report enhancer
     * @param {object} params Configuration parameters
     */
    var init = function(params) {
        config = params;
        // Wait for DOM to be ready
        $(document).ready(function() {
            enhanceReportTable();
            enhanceReviewQuestionPage();
        });
    };

    /**
     * Enhance the report table with cheat detection information
     */
    var enhanceReportTable = function() {
        // Find the report table
        var domtable = $('table.generaltable');

        if (domtable.length === 0) {
            console.warn('CheatDetect: Report table not found'); // eslint-disable-line no-console
            return;
        }

        console.log('CheatDetect: Enhancing report table'); // eslint-disable-line no-console

        // Add icons next to "Relecture de cette tentative" links
        addIconsToReviewLinks();

        // Add icons next to question results
        addIconsToQuestionResults();

        // Get all attempt IDs from the table
        var attemptIds = [1, 45, 78]; // Futur : extractAttemptIds($table);

        if (attemptIds.length === 0) {
            console.warn('CheatDetect: No attempts found'); // eslint-disable-line no-console
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

    /**
     * Enhance the review question page with cheat detection summary
     */
    var enhanceReviewQuestionPage = function() {
        console.log('CheatDetect: Enhancing review question page'); // eslint-disable-line no-console

        // Extract attempt and slot from URL parameters
        var attemptId = getUrlParameter('attempt');
        var slotId = getUrlParameter('slot');

        if (!attemptId || !slotId) {
            console.warn('CheatDetect: Missing attempt or slot parameter in URL'); // eslint-disable-line no-console
            return;
        }

        // Fetch attempt summary data from webservice
        fetchAttemptSummary(attemptId, slotId);
    };

    /**
     * Get URL parameter value by name
     * @param {string} name Parameter name
     * @returns {string|null} Parameter value or null if not found
     */
    var getUrlParameter = function(name) {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    };

    /**
     * Fetch attempt summary data from webservice
     * @param {string} attemptId Attempt ID
     * @param {string} slotId Slot ID
     */
    var fetchAttemptSummary = function(attemptId, slotId) {
        var url = '/local/rest/api/quizaccess_cheatdetect/attempt-summary/' + attemptId + '/slots/' + slotId;

        $.ajax({
            url: url,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.data) {
                    createCheatDetectResumeBlock(response.data);
                } else {
                    console.warn('CheatDetect: Invalid response from webservice', response); // eslint-disable-line no-console
                }
            },
            error: function(xhr, status, error) {
                console.error('CheatDetect: Error fetching attempt summary', error); // eslint-disable-line no-console
            }
        });
    };

    /**
     * Create and display the cheat detection resume block
     * @param {object} data Attempt summary data from webservice
     */
    var createCheatDetectResumeBlock = function(data) {
        // Check if block already exists
        if ($('.cheatdetect_resume').length > 0) {
            return;
        }

        // Convert time_spent from seconds to minutes
        var timeInMinutes = Math.round(data.time_spent / 60);
        var timePercentage = Math.round(data.time_percentage);

        // Load translated strings
        var stringKeys = [
            {key: 'timespent', component: 'quizaccess_cheatdetect'},
            {key: 'copycount', component: 'quizaccess_cheatdetect'},
            {key: 'focuslosscount', component: 'quizaccess_cheatdetect'},
            {key: 'extensiondetected', component: 'quizaccess_cheatdetect'},
            {key: 'yes', component: 'quizaccess_cheatdetect'},
            {key: 'no', component: 'quizaccess_cheatdetect'}
        ];

        Str.get_strings(stringKeys).then(function(strings) {
            var timeSpentStr = strings[0];
            var copyCountStr = strings[1];
            var focusLossCountStr = strings[2];
            var extensionDetectedStr = strings[3];
            var yesStr = strings[4];
            var noStr = strings[5];

            // Determine extension detection text
            var extensionText = data.has_extension ? yesStr : noStr;

            // Create the resume block HTML
            var $resumeBlock = $('<div>')
                .addClass('cheatdetect_resume')
                .css({
                    'background-color': '#d3d3d3',
                    'padding': '1rem 1rem',
                    'margin-bottom': '1rem',
                    'border': 'var(--bs-border-width) solid #fff0',
                    'border-radius': 'var(--bs-border-radius)',
                    'font-size': '14px',
                    'line-height': '1.6'
                });

            // Time spent line
            var timeSpentText = timeSpentStr
                .replace('{$a->minutes}', timeInMinutes)
                .replace('{$a->percentage}', timePercentage);
            var $timeLine = $('<div>').text(timeSpentText);

            // Copy count line (in red if > 0)
            var copyCountText = copyCountStr.replace('{$a}', data.copy_count);
            var $copyLine = $('<div>')
                .text(copyCountText)
                .css('color', data.copy_count > 0 ? '#ff0000' : 'inherit');

            // Focus loss count line (in red if > 0)
            var focusLossCountText = focusLossCountStr.replace('{$a}', data.focus_loss_count);
            var $focusLine = $('<div>')
                .text(focusLossCountText)
                .css('color', data.focus_loss_count > 0 ? '#ff0000' : 'inherit');

            // Extension detection line
            var extensionDetectedText = extensionDetectedStr.replace('{$a}', extensionText);
            var $extensionLine = $('<div>').text(extensionDetectedText);

            // Append all lines to the block
            $resumeBlock.append($timeLine)
                .append($copyLine)
                .append($focusLine)
                .append($extensionLine);

            // Insert the block after the .outcome element
            var $outcomeContainer = $('.outcome');
            if ($outcomeContainer.length > 0) {
                $outcomeContainer.after($resumeBlock);
            } else {
                // Fallback: insert at the top of the question container
                var $targetContainer = $('.que');
                if ($targetContainer.length > 0) {
                    $targetContainer.prepend($resumeBlock);
                } else {
                    // Last fallback: insert after the page header
                    $('#page-content').prepend($resumeBlock);
                }
            }

            console.log('CheatDetect: Resume block added successfully'); // eslint-disable-line no-console
        }).catch(function(error) {
            console.error('CheatDetect: Error loading strings', error); // eslint-disable-line no-console
        });
    };

    return {
        init: init
    };
});