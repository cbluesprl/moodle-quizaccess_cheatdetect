<?php
/**
 * @package     quizaccess_cheatdetect
 * @copyright   2025 CBlue SRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

namespace quizaccess_cheatdetect\privacy;

use \core_privacy\local\metadata\null_provider;

defined('MOODLE_INTERNAL') || die();

/**
 * Privacy provider for quizaccess_cheatdetect.
 */
class provider implements null_provider {

    /**
     * Get the language string identifier for this plugin.
     *
     * @return string
     */
    public static function get_reason() : string {
        return 'privacy:metadata';
    }
}
