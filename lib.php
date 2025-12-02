<?php
/**
 * @package     quizaccess_cheatdetect
 * @copyright   2025 CBlue SPRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Callback to inject JavaScript into report pages
 * This is called before the page output
 */
function quizaccess_cheatdetect_before_footer() {
    global $PAGE;

    // Check if we're on a quiz report page
    $pagetype = $PAGE->pagetype;
    $report_pages = ['mod-quiz-report', 'mod-quiz-reviewquestion', 'mod-quiz-review'];
    $is_report_page = false;
    foreach ($report_pages as $report_page) {
        if (strpos($pagetype, $report_page) !== false) {
            $is_report_page = true;
            break;
        }
    }

    if (!$is_report_page) {
        return;
    }

    $context = $PAGE->context;
    if ($context->contextlevel != CONTEXT_MODULE) {
        return;
    }

    $cm = get_coursemodule_from_id('quiz', $context->instanceid);
    if (!$cm) {
        return;
    }

    $coursecontext = context_course::instance($cm->course);
    if (!has_capability('quizaccess/cheatdetect:viewcoursereports', $coursecontext)) {
        return;
    }

    // Load JavaScript module
    $PAGE->requires->js_call_amd('quizaccess_cheatdetect/report_enhancer', 'init', [
        'cmid' => $cm->id,
        'quizid' => $cm->instance
    ]);
}
