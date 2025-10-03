<?php
/**
 * @package     quizaccess_cheatdetect
 * @copyright   2025 CBlue SPRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Callback to inject JavaScript into any page
 * This is called before the page output
 */
function quizaccess_cheatdetect_before_footer() {
    global $PAGE, $DB;

    // Check if we're on a quiz report page
    $pagetype = $PAGE->pagetype;
    // Target: mod-quiz-report
    if (strpos($pagetype, 'mod-quiz-report') !== 0) {
        return;
    }

    // Get the course module ID from the page context
    $context = $PAGE->context;
    if ($context->contextlevel != CONTEXT_MODULE) {
        return;
    }

    $cm = get_coursemodule_from_id('quiz', $context->instanceid);
    if (!$cm) {
        return;
    }

    // TODO : Check if cheat detection is enabled for this quiz
    //    $quiz = $DB->get_record('quiz', ['id' => $cm->instance], 'cheatdetectenabled');
    //    if (!$quiz || empty($quiz->cheatdetectenabled)) {
    //        return;
    //    }

    // Inject our report enhancement JavaScript
    $PAGE->requires->js_call_amd('quizaccess_cheatdetect/report_enhancer', 'init', [
        'cmid' => $cm->id,
        'quizid' => $cm->instance
    ]);
}