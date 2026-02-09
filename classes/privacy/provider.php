<?php
namespace quizaccess_cheatdetect\privacy;

defined('MOODLE_INTERNAL') || die();

use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;

/**
 * Privacy API implementation for quizaccess_cheatdetect.
 */
class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\plugin\provider,
    \core_privacy\local\request\core_userlist_provider {

    // -------------------------------
    // Declare metadata
    // -------------------------------
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

    // -------------------------------------------------
    //  Context for an user
    // -------------------------------------------------
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
            $context = \context_module::instance($quiz->id);
            $contextlist->add_context($context);
        }

        return $contextlist;
    }

    // -------------------------------
    // Export user's data
    // -------------------------------
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

    // -------------------------------
    // Deleting data for all users in context
    // -------------------------------
    public static function delete_data_for_all_users_in_context(\context $context) {
        global $DB;

        $quizid = $context->instanceid;

        $DB->delete_records_sql("
            DELETE cde
              FROM {quizaccess_cheatdetect_events} cde
              JOIN {quiz_attempts} qa ON qa.id = cde.attemptid
             WHERE qa.quiz = :quizid",
            ['quizid' => $quizid]
        );

        $DB->delete_records_sql("
            DELETE cdm
              FROM {quizaccess_cheatdetect_metrics} cdm
              JOIN {quiz_attempts} qa ON qa.id = cdm.attemptid
             WHERE qa.quiz = :quizid",
            ['quizid' => $quizid]
        );

        $DB->delete_records_sql("
            DELETE cdext
              FROM {quizaccess_cheatdetect_extensions} cdext
              JOIN {quiz_attempts} qa ON qa.id = cdext.attemptid
             WHERE qa.quiz = :quizid",
            ['quizid' => $quizid]
        );
    }

    // -------------------------------
    // Deleting data for an users in context
    // -------------------------------
    public static function delete_data_for_user(\context $context, $userid) {
        global $DB;

        $quizid = $context->instanceid;

        $DB->delete_records_sql("
            DELETE cde
              FROM {quizaccess_cheatdetect_events} cde
              JOIN {quiz_attempts} qa ON qa.id = cde.attemptid
             WHERE qa.quiz = :quizid
               AND cde.userid = :userid",
            ['quizid' => $quizid, 'userid' => $userid]
        );

        $DB->delete_records_sql("
            DELETE cdm
              FROM {quizaccess_cheatdetect_metrics} cdm
              JOIN {quiz_attempts} qa ON qa.id = cdm.attemptid
             WHERE qa.quiz = :quizid
               AND cdm.userid = :userid",
            ['quizid' => $quizid, 'userid' => $userid]
        );

        $DB->delete_records_sql("
            DELETE cdext
              FROM {quizaccess_cheatdetect_extensions} cdext
              JOIN {quiz_attempts} qa ON qa.id = cdext.attemptid
             WHERE qa.quiz = :quizid
               AND cdext.userid = :userid",
            ['quizid' => $quizid, 'userid' => $userid]
        );
    }

    // -------------------------------
    //  Users list
    // -------------------------------
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

    // -------------------------------
    // Deleting data for an users in context
    // -------------------------------
    public static function delete_data_for_users(\context $context, array $userids) {
        global $DB;

        if (empty($userids)) {
            return;
        }

        $quizid = $context->instanceid;

        list($usql, $params) = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'uid');

        // Supprimer events
        $DB->delete_records_select("
        {quizaccess_cheatdetect_events} cde
        JOIN {quiz_attempts} qa ON qa.id = cde.attemptid
    ", "qa.quiz = :quizid AND cde.userid $usql", array_merge(['quizid' => $quizid], $params));

        // Supprimer metrics
        $DB->delete_records_select("
        {quizaccess_cheatdetect_metrics} cdm
        JOIN {quiz_attempts} qa ON qa.id = cdm.attemptid
    ", "qa.quiz = :quizid AND cdm.userid $usql", array_merge(['quizid' => $quizid], $params));

        // Supprimer extensions
        $DB->delete_records_select("
        {quizaccess_cheatdetect_extensions} cdext
        JOIN {quiz_attempts} qa ON qa.id = cdext.attemptid
    ", "qa.quiz = :quizid AND cdext.userid $usql", array_merge(['quizid' => $quizid], $params));
    }

}
