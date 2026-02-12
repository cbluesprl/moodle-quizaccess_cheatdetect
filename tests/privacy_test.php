<?php
defined('MOODLE_INTERNAL') || die();

use advanced_testcase;
use quizaccess_cheatdetect\privacy\provider;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;

class quizaccess_cheatdetect_privacy_test extends advanced_testcase {

    protected function setUp(): void {
        $this->resetAfterTest(true);
    }

    /**
     * Create a quiz with one attempt for a user.
     */
    protected function create_quiz_with_attempt($user) {
        global $DB;

        $generator = $this->getDataGenerator();

        $course = $generator->create_course();
        $quiz = $generator->create_module('quiz', ['course' => $course->id]);

        $cm = get_coursemodule_from_instance('quiz', $quiz->id);
        $context = \context_module::instance($cm->id);

        $attemptid = $DB->insert_record('quiz_attempts', (object)[
            'quiz' => $quiz->id,
            'userid' => $user->id,
            'attempt' => 1,
            'uniqueid' => 1,
            'layout' => '',
            'timestart' => time(),
            'timefinish' => time(),
            'timemodified' => time(),
            'state' => 'finished'
        ]);

        return [$quiz, $context, $attemptid];
    }

    /**
     * Test get_contexts_for_userid()
     */
    public function test_get_contexts_for_userid() {
        global $DB;

        $user = $this->getDataGenerator()->create_user();
        list($quiz, $context, $attemptid) = $this->create_quiz_with_attempt($user);

        $DB->insert_record('quizaccess_cheatdetect_events', (object)[
            'attemptid' => $attemptid,
            'userid' => $user->id,
            'eventtype' => 'focusloss',
            'timecreated' => time()
        ]);

        $contextlist = provider::get_contexts_for_userid($user->id);

        $this->assertCount(1, $contextlist->get_contextids());
        $this->assertEquals($context->id, $contextlist->get_contextids()[0]);
    }

    /**
     * Test export_user_data()
     */
    public function test_export_user_data() {
        global $DB;

        $user = $this->getDataGenerator()->create_user();
        list($quiz, $context, $attemptid) = $this->create_quiz_with_attempt($user);

        $DB->insert_record('quizaccess_cheatdetect_metrics', (object)[
            'attemptid' => $attemptid,
            'userid' => $user->id,
            'copycount' => 2,
            'focusloss' => 1,
            'timespent' => 45,
            'timecreated' => time()
        ]);

        $contextlist = provider::get_contexts_for_userid($user->id);

        $approved = new approved_contextlist(
            $user,
            'quizaccess_cheatdetect',
            $contextlist->get_contextids()
        );

        provider::export_user_data($approved);

        $data = writer::with_context($context)->get_data();

        $this->assertNotEmpty($data);
    }

    /**
     * Test delete_data_for_user()
     */
    public function test_delete_data_for_user() {
        global $DB;

        $user = $this->getDataGenerator()->create_user();
        list($quiz, $context, $attemptid) = $this->create_quiz_with_attempt($user);

        $DB->insert_record('quizaccess_cheatdetect_events', (object)[
            'attemptid' => $attemptid,
            'userid' => $user->id,
            'eventtype' => 'copy',
            'timecreated' => time()
        ]);

        provider::delete_data_for_user($context, $user->id);

        $this->assertFalse(
            $DB->record_exists('quizaccess_cheatdetect_events', ['userid' => $user->id])
        );
    }

    /**
     * Test delete_data_for_all_users_in_context()
     */
    public function test_delete_data_for_all_users_in_context() {
        global $DB;

        $user = $this->getDataGenerator()->create_user();
        list($quiz, $context, $attemptid) = $this->create_quiz_with_attempt($user);

        $DB->insert_record('quizaccess_cheatdetect_events', (object)[
            'attemptid' => $attemptid,
            'userid' => $user->id,
            'eventtype' => 'focusloss',
            'timecreated' => time()
        ]);

        provider::delete_data_for_all_users_in_context($context);

        $this->assertFalse(
            $DB->record_exists('quizaccess_cheatdetect_events', ['userid' => $user->id])
        );
    }

    /**
     * Test get_users_in_context()
     */
    public function test_get_users_in_context() {
        global $DB;

        $user = $this->getDataGenerator()->create_user();
        list($quiz, $context, $attemptid) = $this->create_quiz_with_attempt($user);

        $DB->insert_record('quizaccess_cheatdetect_events', (object)[
            'attemptid' => $attemptid,
            'userid' => $user->id,
            'eventtype' => 'copy',
            'timecreated' => time()
        ]);

        $userlist = new userlist($context, 'quizaccess_cheatdetect');
        provider::get_users_in_context($userlist);

        $this->assertContains($user->id, $userlist->get_userids());
    }

    /**
     * Test delete_data_for_users()
     */
    public function test_delete_data_for_users() {
        global $DB;

        $user = $this->getDataGenerator()->create_user();
        list($quiz, $context, $attemptid) = $this->create_quiz_with_attempt($user);

        $DB->insert_record('quizaccess_cheatdetect_events', (object)[
            'attemptid' => $attemptid,
            'userid' => $user->id,
            'eventtype' => 'copy',
            'timecreated' => time()
        ]);

        provider::delete_data_for_users($context, [$user->id]);

        $this->assertFalse(
            $DB->record_exists('quizaccess_cheatdetect_events', ['userid' => $user->id])
        );
    }
}
