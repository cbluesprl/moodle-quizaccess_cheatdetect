<?php
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
 * Quiz access rule for cheat detection implementation.
 *
 * This file contains the main access rule class that automatically monitors
 * student behavior during quiz attempts when the quiz is configured with
 * "one question per page" layout.
 *
 * @package    quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     gnormand@cblue.be, abrichard@cblue.be
 * @since      1.0.0
 */

defined('MOODLE_INTERNAL') || die();

// Handle compatibility between Moodle 4.1+ and earlier versions.
// In Moodle 4.1+, access rule base classes are in the mod_quiz namespace.
if (class_exists('\mod_quiz\local\access_rule_base')) {
    class_alias('\mod_quiz\local\access_rule_base', '\quizaccess_cheat_detect_parent_class');
    class_alias('\mod_quiz\form\preflight_check_form', '\quizaccess_cheat_detect_preflight_form');
    class_alias('\mod_quiz\quiz_settings', '\quizaccess_cheat_detect_quiz_settings_class');
} else {
    // For Moodle 4.0 and earlier versions.
    require_once($CFG->dirroot . '/mod/quiz/accessrule/accessrulebase.php');
    class_alias('\quiz_access_rule_base', '\quizaccess_cheat_detect_parent_class');
    class_alias('\mod_quiz_preflight_check_form', '\quizaccess_cheat_detect_preflight_form');
    class_alias('\quiz', '\quizaccess_cheat_detect_quiz_settings_class');
}

/**
 * Quiz access rule class for cheat detection.
 *
 * This rule automatically activates when a quiz is configured with "one question per page"
 * layout (questionsperpage = 1). It monitors student behavior during quiz attempts,
 * tracking events such as focus loss, copy/paste actions, and browser extensions.
 * The rule does not prevent access - it only collects monitoring data for teacher review.
 *
 * @package    quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since      1.0.0
 */
class quizaccess_cheatdetect extends quizaccess_cheat_detect_parent_class {

    /**
     * Create an instance of this rule for a particular quiz.
     *
     * This method determines whether the cheat detection rule should be active
     * for the given quiz. The rule is only applied if the quiz uses "one question
     * per page" layout (questionsperpage = 1).
     *
     * @param quiz $quizobj Information about the quiz in question.
     * @param int $timenow The time that should be considered as 'now'.
     * @param bool $canignoretimelimits Whether the current user is exempt from
     *      time limits by the mod/quiz:ignoretimelimits capability.
     * @return quizaccess_cheatdetect|null The rule instance if applicable, null otherwise.
     * @since 1.0.0
     */
    public static function make($quizobj, $timenow, $canignoretimelimits) {
        // Check if quiz is configured with "one question per page" layout.
        // In Moodle, questionsperpage = 1 means one question per page.
        // questionsperpage = 0 means all questions on one page.
        // questionsperpage > 1 means multiple questions per page.
        $questionsperpage = $quizobj->get_quiz()->questionsperpage;

        if ($questionsperpage != 1) {
            // Cheat detection only works with one question per page.
            return null;
        }

        return new self($quizobj, $timenow);
    }

    /**
     * Add settings fields to the quiz settings form.
     *
     * Adds informational elements to the quiz form:
     * - A header section for cheat detection
     * - An informational message explaining automatic activation
     * - A warning message (hidden by default) that appears when incompatible layout is selected
     * - JavaScript to dynamically show/hide the warning based on layout selection
     *
     * @param mod_quiz_mod_form $quizform The quiz settings form that is being built.
     * @param MoodleQuickForm $mform The wrapped MoodleQuickForm.
     * @return void
     * @throws coding_exception If required language strings are missing.
     * @since 1.0.0
     */
    public static function add_settings_form_fields(mod_quiz_mod_form $quizform, MoodleQuickForm $mform) {
        global $PAGE;

        // Add header for cheat detection section.
        $mform->addElement('header', 'cheatdetectheader',
            get_string('cheatdetectheader', 'quizaccess_cheatdetect'));

        // Add informational message about automatic cheat detection.
        $mform->addElement(
            'static',
            'cheatdetect_info',
            '',
            '<div class="alert alert-info" role="alert">
                <i class="fa fa-info-circle"></i> ' .
            get_string('cheatdetectinfo', 'quizaccess_cheatdetect') .
            '</div>'
        );

        // Add warning message for incompatible layouts (hidden by default).
        // JavaScript will show this when questionsperpage != 1.
        $mform->addElement(
            'static',
            'cheatdetect_layout_warning',
            '',
            '<div id="cheatdetect_layout_warning" class="mt-2 alert alert-warning" style="display: none;" role="alert">
                <i class="fa fa-exclamation-triangle"></i> ' .
            get_string('layoutwarning', 'quizaccess_cheatdetect') .
            '</div>'
        );

        // Initialize JavaScript module for dynamic layout checking.
        // This module monitors the questionsperpage field and shows/hides the warning.
        $PAGE->requires->js_call_amd(
            'quizaccess_cheatdetect/layout_checker',
            'init'
        );
    }

