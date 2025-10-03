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

// Settings
$string['cheatdetectenabled'] = 'Enable cheat detection';
$string['cheatdetectenabled_help'] = 'If enabled, the quiz will monitor user behavior to detect potential cheating.';

// Results
$string['cheatdetection'] = 'Cheat Detection';
$string['noeventsdetected'] = 'No suspicious events detected';
$string['eventsdetected'] = '{$a} suspicious event(s) detected';