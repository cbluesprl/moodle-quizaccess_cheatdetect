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
 * @author     gnormand@cblue.be, abrichard@cblue.be
 * @since      1.0.0
 */

namespace quizaccess_cheatdetect\persistent;

defined('MOODLE_INTERNAL') || exit();

use core\persistent;
/**
 * Class representing a cheat detection extension record for a quiz attempt.
 *
 * This class extends the core persistent class and defines the properties
 * that are stored in the 'quizaccess_cheatdetect_extensions' table.
 *
 * @package    mod_quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class extension extends persistent
{
    const TABLE = 'quizaccess_cheatdetect_extensions';
    /**
     * Defines the properties of a cheat detection extension.
     *
     * Each property corresponds to a column in the 'quizaccess_cheatdetect_extensions'
     * database table and specifies its type, default value, and nullability.
     *
     * @return array<string, array<string, mixed>> An associative array defining
     *                                           the extension properties.
     */
    protected static function define_properties(): array
    {
        return [
            'attemptid' => [
                'type' => PARAM_INT,
            ],
            'userid' => [
                'type' => PARAM_INT,
            ],
            'quizid' => [
                'type' => PARAM_INT,
            ],
            'slot' => [
                'type' => PARAM_INT,
                'null' => NULL_ALLOWED,
                'default' => null,
            ],
            'extension_key' => [
                'type' => PARAM_ALPHANUMEXT,
            ],
            'extension_name' => [
                'type' => PARAM_TEXT,
            ],
            'extension_uid' => [
                'type' => PARAM_ALPHANUMEXT,
            ],
            'detection_data' => [
                'type' => PARAM_RAW,
                'null' => NULL_ALLOWED,
                'default' => null,
            ],
            'timecreated' => [
                'type' => PARAM_INT,
                'default' => time(),
            ],
        ];
    }
}