    /**
     * Save any submitted settings when the quiz settings form is submitted.
     *
     * This method is intentionally empty because cheat detection is automatic
     * and does not require any settings to be saved. The plugin activates
     * based on the quiz's questionsperpage setting.
     *
     * @param stdClass $quiz The quiz settings data from the form.
     * @return void
     * @since 1.0.0
     */
    public static function save_settings($quiz) {
        // No settings to save - cheat detection is automatic.
        return;
    }

    /**
     * Delete any settings when the quiz is deleted.
     *
     * This method is intentionally empty because the plugin does not store
     * any quiz-specific settings. Event, metric, and extension data stored
     * in other tables will be handled separately.
     *
     * @param stdClass $quiz The quiz being deleted.
     * @return void
     * @since 1.0.0
     */
    public static function delete_settings($quiz) {
        // No settings to delete.
        return;
    }

    /**
     * Return the SQL fragments needed to load the settings from the database.
     *
     * This method is intentionally empty (returns empty arrays) because the plugin
     * does not store any settings in the database. The rule activation is determined
     * dynamically based on the quiz's questionsperpage setting.
     *
     * @param int $quizid The quiz ID.
     * @return array Array with three elements:
     *               - string: SQL fragment for SELECT clause (empty)
     *               - string: SQL fragment for JOIN clause (empty)
     *               - array: Parameters for the SQL (empty)
     * @since 1.0.0
     */
    public static function get_settings_sql($quizid) {
        // No settings to load from database.
        return ['', '', []];
    }

    /**
     * Set up the page for a quiz attempt.
     *
     * This method injects JavaScript for monitoring student behavior during quiz attempts.
     * It only runs on quiz attempt pages and only when a valid slot is found.
     * The JavaScript tracks events like focus loss, copy/paste, and browser extensions.
     *
     * @param moodle_page $page The page object for the attempt page.
     * @return void
     * @since 1.0.0
     */
    public function setup_attempt_page($page) {
        global $DB, $PAGE, $USER;

        // Check if we're on a quiz attempt page.
        if (strpos($page->pagetype, 'mod-quiz-attempt') !== 0) {
            return;
        }

        // Get attempt ID and page number from URL parameters.
        $attemptid = optional_param('attempt', 0, PARAM_INT);
        // Page defaults to 0 (first page) when not specified in URL.
        $page_number = optional_param('page', 0, PARAM_INT);

        // Get or generate session ID for tracking.
        $sessionId = session_id();
        if (empty($sessionId)) {
            $sessionId = md5(uniqid(rand(), true));
        }

        // In Moodle quiz_slots, pages are numbered starting from 1, but URL uses 0-based indexing.
        // So we need to add 1 to convert from URL page to DB page.
        $dbpage = $page_number + 1;

        // Get the slot number for this page.
        $slot = $DB->get_field('quiz_slots', 'slot', ['quizid' => $this->quiz->id, 'page' => $dbpage]);

        // This can happen if questionsperpage > 1 (multiple questions per page).
        // In this case, we cannot reliably track which question is being worked on.
        if (!$slot) {
            return;
        }

        // Prepare parameters for JavaScript module.
        $params = [
            'sessionId' => $sessionId,
            'attemptid' => $attemptid,
            'userid' => $USER->id,
            'quizid' => $this->quiz->id,
            'slot' => $slot ?: null,
            'startDetection' => true
        ];

        // Initialize the tracking JavaScript module.
        $PAGE->requires->js_call_amd('quizaccess_cheatdetect/tracking/index', 'init', [$params]);
    }

    /**
     * Whether the user should be blocked from starting a new attempt or continuing an attempt.
     *
     * This rule never prevents access. It only monitors behavior during the attempt.
     * Teachers can review the collected data after the attempt is completed.
     *
     * @return string|bool False if access should be allowed (always), or a string with the
     *                     reason if access should be prevented (never happens for this rule).
     * @since 1.0.0
     */
    public function prevent_access() {
        // This rule doesn't prevent access, it only monitors behavior.
        return false;
    }

    /**
     * Information to display to the user about this rule in the quiz info section.
     *
     * This provides a brief description that is shown to students when they view the quiz.
     * It informs them that their behavior during the quiz will be monitored.
     *
     * @return string Localized description string.
     * @since 1.0.0
     */
    public function description() {
        return get_string('cheatdetectdescription', 'quizaccess_cheatdetect');
    }

    /**
     * Check whether this rule will be effective for the current quiz.
     *
     * This method provides a way to determine if the cheat detection will actually
     * be active for this quiz. It can be used by other parts of the system to check
     * if monitoring is enabled.
     *
     * @return bool True if the quiz uses one question per page layout, false otherwise.
     * @since 1.0.0
     */
    public function is_effective() {
        return $this->quiz->questionsperpage == 1;
    }
}