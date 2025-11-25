<?php
/**
 * @package     quizaccess_cheatdetect
 * @copyright   2025 CBlue SPRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Callback to inject JavaScript into any page
 * This is called before the page output
 */
function quizaccess_cheatdetect_before_footer() {
    global $PAGE, $DB;


    // Load JavaScript module

    $PAGE->requires->js_call_amd('quizaccess_cheatdetect/report_enhancer', 'init', [

    ]);
}