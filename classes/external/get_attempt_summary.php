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
 * @package    quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     abrichard@cblue.be
 * @since      1.0.0
 */
namespace quizaccess_cheatdetect\external;

defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/externallib.php');

use core_external\restricted_context_exception;
use external_api;
use external_function_parameters;
use external_single_structure;
use external_value;
use quizaccess_cheatdetect\helper;
use context_course;

/**
 * ${get_attempt_summary}
 */
class get_attempt_summary extends external_api {

    /**
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'attemptid' => new external_value(PARAM_INT, 'Quiz attempt id'),
        ]);
    }

    /**
     * @param int $attemptid
     * @return array
     * @throws \coding_exception
     * @throws restricted_context_exception
     * @throws \dml_exception
     * @throws \invalid_parameter_exception
     * @throws \required_capability_exception
     */
    public static function execute(int $attemptid): array {
        global $DB;

        self::validate_parameters(self::execute_parameters(), [
            'attemptid' => $attemptid,
        ]);

        $attempt = $DB->get_record('quiz_attempts', ['id' => $attemptid], 'id, quiz', MUST_EXIST);
        $quiz = $DB->get_record('quiz', ['id' => $attempt->quiz], 'id, course', MUST_EXIST);
        $coursecontext = context_course::instance($quiz->course);

        self::validate_context($coursecontext);

        if (!has_capability('quizaccess/cheatdetect:viewcoursereports', $coursecontext)) {
            throw new \required_capability_exception(
                $coursecontext,
                'quizaccess/cheatdetect:viewcoursereports',
                'nopermissions',
                ''
            );
        }

        $summary = helper::get_attempt_summary($attemptid);
        $summary['has_extensions'] = helper::has_extensions($attemptid);

        return [
            'attemptid' => $attemptid,
            'summary' => $summary,
        ];
    }

    /**
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'attemptid' => new external_value(PARAM_INT, 'Quiz attempt id'),

            'summary' => new external_single_structure([
                'total_time' => new external_value(PARAM_INT, 'Total attempt time'),
                'copy_count' => new external_value(PARAM_INT, 'Total copy events'),
                'focus_loss_count' => new external_value(PARAM_INT, 'Total focus loss events'),
                'has_extensions' => new external_value(PARAM_BOOL, 'Has extensions'),
            ], 'Attempt summary'),
        ]);
    }
}
