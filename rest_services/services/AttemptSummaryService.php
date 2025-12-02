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
 * @copyright  2025 CBlue SRL <support@cblue.be>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_cheatdetect\rest_services\services;

use context_course;
use local_rest\Routes;
use stdClass;
use quizaccess_cheatdetect\helper;

defined('MOODLE_INTERNAL') || die();

class AttemptSummaryService extends Routes
{
    /**
     * Check if current user has permission to view cheat detection reports for an attempt.
     *
     * @param int $attemptid The attempt ID
     * @return void
     * @throws \Exception If user doesn't have permission
     */
    private static function require_view_capability(int $attempt_id): void
    {
        global $DB;
        $attempt = $DB->get_record('quiz_attempts', ['id' => $attempt_id], 'id, quiz', MUST_EXIST);
        $quiz = $DB->get_record('quiz', ['id' => $attempt->quiz], 'id, course', MUST_EXIST);
        $course_context = context_course::instance($quiz->course);
        if (!has_capability('quizaccess/cheatdetect:viewcoursereports', $course_context)) {
            throw new \Exception('Permission denied');
        }
    }

    /**
     * Get summary for an entire attempt.
     *
     * @param stdClass|null $payload Request payload
     * @param stdClass|null $route_params Route parameters
     * @param stdClass|null $get_params GET parameters
     * @return stdClass Response object
     */
    public static function get_attempt_summary(?stdClass $payload, ?stdclass $route_params, ?stdclass $get_params): stdClass
    {
        $response = new stdClass();
        $response->success = false;

        try {
            if (empty($route_params->attemptid)) {
                throw new \Exception('No attemptid provided');
            }

            $attemptid = (int) $route_params->attemptid;

            // Check permissions.
            self::require_view_capability($attemptid);

            $summary = helper::get_attempt_summary($attemptid);
            $summary['has_extensions'] = helper::has_extensions($attemptid);

            $response->success = true;
            $response->data = $summary;
        } catch (\Throwable $e) {
            $response->error = $e->getMessage();
        }

        return $response;
    }

    /**
     * Get summary for a specific slot in an attempt.
     *
     * @param stdClass|null $payload Request payload
     * @param stdClass|null $route_params Route parameters (attemptid, slot)
     * @param stdClass|null $get_params GET parameters
     * @return stdClass Response object
     */
    public static function get_slot_summary(?stdClass $payload, ?stdclass $route_params, ?stdclass $get_params): stdClass
    {
        $response = new stdClass();
        $response->success = false;

        try {
            if (empty($route_params->attemptid)) {
                throw new \Exception('No attemptid provided');
            }

            if (!isset($route_params->slot)) {
                throw new \Exception('No slot provided');
            }

            $attemptid = (int) $route_params->attemptid;
            $slot = (int) $route_params->slot;

            self::require_view_capability($attemptid);

            // Get metric for this specific slot.
            $metric = helper::get_slot_metric($attemptid, $slot);

            if (!$metric) {
                // No data found for this slot.
                $response->success = true;
                $response->data = [
                    'attemptid' => $attemptid,
                    'slot' => $slot,
                    'time_spent' => 0,
                    'time_percentage' => 0,
                    'copy_count' => 0,
                    'focus_loss_count' => 0,
                    'extensions_detected' => [],
                    'has_extension' => false,
                    'cheat_detected' => false
                ];
                return $response;
            }

            // Get total attempt time for percentage calculation.
            $total_time = helper::get_total_attempt_time($attemptid);

            // Calculate percentage.
            $time_spent = $metric->get('time_total');
            $time_percentage = 0;
            if ($total_time > 0) {
                $time_percentage = round(($time_spent / $total_time) * 100, 2);
            }

            // Check for extensions.
            $extensions = helper::get_slot_extensions($attemptid, $slot);
            $response->success = true;
            $cheat_detected_for_slot = !empty($extensions) || ($metric->get('copy_count') + $metric->get('focus_loss_count')) > 0;
            $response->data = [
                'attemptid' => $attemptid,
                'slot' => $slot,
                'time_spent' => $time_spent,
                'time_percentage' => $time_percentage,
                'copy_count' => $metric->get('copy_count'),
                'focus_loss_count' => $metric->get('focus_loss_count'),
                'extensions_detected' => $extensions,
                'has_extension' => !empty($extensions),
                'cheat_detected' => $cheat_detected_for_slot
            ];
        } catch (\Throwable $e) {
            $response->error = $e->getMessage();
        }

        return $response;
    }

    /**
     * Get summaries for multiple attempts at once.
     *
     * @param stdClass|null $payload Request payload containing attemptids array
     * @param stdClass|null $route_params Route parameters
     * @param stdClass|null $get_params GET parameters
     * @return stdClass Response object
     */
    public static function get_bulk_attempt_summaries(?stdClass $payload, ?stdclass $route_params, ?stdclass $get_params): stdClass
    {
        $response = new stdClass();
        $response->success = false;

        try {
            if (empty($payload->attemptids) || !is_array($payload->attemptids)) {
                throw new \Exception('No attemptids array provided');
            }

            $attemptids = array_map('intval', $payload->attemptids);

            if (!empty($attemptids)) {
                self::require_view_capability($attemptids[0]);
            }

            $results = [];

            foreach ($attemptids as $attemptid) {
                $summary = helper::get_attempt_summary($attemptid);
                $summary['has_extensions'] = helper::has_extensions($attemptid);

                $total_time = helper::get_total_attempt_time($attemptid);

                $metrics = helper::get_attempt_metrics($attemptid);

                // Build slots array.
                $slots = [];
                foreach ($metrics as $slot => $metric) {
                    $time_spent = $metric->get('time_total');
                    $time_percentage = 0;
                    if ($total_time > 0) {
                        $time_percentage = round(($time_spent / $total_time) * 100, 2);
                    }

                    $extensions = helper::get_slot_extensions($attemptid, $slot);

                    $cheat_detected_for_slot = $extensions || ($metric->get('copy_count') + $metric->get('focus_loss_count') > 0);
                    $slots[] = [
                        'slot' => $slot,
                        'time_spent' => $time_spent,
                        'time_percentage' => $time_percentage,
                        'copy_count' => $metric->get('copy_count'),
                        'focus_loss_count' => $metric->get('focus_loss_count'),
                        'extensions_detected' => $extensions,
                        'has_extension' => !empty($extensions),
                        'cheat_detected' => $cheat_detected_for_slot
                    ];
                }

                // Sort slots by slot number.
                usort($slots, function($a, $b) {
                    return $a['slot'] - $b['slot'];
                });

                $results[] = [
                    'attemptid' => $attemptid,
                    'summary' => $summary,
                    'slots' => $slots
                ];
            }

            $response->success = true;
            $response->data = $results;
        } catch (\Throwable $e) {
            $response->error = $e->getMessage();
        }

        return $response;
    }
}
