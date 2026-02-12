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
 * @package    mod_quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     abrichard@cblue.be
 * @since      1.0.0
 */
namespace quizaccess_cheatdetect\external;

defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/externallib.php');

use external_api;
use external_function_parameters;
use external_single_structure;
use external_multiple_structure;
use external_value;
use quizaccess_cheatdetect\helper;
use context_course;

/**
 * ${get_slot_summary}
 */
class get_slot_summary extends external_api {
    /**
     * ${execute_parameters}
     *
     * @return ${external_function_parameters}
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'attemptid' => new external_value(PARAM_INT, 'Quiz attempt id'),
            'slot' => new external_value(PARAM_INT, 'Question slot'),
        ]);
    }

    /**
     * ${execute}
     *
     * @param ${int} ${$attemptid}
     * @param ${int} ${$slot}
     *
     * @return ${array}
     */
    public static function execute(int $attemptid, int $slot): array {
        global $DB;

        self::validate_parameters(self::execute_parameters(), [
            'attemptid' => $attemptid,
            'slot' => $slot,
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

        $metric = helper::get_slot_metric($attemptid, $slot);
        $total_time = helper::get_total_attempt_time($attemptid);

        $time_spent = $metric ? $metric->get('time_total') : 0;
        $time_percentage = $total_time > 0 ? round(($time_spent / $total_time) * 100, 2) : 0;

        $extensions = helper::get_slot_extensions($attemptid, $slot);

        $cheat_detected = !empty($extensions)
            || ($metric && ($metric->get('copy_count') + $metric->get('focus_loss_count') > 0));

        return [
            'attemptid' => $attemptid,
            'slot' => $slot,
            'time_spent' => $time_spent,
            'time_percentage' => $time_percentage,
            'copy_count' => $metric ? $metric->get('copy_count') : 0,
            'focus_loss_count' => $metric ? $metric->get('focus_loss_count') : 0,
            'extensions_detected' => $extensions,
            'has_extension' => !empty($extensions),
            'cheat_detected' => $cheat_detected,
        ];
    }

    /**
     * ${execute_returns}
     *
     * @return ${external_single_structure}
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'attemptid' => new external_value(PARAM_INT, 'Quiz attempt id'),
            'slot' => new external_value(PARAM_INT, 'Question slot'),
            'time_spent' => new external_value(PARAM_INT, 'Time spent on slot'),
            'time_percentage' => new external_value(PARAM_FLOAT, 'Percentage of total time'),
            'copy_count' => new external_value(PARAM_INT, 'Number of copy events'),
            'focus_loss_count' => new external_value(PARAM_INT, 'Number of focus loss events'),

            'extensions_detected' => new external_multiple_structure(
                new external_single_structure([
                    'extension_key' => new external_value(PARAM_TEXT, 'Extension key'),
                    'extension_name' => new external_value(PARAM_TEXT, 'Extension name'),
                    'extension_uid' => new external_value(PARAM_TEXT, 'Extension UID'),
                ]),
                'Detected extensions',
                VALUE_OPTIONAL
            ),

            'has_extension' => new external_value(PARAM_BOOL, 'Has extensions'),
            'cheat_detected' => new external_value(PARAM_BOOL, 'Cheat detected for this slot'),
        ]);
    }
}
