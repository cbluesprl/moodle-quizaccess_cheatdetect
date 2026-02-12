<?php
defined('MOODLE_INTERNAL') || die();

use advanced_testcase;

class quizaccess_cheatdetect_extensions_test extends advanced_testcase {

    protected function setUp(): void {
        $this->resetAfterTest(true);
    }

    public function test_insert_extension_detection() {
        global $DB;

        $record = (object)[
            'userid' => 4,
            'attemptid' => 20,
            'quizid' => 8,
            'extensionname' => 'SuspiciousExtension',
            'detected' => 1,
            'timecreated' => time()
        ];

        $id = $DB->insert_record('quizaccess_cheatdetect_extensions', $record);

        $this->assertNotEmpty($id);

        $stored = $DB->get_record('quizaccess_cheatdetect_extensions', ['id' => $id]);

        $this->assertEquals('SuspiciousExtension', $stored->extensionname);
        $this->assertEquals(1, $stored->detected);
    }
}
