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