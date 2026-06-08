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
 * @package    quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     gnormand@cblue.be
 * @since      1.0.0
 */

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Cheat Detection';
$string['privacy:metadata'] = 'The CheatDetect plugin stores information about quiz attempts for anti-cheating purposes.';
$string['privacy:metadata:metric'] = 'Stores metrics like time focused, copy count, and focus loss.';
$string['privacy:metadata:event'] = 'Stores raw events captured during a quiz attempt.';
$string['privacy:metadata:extension'] = 'Stores information about detected browser extensions.';

// Results
$string['cheatdetection'] = 'Cheat Detection';
$string['noeventsdetected'] = 'No suspicious events detected';
$string['eventsdetected'] = '{$a} suspicious event(s) detected';

// Review question page - summary block
$string['questiondetails'] = 'Cheat Detection - Question details';
$string['timespent'] = 'The user spent {$a->duration} ({$a->percentage}% of the quiz) on question {$a->slot}';
$string['day'] = 'day';
$string['days'] = 'days';
$string['hour'] = 'hour';
$string['hours'] = 'hours';
$string['minute'] = 'minute';
$string['minutes'] = 'minutes';
$string['second'] = 'second';
$string['seconds'] = 'seconds';
$string['copycount'] = 'Number of copy(ies) on the question text: {$a}';
$string['focuslosscount'] = 'Number of page focus loss(es): {$a}';
$string['extensiondetected'] = 'Cheat extension detection: {$a}';
$string['yes'] = 'Yes';
$string['no'] = 'No';
$string['closepopover'] = 'Close';
$string['multiplepageswarning'] = 'Cheat detection unavailable: quiz must display one question per page.';

$string['cheatdetectheader'] = 'Cheat Detection';
$string['cheatdetectinfo'] = 'Cheat detection is automatically enabled for this quiz if you select "One question per page" layout. The system will monitor student behavior during quiz attempts to detect potential cheating patterns such as focus loss, copy/paste actions, and browser extensions.';
$string['layoutwarning'] = 'Warning: Cheat detection only works with "One question per page" layout. Please change the "Questions per page" setting to enable monitoring.';
$string['cheatdetectdescription'] = 'This quiz monitors student behavior during attempts to detect potential cheating patterns.';

// Admin settings: per-language description override shown to students.
$string['setting:descriptionheading'] = 'Description shown to students';
$string['setting:descriptionheading_desc'] = 'Customize the message displayed to students in the quiz information section. The plugin shows the field matching the user\'s language. Leave a field empty to use the default text.';
$string['setting:customdescriptionenabled'] = 'Use a custom description';
$string['setting:customdescriptionenabled_desc'] = 'When enabled, the per-language descriptions below replace the default text shown to students. When disabled, the default text is always used.';
$string['setting:descriptionen'] = 'Description (English)';
$string['setting:descriptionen_desc'] = 'Text shown to students whose interface language is English.';
$string['setting:descriptionfr'] = 'Description (French)';
$string['setting:descriptionfr_desc'] = 'Text shown to students whose interface language is French.';

$string['cheatdetect:view'] = 'View cheat detection configuration and global data';
$string['cheatdetect:manage'] = 'Manage cheat detection configuration';
$string['cheatdetect:viewcoursereports'] = 'View cheat detection course reports';

$string['privacy:metadata:attemptid'] = 'The ID of the quiz attempt associated with this record.';
$string['privacy:metadata:userid'] = 'The ID of the user associated with this record.';
$string['privacy:metadata:actions'] = 'The actions recorded during the quiz attempt.';
$string['privacy:metadata:metrics'] = 'The computed metrics associated with the user\'s quiz attempt.';
$string['privacy:metadata:extensions'] = 'The extension data associated with the user\'s quiz attempt.';

$string['privacy:metadata:quizaccess_cheatdetect_events'] = 'Stores raw events recorded during quiz attempts for cheat detection analysis.';
$string['privacy:metadata:quizaccess_cheatdetect_metrics'] = 'Stores computed cheat detection metrics for each quiz attempt.';
$string['privacy:metadata:quizaccess_cheatdetect_extensions'] = 'Stores extension data linked to quiz attempts for cheat detection purposes.';

// Embedded-mode (iframe) event labels used in reports.
$string['event_tab_hidden'] = 'Browser tab hidden';
$string['event_app_blur'] = 'Application window lost focus';
$string['event_iframe_blur'] = 'Quiz frame lost focus';
$string['event_parent_bridge_missing'] = 'Quiz parent page stopped responding';