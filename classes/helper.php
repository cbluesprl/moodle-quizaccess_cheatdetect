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
 * Helper class for cheat detection queries.
 *
 * @package    quizaccess_cheatdetect
 * @copyright  2025 CBlue SRL <support@cblue.be>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_cheatdetect;

use quizaccess_cheatdetect\persistent\metric;
use quizaccess_cheatdetect\persistent\extension;

defined('MOODLE_INTERNAL') || die();

/**
 * Helper class for querying cheat detection data.
 */
class helper {

    /**
     * Get metric data for a specific attempt and slot.
     *
     * @param int $attemptid The attempt ID
     * @param int $slot The question slot number
     * @return metric|null The metric object or null if not found
     */
    public static function get_slot_metric(int $attemptid, int $slot): ?metric {
        global $DB;

        $record = $DB->get_record(metric::TABLE, [
            'attemptid' => $attemptid,
            'slot' => $slot
        ]);

        if (!$record) {
            return null;
        }

        return new metric(0, $record);
    }

    /**
     * Get total time spent on all slots for an attempt.
     *
     * @param int $attemptid The attempt ID
     * @return int Total time in seconds
     */
    public static function get_total_attempt_time(int $attemptid): int {
        global $DB;

        $sql = "SELECT SUM(time_total) as total_time
                FROM {" . metric::TABLE . "}
                WHERE attemptid = :attemptid
                AND slot IS NOT NULL";

        $result = $DB->get_record_sql($sql, ['attemptid' => $attemptid]);

        return $result && $result->total_time ? (int)$result->total_time : 0;
    }

    /**
     * Check if any extension was detected for a specific attempt and slot.
     *
     * @param int $attemptid The attempt ID
     * @param int $slot The question slot number
     * @return array Array of detected extensions with details
     */
    public static function get_slot_extensions(int $attemptid, int $slot): array {
        global $DB;

        $records = $DB->get_records(extension::TABLE, [
            'attemptid' => $attemptid,
            'slot' => $slot
        ]);

        $extensions = [];
        foreach ($records as $record) {
            $extensions[] = [
                'key' => $record->extension_key,
                'name' => $record->extension_name,
                'uid' => $record->extension_uid,
                'detected_at' => $record->timecreated
            ];
        }

        return $extensions;
    }

    /**
     * Get all metrics for an attempt.
     *
     * @param int $attemptid The attempt ID
     * @return array Array of metric objects indexed by slot
     */
    public static function get_attempt_metrics(int $attemptid): array {
        global $DB;

        $records = $DB->get_records(metric::TABLE, ['attemptid' => $attemptid]);

        $metrics = [];
        foreach ($records as $record) {
            $metric = new metric(0, $record);
            $slot = $metric->get('slot');
            if ($slot !== null) {
                $metrics[$slot] = $metric;
            }
        }

        return $metrics;
    }

    /**
     * Check if any extension was detected for an attempt (any slot).
     *
     * @param int $attemptid The attempt ID
     * @return bool True if at least one extension was detected
     */
    public static function has_extensions(int $attemptid): bool {
        global $DB;

        return $DB->record_exists(extension::TABLE, ['attemptid' => $attemptid]);
    }

    /**
     * Get summary statistics for an attempt.
     *
     * @param int $attemptid The attempt ID
     * @return array Summary with total_time, slot_count, avg_time, etc.
     */
    public static function get_attempt_summary(int $attemptid): array {
        global $DB;

        $sql = "SELECT
                    COUNT(*) as slot_count,
                    SUM(time_total) as total_time,
                    SUM(copy_count) as total_copies,
                    SUM(focus_loss_count) as total_focus_losses,
                    SUM(extension_count) as total_extensions
                FROM {" . metric::TABLE . "}
                WHERE attemptid = :attemptid
                AND slot IS NOT NULL";

        $result = $DB->get_record_sql($sql, ['attemptid' => $attemptid]);

        $summary = [
            'slot_count' => $result ? (int)$result->slot_count : 0,
            'total_time' => $result ? (int)$result->total_time : 0,
            'total_copies' => $result ? (int)$result->total_copies : 0,
            'total_focus_losses' => $result ? (int)$result->total_focus_losses : 0,
            'total_extensions' => $result ? (int)$result->total_extensions : 0,
        ];

        $total_copies = $result ? (int)$result->total_copies : 0;
        $total_focus_losses = $result ? (int)$result->total_focus_losses : 0;
        $total_extensions = $result ? (int)$result->total_extensions : 0;
        $summary['cheat_detected'] = ($total_copies + $total_focus_losses + $total_extensions) > 0;

        if ($summary['slot_count'] > 0) {
            $summary['avg_time'] = (int)($summary['total_time'] / $summary['slot_count']);
        } else {
            $summary['avg_time'] = 0;
        }

        return $summary;
    }
}