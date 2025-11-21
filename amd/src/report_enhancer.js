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

/* global bootstrap */

define(['jquery', 'core/ajax', 'core/notification', 'core/str'], function($, Ajax, Notification, Str) {

    var config = {}; // eslint-disable-line no-unused-vars

    // Toggle between mock data and real webservice calls
    var useMockData = true;

    // Debug mode: if true, popovers won't auto-close (easier to inspect in DevTools)
    var debugMode = true;

    /**
     * Initialize the report enhancer
     * @param {object} params Configuration parameters
     */
    var init = function(params) {
        config = params;
        // Wait for DOM to be ready
        $(document).ready(function() {
            // Check if we are on the review question page
            if (window.location.pathname.indexOf('reviewquestion.php') !== -1) {
                enhanceReviewQuestionPage();
            } else {
                enhanceReportTable();
            }
        });
    };

    /**
     * Add data-cblue-attempt attribute to each row in the attempts table
     * @returns {Array} Array of attempt IDs found in the table
     */
    var addAttemptDataAttributes = function() {
        // Find the attempts table
        var $attemptsTable = $('#attempts');
        var attemptIds = [];

        if ($attemptsTable.length === 0) {
            console.warn('CheatDetect: Attempts table not found'); // eslint-disable-line no-console
            return attemptIds;
        }

        // Iterate through each row in the tbody
        $attemptsTable.find('tbody tr').each(function() {
            var $row = $(this);

            // Find the review link in this row
            var $reviewLink = $row.find('.reviewlink');

            if ($reviewLink.length > 0) {
                // Get the href attribute
                var href = $reviewLink.attr('href');

                if (href) {
                    // Extract the attempt parameter from the URL
                    var urlParts = href.split('?');
                    if (urlParts.length > 1) {
                        var urlParams = new URLSearchParams(urlParts[1]);
                        var attemptId = urlParams.get('attempt');

                        if (attemptId) {
                            // Add the data attribute to the row
                            $row.attr('data-cblue-attempt', attemptId);
                            // Add to the array (convert to integer)
                            attemptIds.push(parseInt(attemptId, 10));
                            // eslint-disable-next-line no-console
                            console.log('CheatDetect: Added data-cblue-attempt=' + attemptId + ' to row');
                        }
                    }
                }
            }
        });

        return attemptIds;
    };

    /**
     * Add data-cblue-slot attribute to each TD containing reviewquestion.php links
     */
    var addSlotDataAttributes = function() {
        // Find all links to reviewquestion.php
        $('a[href*="reviewquestion.php"]').each(function() {
            var $link = $(this);
            var href = $link.attr('href');

            if (href) {
                var slotId = extractSlotFromUrl(href);
                if (slotId) {
                    // Find the TD parent and add the data attribute
                    var $td = $link.closest('td');
                    $td.attr('data-cblue-slot', slotId);
                    // eslint-disable-next-line no-console
                    console.log('CheatDetect: Added data-cblue-slot=' + slotId + ' to TD');
                }
            }
        });
    };

    /**
     * Fetch bulk attempt summaries from webservice
     * @param {Array} attemptIds Array of attempt IDs to fetch
     */
    var fetchBulkAttemptSummaries = function(attemptIds) {
        if (!attemptIds || attemptIds.length === 0) {
            console.warn('CheatDetect: No attempt IDs provided'); // eslint-disable-line no-console
            return;
        }

        // Determine URL and method based on useMockData flag
        var url = useMockData ?
            M.cfg.wwwroot + '/mod/quiz/accessrule/cheatdetect/mockdata/bulk-attempt-summaries.json' :
            '/local/rest/api/quizaccess_cheatdetect/bulk-attempt-summaries';

        var method = useMockData ? 'GET' : 'POST';
        var payload = useMockData ? null : {attemptids: attemptIds};

        if (useMockData) {
            // eslint-disable-next-line no-console
            console.log('CheatDetect: Using MOCK DATA from file for attempt IDs:', attemptIds);
        } else {
            console.log('CheatDetect: Fetching bulk attempt summaries for IDs:', attemptIds); // eslint-disable-line no-console
        }

        var ajaxConfig = {
            url: url,
            method: method,
            dataType: 'json',
            success: function(response) {
                // eslint-disable-next-line no-console
                console.log('CheatDetect: Bulk attempt summaries response:', response);
                if (response.success && response.data) {
                    processBulkAttemptSummaries(response.data);
                } else {
                    // eslint-disable-next-line no-console
                    console.warn('CheatDetect: Invalid response from bulk summaries webservice', response);
                }
            },
            error: function(xhr, status, error) {
                console.error('CheatDetect: Error fetching bulk attempt summaries', error); // eslint-disable-line no-console
            }
        };

        // Add POST-specific parameters only for real webservice calls
        if (!useMockData) {
            ajaxConfig.contentType = 'application/json';
            ajaxConfig.data = JSON.stringify(payload);
        }

        $.ajax(ajaxConfig);
    };

    /**
     * Create SVG icon element
     * @param {string} iconColor Color of icon: 'red', 'green', or 'gray'
     * @param {string} iconType Type of icon: 'summary' or 'question'
     * @returns {jQuery} jQuery object containing the SVG icon
     */
    var createSvgIcon = function(iconColor, iconType) {
        var iconFile = 'spy-icon-' + iconColor + '.svg';
        var svgPath = M.cfg.wwwroot + '/mod/quiz/accessrule/cheatdetect/pix/' + iconFile;

        var $img = $('<img>')
            .attr('src', svgPath)
            .attr('aria-hidden', 'true')
            .addClass('cheatdetect-svg-icon')
            .attr('data-cblue-spyicon', iconType);

        // Set size (20x20 for all icons)
        if (iconType === 'summary') {
            $img.css({
                'width': '20px',
                'height': '20px',
                'margin-left': '8px',
                'vertical-align': 'middle'
            });
        } else {
            $img.css({
                'width': '20px',
                'height': '20px',
                'display': 'block',
                'margin-top': '4px'
            });
        }

        return $img;
    };

    /**
     * Extract slot number from reviewquestion.php URL
     * @param {string} url URL containing slot parameter
     * @returns {number|null} Slot number or null if not found
     */
    var extractSlotFromUrl = function(url) {
        if (!url) {
            return null;
        }

        var urlParts = url.split('?');
        if (urlParts.length > 1) {
            var urlParams = new URLSearchParams(urlParts[1]);
            var slot = urlParams.get('slot');
            return slot ? parseInt(slot, 10) : null;
        }

        return null;
    };

    /**
     * Generate popover content HTML for a slot
     * @param {object} slotData Slot data from webservice
     * @param {object} strings Translated strings from language files
     * @returns {string} HTML content for the popover
     */
    var generatePopoverContent = function(slotData, strings) {
        // Calculate time in minutes
        var timeInMinutes = Math.round(slotData.time_spent / 60);
        var timePercentage = Math.round(slotData.time_percentage);

        // Build HTML content as a bullet list
        var html = '<ul class="mb-0">';

        // Time spent
        var timeSpentText = strings.timespent
            .replace('{$a->minutes}', timeInMinutes)
            .replace('{$a->percentage}', timePercentage);
        html += '<li>' + timeSpentText + '</li>';

        // Copy count (red if > 0)
        var copyCountText = strings.copycount.replace('{$a}', slotData.copy_count);
        if (slotData.copy_count > 0) {
            html += '<li class="text-danger fw-bold">' + copyCountText + '</li>';
        } else {
            html += '<li>' + copyCountText + '</li>';
        }

        // Focus loss count (red if > 0)
        var focusLossText = strings.focuslosscount.replace('{$a}', slotData.focus_loss_count);
        if (slotData.focus_loss_count > 0) {
            html += '<li class="text-danger fw-bold">' + focusLossText + '</li>';
        } else {
            html += '<li>' + focusLossText + '</li>';
        }

        // Extension detection (red if true)
        var extensionText = slotData.has_extension ? strings.yes : strings.no;
        var extensionDetectedText = strings.extensiondetected.replace('{$a}', extensionText);
        if (slotData.has_extension) {
            html += '<li class="text-danger fw-bold">' + extensionDetectedText + '</li>';
        } else {
            html += '<li>' + extensionDetectedText + '</li>';
        }

        html += '</ul>';

        return html;
    };

    /**
     * Initialize Bootstrap 5 popovers with custom configuration
     */
    var initializePopovers = function() {
        // Check if Bootstrap is available
        if (typeof bootstrap === 'undefined' || !bootstrap.Popover) {
            console.warn('CheatDetect: Bootstrap 5 not available'); // eslint-disable-line no-console
            return;
        }

        // Find all popover trigger elements
        var popoverElements = document.querySelectorAll('[data-bs-toggle="popover"]');

        popoverElements.forEach(function(element) {
            // Check if already initialized
            if (bootstrap.Popover.getInstance(element)) {
                return;
            }

            // Configure popover options
            var popoverConfig = {
                html: true,
                trigger: 'click',
                sanitize: false
            };

            // In debug mode, popovers stay open (easier to inspect in DevTools)
            if (debugMode) {
                popoverConfig.trigger = 'manual';
                element.addEventListener('click', function(e) {
                    e.preventDefault();
                    var popover = bootstrap.Popover.getInstance(element);
                    if (popover) {
                        popover.show();
                    }
                });
            }

            // Initialize popover
            new bootstrap.Popover(element, popoverConfig);
        });

        var message = 'CheatDetect: Initialized ' + popoverElements.length + ' popovers';
        if (debugMode) {
            message += ' (DEBUG MODE: popovers stay open)';
        }
        console.log(message); // eslint-disable-line no-console
    };

    /**
     * Process bulk attempt summaries data
     * @param {Array} summaries Array of attempt summaries from webservice
     */
    var processBulkAttemptSummaries = function(summaries) {
        console.log('CheatDetect: Processing ' + summaries.length + ' attempt summaries'); // eslint-disable-line no-console

        // Load translated strings first
        var stringKeys = [
            {key: 'questiondetails', component: 'quizaccess_cheatdetect'},
            {key: 'timespent', component: 'quizaccess_cheatdetect'},
            {key: 'copycount', component: 'quizaccess_cheatdetect'},
            {key: 'focuslosscount', component: 'quizaccess_cheatdetect'},
            {key: 'extensiondetected', component: 'quizaccess_cheatdetect'},
            {key: 'yes', component: 'quizaccess_cheatdetect'},
            {key: 'no', component: 'quizaccess_cheatdetect'}
        ];

        Str.get_strings(stringKeys).then(function(stringsArray) {
            // Build strings object for easier access
            var strings = {
                questiondetails: stringsArray[0],
                timespent: stringsArray[1],
                copycount: stringsArray[2],
                focuslosscount: stringsArray[3],
                extensiondetected: stringsArray[4],
                yes: stringsArray[5],
                no: stringsArray[6]
            };

            processAttemptSummariesWithStrings(summaries, strings);
        }).catch(function(error) {
            console.error('CheatDetect: Error loading strings', error); // eslint-disable-line no-console
        });
    };

    /**
     * Process attempt summaries with loaded strings
     * @param {Array} summaries Array of attempt summaries from webservice
     * @param {object} strings Translated strings from language files
     */
    var processAttemptSummariesWithStrings = function(summaries, strings) {
        summaries.forEach(function(attemptData) {
            var attemptId = attemptData.attemptid;
            var slots = attemptData.slots;

            // Find the corresponding table row
            var $row = $('tr[data-cblue-attempt="' + attemptId + '"]');

            if ($row.length === 0) {
                console.warn('CheatDetect: Row not found for attempt ' + attemptId); // eslint-disable-line no-console
                return;
            }

            // eslint-disable-next-line no-console
            console.log('CheatDetect: Processing attempt ' + attemptId + ' with ' + slots.length + ' slots');

            var hasRedSlot = false;

            // If slots array is empty, we need to add gray icons to all TDs with data-cblue-slot
            if (!slots || slots.length === 0) {
                // eslint-disable-next-line no-console
                console.log('CheatDetect: No slot data for attempt ' + attemptId + ', using gray icons');

                $row.find('td[data-cblue-slot]').each(function() {
                    var $td = $(this);

                    // Check if icon already added
                    if ($td.find('.cheatdetect-svg-icon').length > 0) {
                        return;
                    }

                    var slotId = $td.attr('data-cblue-slot');
                    var $link = $td.find('a[href*="reviewquestion.php"]').first();

                    if ($link.length > 0) {
                        var $icon = createSvgIcon('gray', 'question');

                        // Generate popover content using translated strings
                        var grayPopoverData = {
                            time_spent: 0,
                            time_percentage: 0,
                            copy_count: 0,
                            focus_loss_count: 0,
                            has_extension: false
                        };
                        var grayPopoverContent = generatePopoverContent(grayPopoverData, strings);

                        var $iconButton = $('<button>')
                            .attr('type', 'button')
                            .attr('data-bs-toggle', 'popover')
                            .attr('data-bs-trigger', 'click')
                            .attr('data-bs-html', 'true')
                            .attr('data-bs-title', strings.questiondetails)
                            .attr('data-bs-content', grayPopoverContent)
                            .attr('data-bs-placement', 'left')
                            .addClass('btn btn-link p-0')
                            .css({
                                'border': 'none',
                                'background': 'none',
                                'cursor': 'pointer',
                                'display': 'inline-block'
                            })
                            .append($icon);

                        $td.append($iconButton);
                        // eslint-disable-next-line no-console
                        console.log('CheatDetect: Added gray icon for slot ' + slotId);
                    }
                });
            } else {
                // Process each slot from the webservice data
                slots.forEach(function(slotData) {
                    var slotId = slotData.slot;

                    // Find the TD with both data-cblue-attempt (via parent row) and data-cblue-slot
                    var $td = $row.find('td[data-cblue-slot="' + slotId + '"]');

                    if ($td.length === 0) {
                        // eslint-disable-next-line no-console
                        console.warn('CheatDetect: TD not found for attempt ' + attemptId + ' slot ' + slotId);
                        return;
                    }

                    // Check if icon already added
                    if ($td.find('.cheatdetect-svg-icon').length > 0) {
                        return;
                    }

                    // Determine icon color based on cheat_detected
                    var iconColor = slotData.cheat_detected ? 'red' : 'green';

                    if (slotData.cheat_detected) {
                        hasRedSlot = true;
                    }

                    // Find the link in this TD
                    var $link = $td.find('a[href*="reviewquestion.php"]').first();

                    if ($link.length > 0) {
                        var $icon = createSvgIcon(iconColor, 'question');

                        // Generate popover content with translated strings
                        var popoverContent = generatePopoverContent(slotData, strings);

                        var $iconButton = $('<button>')
                            .attr('type', 'button')
                            .attr('data-bs-toggle', 'popover')
                            .attr('data-bs-trigger', 'click')
                            .attr('data-bs-html', 'true')
                            .attr('data-bs-title', strings.questiondetails)
                            .attr('data-bs-content', popoverContent)
                            .attr('data-bs-placement', 'left')
                            .addClass('btn btn-link p-0')
                            .css({
                                'border': 'none',
                                'background': 'none',
                                'cursor': 'pointer',
                                'display': 'inline-block'
                            })
                            .append($icon);

                        $td.append($iconButton);
                        // eslint-disable-next-line no-console
                        console.log('CheatDetect: Added ' + iconColor + ' icon for slot ' + slotId +
                                    ' (cheat_detected: ' + slotData.cheat_detected + ')');
                    }
                });
            }

            // Process summary icon (in the review link)
            var $reviewLink = $row.find('.reviewlink');
            if ($reviewLink.length > 0) {
                var $oldEyeIcon = $reviewLink.find('.cheatdetect-icon');

                if ($oldEyeIcon.length > 0) {
                    // Use gray if no slots, red if any slot is red, green otherwise
                    var summaryColor = (!slots || slots.length === 0) ? 'gray' : (hasRedSlot ? 'red' : 'green');
                    var $newEyeIcon = createSvgIcon(summaryColor, 'summary');
                    $oldEyeIcon.replaceWith($newEyeIcon);
                    // eslint-disable-next-line no-console
                    console.log('CheatDetect: Replaced summary icon for attempt ' + attemptId +
                                ' (color: ' + summaryColor + ')');
                }
            }
        });

        console.log('CheatDetect: Finished processing all attempt summaries'); // eslint-disable-line no-console

        // Initialize popovers with sanitize: false to allow red color styles
        initializePopovers();
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

        // Add data-cblue-attempt attributes to table rows and collect attempt IDs
        var attemptIds = addAttemptDataAttributes();

        // Add data-cblue-slot attributes to TDs containing reviewquestion.php links
        addSlotDataAttributes();

        // Add icons next to "Relecture de cette tentative" links
        addIconsToReviewLinks();

        // Fetch bulk attempt summaries if we have attempt IDs
        if (attemptIds.length === 0) {
            console.warn('CheatDetect: No attempts found'); // eslint-disable-line no-console
            return;
        }

        // Fetch bulk attempt summaries from webservice
        fetchBulkAttemptSummaries(attemptIds);

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