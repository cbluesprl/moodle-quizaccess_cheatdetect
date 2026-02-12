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
 * @author     gnormand@cblue.be, abrichard@cblue.be
 * @since      1.0.0
 */

defined('MOODLE_INTERNAL') || die();
/**
 * Web service function definitions.
 *
 * Each function defines:
 * - classname: External class implementing the service
 * - methodname: Executed method
 * - description: Functional purpose
 * - type: read or write
 * - ajax: Whether callable via AJAX
 * - loginrequired: Whether authentication is required
 *
 * @var array
 */
$functions = [

    /**
     * Save cheat detection tracking data.
     *
     * Stores frontend tracking events and updates related metrics.
     */
    'quizaccess_cheatdetect_save_data' => [
        'classname'   => 'quizaccess_cheatdetect\external\save_data',
        'methodname'  => 'execute',
        'classpath'   => '',
        'description' => 'Save cheat detection tracking data',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
    ],

    /**
     * Retrieve cheat detection summary for a single attempt.
     *
     * Returns aggregated metrics and detection indicators.
     */
    'quizaccess_cheatdetect_get_attempt_summary' => [
        'classname'   => 'quizaccess_cheatdetect\external\get_attempt_summary',
        'methodname'  => 'execute',
        'classpath'   => '',
        'description' => 'Get cheat detection summary for one attempt',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    ],

    /**
     * Retrieve cheat detection summary for a specific slot.
     *
     * Returns slot-level metrics and detection data.
     */
    'quizaccess_cheatdetect_get_slot_summary' => [
        'classname'   => 'quizaccess_cheatdetect\external\get_slot_summary',
        'methodname'  => 'execute',
        'classpath'   => '',
        'description' => 'Get cheat detection summary for one slot',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    ],

    /**
     * Retrieve cheat detection summaries for multiple attempts.
     *
     * Used for bulk reporting in course-level views.
     */
    'quizaccess_cheatdetect_get_bulk_attempt_summaries' => [
        'classname'   => 'quizaccess_cheatdetect\external\get_bulk_attempt_summaries',
        'methodname'  => 'execute',
        'classpath'   => '',
        'description' => 'Get cheat detection summaries for multiple attempts',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    ],
];
