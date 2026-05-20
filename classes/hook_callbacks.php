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
 * Hook callbacks for quizaccess_cheatdetect.
 *
 * @package    quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     ltilman@cblue.be
 * @since      1.0.0
 */

namespace quizaccess_cheatdetect;

use core\hook\output\before_footer_html_generation;

/**
 * Hook callbacks for cheat detection.
 *
 * Injects the report enhancer JavaScript module on relevant quiz report
 * pages when the current user has the required capability.
 */
class hook_callbacks {

    /**
     * Inject the report enhancer JavaScript on quiz report pages.
     *
     * Checks the page type, context, course module, and user capabilities
     * before adding the AMD JavaScript module that enhances reports.
     *
     * @param before_footer_html_generation $hook
     */
    public static function before_footer_html_generation(before_footer_html_generation $hook): void {
        global $PAGE, $DB;

        $reportpages = ['mod-quiz-report', 'mod-quiz-reviewquestion', 'mod-quiz-review'];
        $isreportpage = false;
        foreach ($reportpages as $reportpage) {
            if (strpos($PAGE->pagetype, $reportpage) !== false) {
                $isreportpage = true;
                break;
            }
        }

        if (!$isreportpage) {
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

        $coursecontext = \context_course::instance($cm->course);
        if (!has_capability('quizaccess/cheatdetect:viewcoursereports', $coursecontext)) {
            return;
        }

        $quiz = $DB->get_record('quiz', ['id' => $cm->instance]);
        if (empty($quiz)) {
            return;
        }

        $PAGE->requires->js_call_amd('quizaccess_cheatdetect/report_enhancer', 'init', [
            'cmid' => $cm->id,
            'quizid' => $cm->instance,
            'questionsperpage' => $quiz->questionsperpage,
        ]);
    }
}
