<?php
/**
 * @package     quizaccess_cheatdetect
 * @copyright   2025 CBlue SPRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

defined('MOODLE_INTERNAL') || die();

// In moodle 4.1 or lower there is update for access rule base class.
if (class_exists('\mod_quiz\local\access_rule_base')) {
    class_alias('\mod_quiz\local\access_rule_base', '\quizaccess_cheat_detect_parent_class');
    class_alias('\mod_quiz\form\preflight_check_form', '\quizaccess_cheat_detect_preflight_form');
    class_alias('\mod_quiz\quiz_settings', '\quizaccess_cheat_detect_quiz_settings_class');
} else {
    require_once($CFG->dirroot . '/mod/quiz/accessrule/accessrulebase.php');
    class_alias('\quiz_access_rule_base', '\quizaccess_cheat_detect_parent_class');
    class_alias('\mod_quiz_preflight_check_form', '\quizaccess_cheat_detect_preflight_form');
    class_alias('\quiz', '\quizaccess_cheat_detect_quiz_settings_class');
}

/**
 * Quiz access rule for cheat detection.
 */
class quizaccess_cheatdetect extends quizaccess_cheat_detect_parent_class {

    /**
     * Create an instance of this rule for a particular quiz.
     *
     * @param mixed $quizobj information about the quiz
     * @param int $timenow the time that should be considered as 'now'.
     * @param bool $canignoretimelimits whether the user is exempt from time limits.
     * @return quizaccess_cheatdetect|null
     */
    public static function make($quizobj, $timenow, $canignoretimelimits) {
        // Check if cheat detection is enabled for this quiz
        // TODO Check with future DB if cheatdetect is enabled
        //        if (empty($quizobj->get_quiz()->cheatdetectenabled)) {
        //            return null;
        //        }

        return new self($quizobj, $timenow);
    }

    /**
     * Add settings fields to the quiz settings form.
     * @param mod_quiz_mod_form $quizform
     * @param MoodleQuickForm $mform
     * @return void
     * @throws coding_exception
     */
    public static function add_settings_form_fields(mod_quiz_mod_form $quizform, MoodleQuickForm $mform) {
        global $PAGE;
        $mform->addElement(
            'static',
            'cheatdetect_layout_warning',
            '',
            '<div id="cheatdetect_layout_warning" class="mt-2 alert alert-warning" style="display: none;" role="alert">
                <i class="fa fa-exclamation-triangle"></i> ' .
                get_string('layoutwarning', 'quizaccess_cheatdetect') .
            '</div>'
        );
        $PAGE->requires->js_call_amd(
            'quizaccess_cheatdetect/layout_checker',
            'init'
        );
    }

    /**
     * Save settings to the quiz table.
     *
     * @param object $quiz the data from the quiz form
     */
    public static function save_settings($quiz) {
        // TODO Here we have to handle DB
        //        if (!empty($quiz->cheatdetectenabled)) {
        //            $DB->set_field('quiz', 'cheatdetectenabled', $quiz->cheatdetectenabled, ['id' => $quiz->id]);
        //        }
    }

    /**
     * @param $quiz
     * @return void
     * @throws dml_exception
     */
    public static function delete_settings($quiz) {
        global $DB;
        $DB->set_field('quiz', 'cheatdetectenabled', 0, ['id' => $quiz->id]);
    }

    /**
     * Return the bits of SQL needed to load all the settings from the database.
     *
     * @param int $quizid the quiz id
     * @return array with two elements, the sql fragment and params
     */
    public static function get_settings_sql($quizid) {
        // Here, get from db if cheatdetect is enabled or not
        /**
         *
         * return [
         * '
         * cheatdetectenabled
         * 'LEFT JOIN {quizaccess_cheatdetect_settings} cd ON cd.quizid = quiz.id',
         * [],
         * ];
         */
        return [];
    }

    /**
     * Setup page requirements - inject JavaScript for monitoring.
     *
     * @param moodle_page $page the page object
     */
    public function setup_attempt_page($page) {
        global $PAGE;
        $PAGE->requires->js_call_amd('quizaccess_cheatdetect/detector', 'init');
    }
}