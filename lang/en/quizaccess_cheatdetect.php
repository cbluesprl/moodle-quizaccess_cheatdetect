<?php
/**
 * @package     quizaccess_cheatdetect
 * @copyright   2025 CBlue SPRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Cheat Detection';
$string['privacy:metadata'] = 'The Cheat Detection quiz access rule plugin does not store any personal data.'; // TODO A VERIFIER

// Results
$string['cheatdetection'] = 'Cheat Detection';
$string['noeventsdetected'] = 'No suspicious events detected';
$string['eventsdetected'] = '{$a} suspicious event(s) detected';

// Quiz creation layout
$string['layoutwarning'] = 'Warning: In this configuration, the cheat detection plugin cannot function. To use it, please select the "Each question" setting.';

// Review question page - summary block
$string['timespent'] = 'The user spent {$a->minutes} minutes ({$a->percentage}% of the quiz) on this question';
$string['copycount'] = 'Number of copy(ies) on the question text: {$a}';
$string['focuslosscount'] = 'Number of page focus loss(es): {$a}';
$string['extensiondetected'] = 'Cheat extension detection: {$a}';
$string['yes'] = 'Yes';
$string['no'] = 'No';