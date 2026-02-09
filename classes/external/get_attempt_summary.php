<?php
namespace quizaccess_cheatdetect\external;

defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/externallib.php');

use external_api;
use external_function_parameters;
use external_single_structure;
use external_value;
use quizaccess_cheatdetect\helper;
use context_course;

class get_attempt_summary extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'attemptid' => new external_value(PARAM_INT, 'Quiz attempt id'),
        ]);
    }

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

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'attemptid' => new external_value(PARAM_INT, 'Quiz attempt id'),

            // ✅ STRUCTURE, PAS PARAM_RAW
            'summary' => new external_single_structure([
                'total_time' => new external_value(PARAM_INT, 'Total attempt time'),
                'copy_count' => new external_value(PARAM_INT, 'Total copy events'),
                'focus_loss_count' => new external_value(PARAM_INT, 'Total focus loss events'),
                'has_extensions' => new external_value(PARAM_BOOL, 'Has extensions'),
            ], 'Attempt summary'),
        ]);
    }
}
