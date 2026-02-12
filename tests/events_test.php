<?php
defined('MOODLE_INTERNAL') || die();

use advanced_testcase;

class quizaccess_cheatdetect_events_test extends advanced_testcase {

    protected function setUp(): void {
        $this->resetAfterTest(true);
    }

    public function test_insert_event() {
        global $DB;

        $record = (object)[
            'userid' => 2,
            'attemptid' => 10,
            'quizid' => 5,
            'slot' => 1,
            'eventtype' => 'focusloss',
            'timecreated' => time()
        ];

        $id = $DB->insert_record('quizaccess_cheatdetect_events', $record);

        $this->assertNotEmpty($id);

        $stored = $DB->get_record('quizaccess_cheatdetect_events', ['id' => $id]);

        $this->assertEquals('focusloss', $stored->eventtype);
    }
}
