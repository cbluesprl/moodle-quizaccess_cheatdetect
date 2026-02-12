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
use stdClass;
use context_course;

class get_bulk_attempt_summaries extends external_api {

    /**
     * ${execute_parameters}
     *
     *
     * @return ${external_function_parameters}
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'attemptids' => new external_multiple_structure(new external_value(PARAM_INT, 'Attempt ID'))
        ]);
    }

    /**
     * ${execute}
     *
     * @param ${array} ${$attemptids}
     *
     * @return ${array}
     */
    public static function execute(array $attemptids): array {
        global $DB;
        self::validate_parameters(self::execute_parameters(), ['attemptids' => $attemptids]);

        if (empty($attemptids)) {
            throw new \Exception('No attemptids provided');
        }

        $first_attempt = $DB->get_record('quiz_attempts', ['id' => $attemptids[0]], 'id, quiz', MUST_EXIST);
        $quiz = $DB->get_record('quiz', ['id' => $first_attempt->quiz], 'id, course', MUST_EXIST);
        $course_context = context_course::instance($quiz->course);

        if (!has_capability('quizaccess/cheatdetect:viewcoursereports', $course_context)) {
            throw new \Exception('Permission denied');
        }

        $results = [];
        foreach ($attemptids as $attemptid) {
            $summary = helper::get_attempt_summary($attemptid);
            $summary['has_extensions'] = helper::has_extensions($attemptid);

            $total_time = helper::get_total_attempt_time($attemptid);
            $metrics = helper::get_attempt_metrics($attemptid);

            $slots = [];
            foreach ($metrics as $slot => $metric) {
                $time_spent = $metric->get('time_total');
                $time_percentage = $total_time > 0 ? round(($time_spent / $total_time) * 100, 2) : 0;
                $extensions = helper::get_slot_extensions($attemptid, $slot);
                $cheat_detected = $extensions || ($metric->get('copy_count') + $metric->get('focus_loss_count') > 0);

                $slots[] = [
                    'slot' => $slot,
                    'time_spent' => $time_spent,
                    'time_percentage' => $time_percentage,
                    'copy_count' => $metric->get('copy_count'),
                    'focus_loss_count' => $metric->get('focus_loss_count'),
                    'extensions_detected' => $extensions,
                    'has_extension' => !empty($extensions),
                    'cheat_detected' => $cheat_detected
                ];
            }

            usort($slots, fn($a, $b) => $a['slot'] - $b['slot']);
            $results[] = [
                'attemptid' => $attemptid,
                'summary' => $summary, // <-- array PHP
                'slots' => $slots
            ];
        }

        return $results;
    }


    /**
     * ${execute_returns}
     *
     *
     * @return ${external_multiple_structure}
     */
    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(
            new external_single_structure([
                'attemptid' => new external_value(
                    PARAM_INT,
                    'Attempt ID'
                ),

                'summary' => new external_single_structure([
                    'slot_count' => new external_value(
                        PARAM_INT,
                        'Number of slots'
                    ),
                    'total_time' => new external_value(
                        PARAM_INT,
                        'Total time spent on attempt'
                    ),
                    'total_copies' => new external_value(
                        PARAM_INT,
                        'Total copy events'
                    ),
                    'total_focus_losses' => new external_value(
                        PARAM_INT,
                        'Total focus loss events'
                    ),
                    'total_extensions' => new external_value(
                        PARAM_INT,
                        'Total detected extensions'
                    ),
                    'has_only_one_question_per_page' => new external_value(
                        PARAM_BOOL,
                        'Whether the quiz has only one question per page'
                    ),
                    'cheat_detected' => new external_value(
                        PARAM_BOOL,
                        'Cheat detected at attempt level'
                    ),
                    'avg_time' => new external_value(
                        PARAM_FLOAT,
                        'Average time per slot'
                    ),
                    'has_extensions' => new external_value(
                        PARAM_BOOL,
                        'Whether extensions were detected'
                    ),
                ], 'Attempt summary'),

                'slots' => new external_multiple_structure(
                    new external_single_structure([
                        'slot' => new external_value(
                            PARAM_INT,
                            'Slot number'
                        ),
                        'time_spent' => new external_value(
                            PARAM_INT,
                            'Time spent on slot (seconds)'
                        ),
                        'time_percentage' => new external_value(
                            PARAM_FLOAT,
                            'Percentage of total attempt time'
                        ),
                        'copy_count' => new external_value(
                            PARAM_INT,
                            'Copy count'
                        ),
                        'focus_loss_count' => new external_value(
                            PARAM_INT,
                            'Focus loss count'
                        ),
                        'extensions_detected' => new external_multiple_structure(
                            new external_single_structure([
                                'extensionkey' => new external_value(
                                    PARAM_TEXT,
                                    'Extension key'
                                ),
                                'detectedElementUid' => new external_value(
                                    PARAM_TEXT,
                                    'Detected element UID'
                                ),
                            ]),
                            'Detected extensions',
                            VALUE_OPTIONAL
                        ),
                        'has_extension' => new external_value(
                            PARAM_BOOL,
                            'Has extensions'
                        ),
                        'cheat_detected' => new external_value(
                            PARAM_BOOL,
                            'Cheat detected on this slot'
                        ),
                    ]),
                    'Slot details'
                ),
            ])
        );
    }
}
