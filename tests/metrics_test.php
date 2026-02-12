<?php
defined('MOODLE_INTERNAL') || die();

use advanced_testcase;

class quizaccess_cheatdetect_metrics_test extends advanced_testcase {

    protected function setUp(): void {
        $this->resetAfterTest(true);
    }

    public function test_insert_metrics() {
        global $DB;

        $record = (object)[
            'userid' => 3,
            'attemptid' => 15,
            'quizid' => 6,
            'slot' => 2,
            'copycount' => 4,
            'focusloss' => 2,
            'timespent' => 120,
            'timecreated' => time()
        ];

        $id = $DB->insert_record('quizaccess_cheatdetect_metrics', $record);

        $this->assertNotEmpty($id);

        $stored = $DB->get_record('quizaccess_cheatdetect_metrics', ['id' => $id]);

        $this->assertEquals(4, $stored->copycount);
        $this->assertEquals(2, $stored->focusloss);
        $this->assertEquals(120, $stored->timespent);
    }
}
