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
 * Injects JavaScript on quiz report pages for cheat detection.
 *
 * This callback is executed before the page footer is rendered.
 * It ensures that the script is only added on relevant quiz report pages
 * and that the user has the required capability to view cheat detection reports.
 *
 * @package    quizaccess_cheatdetect
 * @category   output
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     gnormand@cblue.be
 * @author     abrichard@cblue.be
 * @since      1.0.0
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Callback to inject JavaScript into quiz report pages.
 *
 * Checks the page type, context, course module, and user capabilities
 * before adding the AMD JavaScript module to enhance reports.
 */
function quizaccess_cheatdetect_before_footer() {
    global $PAGE, $DB;
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

    $quiz = $DB->get_record('quiz', ['id' => $cm->instance]);
    if (empty($quiz)) {
        return;
    }

    // Load JavaScript module
    $PAGE->requires->js_call_amd('quizaccess_cheatdetect/report_enhancer', 'init', [
        'cmid' => $cm->id,
        'quizid' => $cm->instance,
        'questionsperpage' => $quiz->questionsperpage,
    ]);
}
