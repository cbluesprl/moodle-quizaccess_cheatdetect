<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

defined('MOODLE_INTERNAL') || die();

$functions = [

    'quizaccess_cheatdetect_save_data' => [
        'classname'   => 'quizaccess_cheatdetect\external\save_data',
        'methodname'  => 'execute',
        'classpath'   => '',
        'description' => 'Save cheat detection tracking data',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
    ],

    'quizaccess_cheatdetect_get_attempt_summary' => [
        'classname'   => 'quizaccess_cheatdetect\external\get_attempt_summary',
        'methodname'  => 'execute',
        'classpath'   => '',
        'description' => 'Get cheat detection summary for one attempt',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    ],

    'quizaccess_cheatdetect_get_slot_summary' => [
        'classname'   => 'quizaccess_cheatdetect\external\get_slot_summary',
        'methodname'  => 'execute',
        'classpath'   => '',
        'description' => 'Get cheat detection summary for one slot',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    ],

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
