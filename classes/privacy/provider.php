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

namespace quizaccess_cheatdetect\privacy;

defined('MOODLE_INTERNAL') || die();

use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;

/**
 * Privacy provider implementation for the quizaccess_cheatdetect plugin.
 *
 * This class integrates with Moodle's Privacy API and defines:
 * - The metadata describing stored user data
 * - The contexts containing user data
 * - The export of user data
 * - The deletion of user data (single user, multiple users, or all users)
 *
 * @package    mod_quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\plugin\provider,
    \core_privacy\local\request\core_userlist_provider {

    /**
     * Returns metadata about the user data stored by this plugin.
     *
     * @param collection $collection The initialised collection to add metadata to.
     * @return collection The updated collection with plugin metadata added.
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_database_table(
            'quizaccess_cheatdetect_events',
            [
                'attemptid' => 'privacy:metadata:attemptid',
                'userid' => 'privacy:metadata:userid',
                'actions' => 'privacy:metadata:actions'
            ],
            'privacy:metadata:quizaccess_cheatdetect_events'
        );

        $collection->add_database_table(
            'quizaccess_cheatdetect_metrics',
            [
                'attemptid' => 'privacy:metadata:attemptid',
                'userid' => 'privacy:metadata:userid',
                'metrics' => 'privacy:metadata:metrics'
            ],
            'privacy:metadata:quizaccess_cheatdetect_metrics'
        );

        $collection->add_database_table(
            'quizaccess_cheatdetect_extensions',
            [
                'attemptid' => 'privacy:metadata:attemptid',
                'userid' => 'privacy:metadata:userid',
                'extensions' => 'privacy:metadata:extensions'
            ],
            'privacy:metadata:quizaccess_cheatdetect_extensions'
        );

        return $collection;
    }

    /**
     * Returns the list of contexts containing user data for the specified user.
     *
     * @param int $userid The user ID.
     * @return contextlist The list of contexts containing data for the user.
     */
    public static function get_contexts_for_userid(int $userid): contextlist {
        global $DB;

        $contextlist = new contextlist();

        $sql = "SELECT DISTINCT q.id
                  FROM {quiz} q
                  JOIN {quiz_attempts} qa ON qa.quiz = q.id
                  JOIN {quizaccess_cheatdetect_events} cde ON cde.attemptid = qa.id
                 WHERE cde.userid = :userid";

        $quizzes = $DB->get_records_sql($sql, ['userid' => $userid]);

        foreach ($quizzes as $quiz) {
            $cm = get_coursemodule_from_instance('quiz', $quiz->id);
            $context = \context_module::instance($cm->id);
            $contextlist->add_context($context);
        }

        return $contextlist;
    }

    /**
     * Exports all user data for the specified approved contexts.
     *
     * @param approved_contextlist $contextlist The approved contexts to export data from.
     * @return void
     */
    public static function export_user_data(approved_contextlist $contextlist) {
        global $DB;

        $user = $contextlist->get_user();

        foreach ($contextlist->get_contexts() as $context) {
            $quizid = $context->instanceid;

            // Export events
            $events = $DB->get_records_sql("
                SELECT cde.*
                  FROM {quizaccess_cheatdetect_events} cde
                  JOIN {quiz_attempts} qa ON qa.id = cde.attemptid
                 WHERE qa.quiz = :quizid
                   AND cde.userid = :userid",
                ['quizid' => $quizid, 'userid' => $user->id]
            );

            writer::export_data(
                [$context->id, 'events'],
                array_values($events)
            );

            // Export metrics
            $metrics = $DB->get_records_sql("
                SELECT cdm.*
                  FROM {quizaccess_cheatdetect_metrics} cdm
                  JOIN {quiz_attempts} qa ON qa.id = cdm.attemptid
                 WHERE qa.quiz = :quizid
                   AND cdm.userid = :userid",
                ['quizid' => $quizid, 'userid' => $user->id]
            );

            writer::export_data(
                [$context->id, 'metrics'],
                array_values($metrics)
            );

            // Export extensions
            $extensions = $DB->get_records_sql("
                SELECT cdext.*
                  FROM {quizaccess_cheatdetect_extensions} cdext
                  JOIN {quiz_attempts} qa ON qa.id = cdext.attemptid
                 WHERE qa.quiz = :quizid
                   AND cdext.userid = :userid",
                ['quizid' => $quizid, 'userid' => $user->id]
            );

            writer::export_data(
                [$context->id, 'extensions'],
                array_values($extensions)
            );
        }
    }

    /**
     * Deletes all user data for all users within the specified context.
     *
     * @param \context $context The context to delete data from.
     * @return void
     */
    public static function delete_data_for_all_users_in_context(\context $context) {
        global $DB;

        $quizid = $context->instanceid;

        $subquery = "attemptid IN (SELECT id FROM {quiz_attempts} WHERE quiz = :quizid)";

        $DB->delete_records_select('quizaccess_cheatdetect_events', $subquery, ['quizid' => $quizid]);
        $DB->delete_records_select('quizaccess_cheatdetect_metrics', $subquery, ['quizid' => $quizid]);
        $DB->delete_records_select('quizaccess_cheatdetect_extensions', $subquery, ['quizid' => $quizid]);
    }

    /**
     * Deletes all user data for a specific user within the specified context.
     *
     * @param \context $context The context to delete data from.
     * @param int $userid The user ID whose data should be deleted.
     * @return void
     */
    public static function delete_data_for_user(\context $context, $userid) {
        global $DB;

        $quizid = $context->instanceid;

        $subquery = "attemptid IN (SELECT id FROM {quiz_attempts} WHERE quiz = :quizid) AND userid = :userid";
        $params = ['quizid' => $quizid, 'userid' => $userid];

        $DB->delete_records_select('quizaccess_cheatdetect_events', $subquery, $params);
        $DB->delete_records_select('quizaccess_cheatdetect_metrics', $subquery, $params);
        $DB->delete_records_select('quizaccess_cheatdetect_extensions', $subquery, $params);
    }

    /**
     * Adds to the userlist all users who have data stored in the specified context.
     *
     * @param userlist $userlist The userlist object to populate.
     * @return void
     */
    public static function get_users_in_context(userlist $userlist) {
        global $DB;
        $context = $userlist->get_context();

        $users = $DB->get_records_sql("
            SELECT DISTINCT cde.userid
              FROM {quizaccess_cheatdetect_events} cde
              JOIN {quiz_attempts} qa ON qa.id = cde.attemptid
             WHERE qa.quiz = :quizid",
            ['quizid' => $context->instanceid]
        );

        foreach ($users as $user) {
            $userlist->add_user($user->userid);
        }
    }

    /**
     * Deletes user data for multiple users within the specified context.
     *
     * @param \context $context The context to delete data from.
     * @param int[] $userids The list of user IDs whose data should be deleted.
     * @return void
     */
    public static function delete_data_for_users(\context $context, array $userids) {
        global $DB;

        if (empty($userids)) {
            return;
        }

        $quizid = $context->instanceid;

        list($usql, $params) = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'uid');
        $params['quizid'] = $quizid;

        $subquery = "attemptid IN (SELECT id FROM {quiz_attempts} WHERE quiz = :quizid) AND userid $usql";

        $DB->delete_records_select('quizaccess_cheatdetect_events', $subquery, $params);
        $DB->delete_records_select('quizaccess_cheatdetect_metrics', $subquery, $params);
        $DB->delete_records_select('quizaccess_cheatdetect_extensions', $subquery, $params);
    }

}
