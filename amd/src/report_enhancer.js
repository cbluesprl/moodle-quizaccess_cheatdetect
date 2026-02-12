/**
 * @fileoverview Report enhancer module for quiz cheat detection visualization
 *
 * This module enhances the /mod/quiz/report.php?id=X&mode=overview core Moodle report table
 * and /mod/quiz/reviewquestion.php pages with cheat detection indicators and popovers.
 *
 * @module     quizaccess_cheatdetect/report_enhancer
 * @copyright  2025 CBlue SPRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     gnormand@cblue.be, jdeboysere@cblue.be
 * @since      1.0.0
 */

define(['jquery', 'core/ajax', 'core/notification', 'core/str', 'theme_boost/bootstrap/popover'],
function($, Ajax, Notification, Str, Popover) {

    // Toggle console logging for debugging
    const SHOW_CONSOLE_LOG = false;

    /**
     * Initialize the report enhancer
     * @param {object} params Configuration parameters (unused, reserved for future use)
     */
    var init = function(params) { // eslint-disable-line no-unused-vars
        // Wait for DOM to be ready
        $(document).ready(function() {
            if (window.location.pathname.indexOf('/mod/quiz/report.php') !== -1) {
                enhanceReportTable();
            } else if (window.location.pathname.indexOf('/mod/quiz/reviewquestion.php') !== -1) {
                enhanceReviewQuestionPage();
            } else if (window.location.pathname.indexOf('/mod/quiz/review.php') !== -1) {
                enhanceReviewQuestionPage();
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
            if (SHOW_CONSOLE_LOG) {
                console.warn('CheatDetect: Attempts table not found'); // eslint-disable-line no-console
            }
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
                            if (SHOW_CONSOLE_LOG) {
                                // eslint-disable-next-line no-console
                                console.log('CheatDetect: Added data-cblue-attempt=' + attemptId + ' to row');
                            }
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
                    if (SHOW_CONSOLE_LOG) {
                        // eslint-disable-next-line no-console
                        console.log('CheatDetect: Added data-cblue-slot=' + slotId + ' to TD');
                    }
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
            if (SHOW_CONSOLE_LOG) {
                console.warn('CheatDetect: No attempt IDs provided'); // eslint-disable-line no-console
            }
            return;
        }

        Ajax.call([{
            methodname: 'quizaccess_cheatdetect_get_bulk_attempt_summaries',
            args: {
                attemptids: attemptIds
            }
        }])[0].then(function(response) {
            if (SHOW_CONSOLE_LOG) {
                // eslint-disable-next-line no-console
                console.log('CheatDetect: Bulk attempt summaries response:', response);
            }

            if (Array.isArray(response)) {
                processBulkAttemptSummaries(response);
            }
        }).catch(function(error) {
            if (SHOW_CONSOLE_LOG) {
                // eslint-disable-next-line no-console
                console.log('CheatDetect: AJAX error fetching bulk attempt summaries', error);
            }
            Notification.exception(error);
        });

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
     * Extract attempt ID from URL query parameter
     * @returns {string|null} Attempt ID from URL parameter or null if not found
     */
    var getAttemptIdFromUrl = function() {
        var urlParams = new URLSearchParams(window.location.search);
        var attemptId = urlParams.get('attempt');

        if (!attemptId) {
            if (SHOW_CONSOLE_LOG) {
                console.warn('CheatDetect: No attempt parameter found in URL'); // eslint-disable-line no-console
            }
            return null;
        }

        if (SHOW_CONSOLE_LOG) {
            console.log('CheatDetect: Attempt parameter found in URL (' + attemptId + ')'); // eslint-disable-line no-console
        }
        return attemptId;
    };

    /**
     * Format duration from seconds to human readable string
     * Handles days, hours, minutes, seconds with proper singular/plural
     * @param {number} totalSeconds Time spent in seconds
     * @param {object} strings Translated strings containing day/days/hour/hours/minute/minutes/second/seconds
     * @returns {string} Formatted duration string (e.g., "2 hours 30 minutes 15 seconds")
     */
    var formatDuration = function(totalSeconds, strings) {
        var days = Math.floor(totalSeconds / 86400);
        var hours = Math.floor((totalSeconds % 86400) / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = Math.floor(totalSeconds % 60);

        var parts = [];

        if (days > 0) {
            parts.push(days + ' ' + (days > 1 ? strings.days : strings.day));
        }
        if (hours > 0) {
            parts.push(hours + ' ' + (hours > 1 ? strings.hours : strings.hour));
        }
        if (minutes > 0) {
            parts.push(minutes + ' ' + (minutes > 1 ? strings.minutes : strings.minute));
        }
        // Show seconds only if less than 1 hour, or if it's the only unit
        if (seconds > 0 && (days === 0 && hours === 0) || parts.length === 0) {
            parts.push(seconds + ' ' + (seconds > 1 ? strings.seconds : strings.second));
        }

        // If all values are 0, show "0 second"
        if (parts.length === 0) {
            parts.push('0 ' + strings.second);
        }

        return parts.join(' ');
    };

    /**
     * Generate popover content HTML for a slot
     * @param {object} slotData Slot data from webservice
     * @param {object} strings Translated strings from language files
     * @param {number|string} slotId The slot/question number
     * @returns {string} HTML content for the popover
     */
    var generatePopoverContent = function(slotData, strings, slotId) {
        // Format duration with appropriate units
        var durationText = formatDuration(slotData.time_spent, strings);
        var timePercentage = Math.round(slotData.time_percentage);

        // Build HTML content as bullet list
        var html = '<ul class="mb-0">';

        // Time spent (with slot number)
        var timeSpentText = strings.timespent
            .replace('{$a->duration}', durationText)
            .replace('{$a->percentage}', timePercentage)
            .replace('{$a->slot}', slotId);
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
     * Initialize Bootstrap popovers using jQuery (works with Bootstrap 4 and 5)
     */
    var initializePopovers = function() {
        // Find all popover trigger elements
        var $popoverElements = $('[data-bs-toggle="popover"]');

        $popoverElements.each(function() {
            var $element = $(this);

            // Check if already initialized
            if ($element.data('cheatdetect-initialized')) {
                return;
            }
            $element.data('cheatdetect-initialized', true);

            // Get original content
            var originalContent = $element.attr('data-bs-content') || '';
            var title = $element.attr('data-bs-title') || '';

            // Initialize popover with Bootstrap Popover constructor
            var popoverInstance = new Popover($element[0], {
                html: true,
                trigger: 'manual',
                placement: 'left',
                title: title,
                content: originalContent,
                sanitize: false
            });

            // Store instance for later use
            $element.data('popover-instance', popoverInstance);

            // Desktop: show on hover (only for non-touch devices)
            $element.on('mouseenter', function() {
                // Skip on touch devices (they use click/tap)
                if ('ontouchstart' in window) {
                    return;
                }
                // Skip if popover already visible for this element
                if ($element.attr('aria-describedby')) {
                    return;
                }
                $element.data('popover-hover', true);
                // Hide any other open popovers first
                hideAllPopoversExcept($element);
                popoverInstance.show();
            });

            // Desktop: hide on mouse leave (with delay to allow moving to popover)
            $element.on('mouseleave', function(e) {
                // Skip on touch devices
                if ('ontouchstart' in window) {
                    return;
                }
                // Check if mouse moved to the popover itself
                var $relatedTarget = $(e.relatedTarget);
                if ($relatedTarget.closest('.popover').length > 0) {
                    // Mouse moved to popover, don't hide
                    $element.data('popover-inside', true);
                    return;
                }
                $element.data('popover-hover', false);
                setTimeout(function() {
                    // Don't hide if mouse is back on trigger or inside popover
                    if (!$element.data('popover-hover') && !$element.data('popover-inside')) {
                        popoverInstance.hide();
                    }
                }, 300);
            });

            // Mobile/Tablet & Keyboard: toggle on click/tap/enter
            $element.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var isVisible = $element.attr('aria-describedby');
                hideAllPopovers();
                if (!isVisible) {
                    popoverInstance.show();
                }
            });

            // Keyboard accessibility: Enter and Space to toggle, Escape to close
            $element.on('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    var isVisible = $element.attr('aria-describedby');
                    hideAllPopovers();
                    if (!isVisible) {
                        popoverInstance.show();
                    }
                } else if (e.key === 'Escape') {
                    popoverInstance.hide();
                }
            });

            // Ensure button is focusable and has proper ARIA attributes
            $element.attr('tabindex', '0');
            $element.attr('role', 'button');
            $element.attr('aria-expanded', 'false');

            // Update aria-expanded when popover shows/hides
            $element.on('shown.bs.popover', function() {
                $element.attr('aria-expanded', 'true');
            });
            $element.on('hidden.bs.popover', function() {
                $element.attr('aria-expanded', 'false');
                $element.data('popover-hover', false);
                $element.data('popover-inside', false);
            });
        });

        // Setup close handlers
        setupPopoverCloseHandlers();

        if (SHOW_CONSOLE_LOG) {
            // eslint-disable-next-line no-console
            console.log('CheatDetect: Initialized ' + $popoverElements.length + ' Bootstrap popovers');
        }
    };

    /**
     * Hide all Bootstrap popovers except the specified element
     * @param {jQuery} $except Element to exclude from hiding
     */
    var hideAllPopoversExcept = function($except) {
        $('[data-bs-toggle="popover"]').each(function() {
            var $el = $(this);
            if (!$except || $el[0] !== $except[0]) {
                var instance = $el.data('popover-instance');
                if (instance) {
                    instance.hide();
                }
            }
        });
    };

    /**
     * Hide all Bootstrap popovers
     */
    var hideAllPopovers = function() {
        $('[data-bs-toggle="popover"]').each(function() {
            var instance = $(this).data('popover-instance');
            if (instance) {
                instance.hide();
            }
        });
    };

    /**
     * Setup event handlers for popover hover behavior
     */
    var setupPopoverCloseHandlers = function() {
        // Track mouse entering popover content (desktop only)
        $(document).off('mouseenter.cheatdetect', '.popover');
        $(document).on('mouseenter.cheatdetect', '.popover', function() {
            if ('ontouchstart' in window) {
                return;
            }
            var popoverId = $(this).attr('id');
            var $trigger = $('[aria-describedby="' + popoverId + '"]');
            $trigger.data('popover-inside', true);
        });

        // Track mouse leaving popover content (desktop only)
        $(document).off('mouseleave.cheatdetect', '.popover');
        $(document).on('mouseleave.cheatdetect', '.popover', function() {
            if ('ontouchstart' in window) {
                return;
            }
            var popoverId = $(this).attr('id');
            var $trigger = $('[aria-describedby="' + popoverId + '"]');
            $trigger.data('popover-inside', false);
            // Hide after a small delay
            setTimeout(function() {
                if (!$trigger.data('popover-hover') && !$trigger.data('popover-inside')) {
                    var instance = $trigger.data('popover-instance');
                    if (instance) {
                        instance.hide();
                    }
                }
            }, 300);
        });

        // Prevent clicks inside popover from bubbling
        $(document).off('click.cheatdetect-inside', '.popover');
        $(document).on('click.cheatdetect-inside', '.popover', function(e) {
            e.stopPropagation();
        });

        // Handle click/tap outside to close popovers
        $(document).off('click.cheatdetect-outside touchend.cheatdetect-outside');
        $(document).on('click.cheatdetect-outside touchend.cheatdetect-outside', function(e) {
            if ($(e.target).closest('[data-bs-toggle="popover"]').length > 0) {
                return;
            }
            if ($(e.target).closest('.popover').length > 0) {
                return;
            }
            hideAllPopovers();
        });

        // Global Escape key handler to close any open popover
        $(document).off('keydown.cheatdetect-escape');
        $(document).on('keydown.cheatdetect-escape', function(e) {
            if (e.key === 'Escape') {
                hideAllPopovers();
            }
        });
    };

    /**
     * Process bulk attempt summaries data
     * @param {Array} summaries Array of attempt summaries from webservice
     */
    var processBulkAttemptSummaries = function(summaries) {
        if (SHOW_CONSOLE_LOG) {
            console.log('CheatDetect: Processing ' + summaries.length + ' attempt summaries'); // eslint-disable-line no-console
        }

        // Load translated strings first
        var stringKeys = [
            {key: 'questiondetails', component: 'quizaccess_cheatdetect'},
            {key: 'timespent', component: 'quizaccess_cheatdetect'},
            {key: 'day', component: 'quizaccess_cheatdetect'},
            {key: 'days', component: 'quizaccess_cheatdetect'},
            {key: 'hour', component: 'quizaccess_cheatdetect'},
            {key: 'hours', component: 'quizaccess_cheatdetect'},
            {key: 'minute', component: 'quizaccess_cheatdetect'},
            {key: 'minutes', component: 'quizaccess_cheatdetect'},
            {key: 'second', component: 'quizaccess_cheatdetect'},
            {key: 'seconds', component: 'quizaccess_cheatdetect'},
            {key: 'copycount', component: 'quizaccess_cheatdetect'},
            {key: 'focuslosscount', component: 'quizaccess_cheatdetect'},
            {key: 'extensiondetected', component: 'quizaccess_cheatdetect'},
            {key: 'yes', component: 'quizaccess_cheatdetect'},
            {key: 'no', component: 'quizaccess_cheatdetect'},
            {key: 'closepopover', component: 'quizaccess_cheatdetect'},
            {key: 'multiplepageswarning', component: 'quizaccess_cheatdetect'},
            {key: 'cheatdetection', component: 'quizaccess_cheatdetect'}
        ];

        Str.get_strings(stringKeys).then(function(stringsArray) {
            // Build strings object for easier access
            var strings = {
                questiondetails: stringsArray[0],
                timespent: stringsArray[1],
                day: stringsArray[2],
                days: stringsArray[3],
                hour: stringsArray[4],
                hours: stringsArray[5],
                minute: stringsArray[6],
                minutes: stringsArray[7],
                second: stringsArray[8],
                seconds: stringsArray[9],
                copycount: stringsArray[10],
                focuslosscount: stringsArray[11],
                extensiondetected: stringsArray[12],
                yes: stringsArray[13],
                no: stringsArray[14],
                closepopover: stringsArray[15],
                multiplepageswarning: stringsArray[16],
                cheatdetection: stringsArray[17]
            };

            processAttemptSummariesWithStrings(summaries, strings);
        }).catch(function(error) {
            if (SHOW_CONSOLE_LOG) {
                console.error('CheatDetect: Error loading strings', error); // eslint-disable-line no-console
            }
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
                if (SHOW_CONSOLE_LOG) {
                    console.warn('CheatDetect: Row not found for attempt ' + attemptId); // eslint-disable-line no-console
                }
                return;
            }

            if (SHOW_CONSOLE_LOG) {
                // eslint-disable-next-line no-console
                console.log('CheatDetect: Processing attempt ' + attemptId + ' with ' + slots.length + ' slots');
            }

            // Check if quiz has multiple questions per page (tracking not reliable in this case)
            var hasOnlyOneQuestionPerPage = attemptData.summary &&
                                             attemptData.summary.has_only_one_question_per_page === true;

            // If has_only_one_question_per_page is false, use gray-strike icon and skip slot icons
            if (hasOnlyOneQuestionPerPage === false) {
                if (SHOW_CONSOLE_LOG) {
                    // eslint-disable-next-line no-console
                    console.log('CheatDetect: Quiz has multiple questions per page, using gray-strike icon for attempt ' +
                                attemptId);
                }

                // Only process summary icon with gray-strike color, skip slot icons
                var $reviewLinkStrike = $row.find('.reviewlink');
                if ($reviewLinkStrike.length > 0) {
                    var $oldEyeIconStrike = $reviewLinkStrike.siblings('.cheatdetect-icon');
                    if ($oldEyeIconStrike.length > 0) {
                        var $newEyeIconStrike = createSvgIcon('gray-strike', 'summary');

                        // Create button with popover (same style as question icons)
                        var $iconButtonStrike = $('<button>')
                            .attr('type', 'button')
                            .attr('data-bs-toggle', 'popover')
                            .attr('data-bs-trigger', 'click')
                            .attr('data-bs-html', 'true')
                            .attr('data-bs-title', strings.cheatdetection || 'Cheat Detection')
                            .attr('data-bs-content', strings.multiplepageswarning)
                            .attr('data-bs-placement', 'left')
                            .addClass('btn btn-link p-0 cheatdetect-icon-button')
                            .append($newEyeIconStrike);

                        $oldEyeIconStrike.replaceWith($iconButtonStrike);
                        if (SHOW_CONSOLE_LOG) {
                            // eslint-disable-next-line no-console
                            console.log('CheatDetect: Replaced summary icon with gray-strike for attempt ' + attemptId);
                        }
                    }
                }
                return; // Skip to next attempt, don't process slot icons
            }

            var hasRedSlot = false;

            // If slots array is empty, we need to add gray icons to all TDs with data-cblue-slot
            if (!slots || slots.length === 0) {
                if (SHOW_CONSOLE_LOG) {
                    // eslint-disable-next-line no-console
                    console.log('CheatDetect: No slot data for attempt ' + attemptId + ', using gray icons');
                }

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
                        var grayPopoverContent = generatePopoverContent(grayPopoverData, strings, slotId);

                        var $iconButton = $('<button>')
                            .attr('type', 'button')
                            .attr('data-bs-toggle', 'popover')
                            .attr('data-bs-trigger', 'click')
                            .attr('data-bs-html', 'true')
                            .attr('data-bs-title', strings.questiondetails)
                            .attr('data-bs-content', grayPopoverContent)
                            .attr('data-bs-placement', 'left')
                            .addClass('btn btn-link p-0 cheatdetect-icon-button')
                            .append($icon);

                        $td.append($iconButton);
                        if (SHOW_CONSOLE_LOG) {
                            // eslint-disable-next-line no-console
                            console.log('CheatDetect: Added gray icon for slot ' + slotId);
                        }
                    }
                });
            } else {
                // Process each slot from the webservice data
                slots.forEach(function(slotData) {
                    var slotId = slotData.slot;

                    // Find the TD with both data-cblue-attempt (via parent row) and data-cblue-slot
                    var $td = $row.find('td[data-cblue-slot="' + slotId + '"]');

                    if ($td.length === 0) {
                        if (SHOW_CONSOLE_LOG) {
                            // eslint-disable-next-line no-console
                            console.warn('CheatDetect: TD not found for attempt ' + attemptId + ' slot ' + slotId);
                        }
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
                        var popoverContent = generatePopoverContent(slotData, strings, slotId);

                        var $iconButton = $('<button>')
                            .attr('type', 'button')
                            .attr('data-bs-toggle', 'popover')
                            .attr('data-bs-trigger', 'click')
                            .attr('data-bs-html', 'true')
                            .attr('data-bs-title', strings.questiondetails)
                            .attr('data-bs-content', popoverContent)
                            .attr('data-bs-placement', 'left')
                            .addClass('btn btn-link p-0 cheatdetect-icon-button')
                            .append($icon);

                        $td.append($iconButton);
                        if (SHOW_CONSOLE_LOG) {
                            // eslint-disable-next-line no-console
                            console.log('CheatDetect: Added ' + iconColor + ' icon for slot ' + slotId +
                                        ' (cheat_detected: ' + slotData.cheat_detected + ')');
                        }
                    }
                });
            }

            // Process summary icon (outside the review link, as sibling)
            var $reviewLink = $row.find('.reviewlink');
            if ($reviewLink.length > 0) {
                var $oldEyeIcon = $reviewLink.siblings('.cheatdetect-icon');

                if ($oldEyeIcon.length > 0) {
                    // Use gray if no slots, red if any slot is red, green otherwise
                    var summaryColor = (!slots || slots.length === 0) ? 'gray' : (hasRedSlot ? 'red' : 'green');
                    var $newEyeIcon = createSvgIcon(summaryColor, 'summary');
                    $oldEyeIcon.replaceWith($newEyeIcon);
                    if (SHOW_CONSOLE_LOG) {
                        // eslint-disable-next-line no-console
                        console.log('CheatDetect: Replaced summary icon for attempt ' + attemptId +
                                    ' (color: ' + summaryColor + ')');
                    }
                }
            }
        });

        if (SHOW_CONSOLE_LOG) {
            console.log('CheatDetect: Finished processing all attempt summaries'); // eslint-disable-line no-console
        }

        // Initialize popovers with sanitize: false to allow red color styles
        initializePopovers();
    };

    /**
     * Enhance the report table with cheat detection information
     * Adds data attributes, icons, and fetches cheat detection summaries
     * @function enhanceReportTable
     * @returns {Array|undefined} Array of attempt IDs or undefined if no table found
     * @since 1.0.0
     */
    var enhanceReportTable = function() {
        // Find the report table
        var domtable = $('table.generaltable');

        if (domtable.length === 0) {
            if (SHOW_CONSOLE_LOG) {
                console.warn('CheatDetect: Report table not found'); // eslint-disable-line no-console
            }
            return;
        }

        if (SHOW_CONSOLE_LOG) {
            console.log('CheatDetect: Enhancing report table'); // eslint-disable-line no-console
        }

        // Add data-cblue-attempt attributes to table rows and collect attempt IDs
        var attemptIds = addAttemptDataAttributes();

        // Add data-cblue-slot attributes to TDs containing reviewquestion.php links
        addSlotDataAttributes();

        // Add icons next to "Relecture de cette tentative" links
        addIconsToReviewLinks();

        // Fetch bulk attempt summaries if we have attempt IDs
        if (attemptIds.length === 0) {
            if (SHOW_CONSOLE_LOG) {
                console.warn('CheatDetect: No attempts found'); // eslint-disable-line no-console
            }
            return;
        }

        // Fetch bulk attempt summaries from webservice
        fetchBulkAttemptSummaries(attemptIds);

        return attemptIds;

    };

    /**
     * Add eye icons next to review attempt links
     * Icons will be replaced with colored SVG icons after data is fetched
     * @function addIconsToReviewLinks
     * @returns {void}
     * @since 1.0.0
     */
    var addIconsToReviewLinks = function() {
        // Find all review links
        $('.reviewlink').each(function() {
            var $link = $(this);

            // Check if icon already added (now outside the link, as sibling)
            if ($link.siblings('.cheatdetect-icon').length > 0) {
                return;
            }

            // Create icon element
            var $icon = $('<i>')
                .addClass('fa fa-eye cheatdetect-icon')
                .attr('aria-hidden', 'true');

            // Insert icon after the link (outside, not inside)
            $link.after($icon);
        });
    };


    /**
     * Enhance the review question page with cheat detection summary
     * Finds all #question-X-Y elements and injects summary blocks
     */
    var enhanceReviewQuestionPage = function() {
        if (SHOW_CONSOLE_LOG) {
            console.log('CheatDetect: Enhancing review question page'); // eslint-disable-line no-console
        }

        // Get attemptId from URL parameter
        var attemptId = getAttemptIdFromUrl();

        if (!attemptId) {
            if (SHOW_CONSOLE_LOG) {
                console.warn('CheatDetect: Cannot enhance review page without attempt ID'); // eslint-disable-line no-console
            }
            return;
        }

        // Find all question elements with pattern #question-{number}-{number}
        var questionElements = $('[id^="question-"]').filter(function() {
            return /^question-\d+-\d+$/.test(this.id);
        });

        if (questionElements.length === 0) {
            if (SHOW_CONSOLE_LOG) {
                console.warn('CheatDetect: No question elements found'); // eslint-disable-line no-console
            }
            return;
        }

        if (SHOW_CONSOLE_LOG) {
            console.log('CheatDetect: Found ' + questionElements.length + ' question elements'); // eslint-disable-line no-console
        }

        // Process each question element
        questionElements.each(function() {
            var $questionElement = $(this);
            var elementId = $questionElement.attr('id');

            // Extract slotId from element ID (attemptId comes from URL)
            var matches = elementId.match(/^question-\d+-(\d+)$/);
            if (matches) {
                var slotId = matches[1];

                if (SHOW_CONSOLE_LOG) {
                    // eslint-disable-next-line no-console
                    console.log('CheatDetect: Processing question element - attempt: ' + attemptId + ', slot: ' + slotId);
                }

                fetchAttemptSummary(attemptId, slotId, $questionElement);
            }
        });
    };

    /**
     * Fetch attempt summary data from webservice
     * @param {string} attemptId Attempt ID
     * @param {string} slotId Slot ID
     * @param {jQuery} $questionElement The question element to inject the summary into
     */
    var fetchAttemptSummary = function(attemptId, slotId, $questionElement) {
        Ajax.call([{
            methodname: 'quizaccess_cheatdetect_get_slot_summary',
            args: {
                attemptid: attemptId,
                slot: slotId
            }
        }])[0].then(function(response) {
            if (response) {
                createCheatDetectResumeBlock(response, $questionElement, slotId);
            } else if (SHOW_CONSOLE_LOG) {
                // eslint-disable-next-line no-console
                console.warn('CheatDetect: Empty slot summary response');
            }
        }).catch(function(error) {
            if (SHOW_CONSOLE_LOG) {
                // eslint-disable-next-line no-console
                console.error('CheatDetect: AJAX error fetching slot summary', error);
            }
            Notification.exception(error);
        });

    };

    /**
     * Create and display the cheat detection resume block
     * @param {object} data Attempt summary data from webservice
     * @param {jQuery} $questionElement The question element to inject the summary into
     * @param {string} slotId The slot/question number
     */
    var createCheatDetectResumeBlock = function(data, $questionElement, slotId) {
        // Check if block already exists in this question element
        if ($questionElement.find('.cheatdetect_resume').length > 0) {
            return;
        }

        var timePercentage = Math.round(data.time_percentage);

        // Load translated strings
        var stringKeys = [
            {key: 'timespent', component: 'quizaccess_cheatdetect'},
            {key: 'day', component: 'quizaccess_cheatdetect'},
            {key: 'days', component: 'quizaccess_cheatdetect'},
            {key: 'hour', component: 'quizaccess_cheatdetect'},
            {key: 'hours', component: 'quizaccess_cheatdetect'},
            {key: 'minute', component: 'quizaccess_cheatdetect'},
            {key: 'minutes', component: 'quizaccess_cheatdetect'},
            {key: 'second', component: 'quizaccess_cheatdetect'},
            {key: 'seconds', component: 'quizaccess_cheatdetect'},
            {key: 'copycount', component: 'quizaccess_cheatdetect'},
            {key: 'focuslosscount', component: 'quizaccess_cheatdetect'},
            {key: 'extensiondetected', component: 'quizaccess_cheatdetect'},
            {key: 'yes', component: 'quizaccess_cheatdetect'},
            {key: 'no', component: 'quizaccess_cheatdetect'}
        ];

        Str.get_strings(stringKeys).then(function(stringsArray) {
            var strings = {
                timespent: stringsArray[0],
                day: stringsArray[1],
                days: stringsArray[2],
                hour: stringsArray[3],
                hours: stringsArray[4],
                minute: stringsArray[5],
                minutes: stringsArray[6],
                second: stringsArray[7],
                seconds: stringsArray[8],
                copycount: stringsArray[9],
                focuslosscount: stringsArray[10],
                extensiondetected: stringsArray[11],
                yes: stringsArray[12],
                no: stringsArray[13]
            };

            // Determine extension detection text
            var extensionText = data.has_extension ? strings.yes : strings.no;

            // Determine block color based on cheat_detected
            var blockColorClass = 'cheatdetect_resume--gray';
            if (data.cheat_detected !== undefined) {
                blockColorClass = data.cheat_detected ? 'cheatdetect_resume--red' : 'cheatdetect_resume--green';
            }

            // Create the resume block HTML
            var $resumeBlock = $('<div>').addClass('cheatdetect_resume').addClass(blockColorClass);

            // Format duration with appropriate units
            var durationText = formatDuration(data.time_spent, strings);

            // Time spent line (with slot number)
            var timeSpentText = strings.timespent
                .replace('{$a->duration}', durationText)
                .replace('{$a->percentage}', timePercentage)
                .replace('{$a->slot}', slotId);
            var $timeLine = $('<div>').text(timeSpentText);

            // Copy count line (add alert class if > 0)
            var copyCountText = strings.copycount.replace('{$a}', data.copy_count);
            var $copyLine = $('<div>').text(copyCountText);
            if (data.copy_count > 0) {
                $copyLine.addClass('cheatdetect-alert');
            }

            // Focus loss count line (add alert class if > 0)
            var focusLossCountText = strings.focuslosscount.replace('{$a}', data.focus_loss_count);
            var $focusLine = $('<div>').text(focusLossCountText);
            if (data.focus_loss_count > 0) {
                $focusLine.addClass('cheatdetect-alert');
            }

            // Extension detection line
            var extensionDetectedText = strings.extensiondetected.replace('{$a}', extensionText);
            var $extensionLine = $('<div>').text(extensionDetectedText);

            // Append all lines to the block
            $resumeBlock.append($timeLine)
                .append($copyLine)
                .append($focusLine)
                .append($extensionLine);

            // Insert the block after the .formulation element within the question element
            var $formulationContainer = $questionElement.find('.formulation');
            if ($formulationContainer.length > 0) {
                $formulationContainer.before($resumeBlock);
            } else {
                // Fallback: insert at the top of the question element
                $questionElement.prepend($resumeBlock);
            }

            // Trigger fade-in animation after a small delay (allows CSS transition to work)
            setTimeout(function() {
                $resumeBlock.addClass('cheatdetect_resume--visible');
            }, 50);

            if (SHOW_CONSOLE_LOG) {
                // eslint-disable-next-line no-console
                console.log('CheatDetect: Resume block added to ' + $questionElement.attr('id'));
            }
        }).catch(function(error) {
            if (SHOW_CONSOLE_LOG) {
                console.error('CheatDetect: Error loading strings', error); // eslint-disable-line no-console
            }
        });
    };

    return {
        init: init
    };
});