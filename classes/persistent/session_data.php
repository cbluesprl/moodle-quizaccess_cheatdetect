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

/**
 * Class representing a session data record.
 *
 * @copyright  2025 CBlue SRL <support@cblue.be>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_cheatdetect\persistent;

defined('MOODLE_INTERNAL') || exit();

use coding_exception;
use core\persistent;
use stdClass;
/**
 * Class representing additional session data for cheat detection.
 *
 * This class extends the core persistent class and defines the properties
 * stored in the 'quizaccess_cheatdetect_data' table.
 * It provides helper methods to encode and decode JSON session data.
 *
 * @package    mod_quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class session_data extends persistent
{
    const TABLE = 'quizaccess_cheatdetect_data';
    /**
     * Defines the properties of a cheat detection session data record.
     *
     * Each property corresponds to a column in the
     * 'quizaccess_cheatdetect_data' database table.
     *
     * @return array<string, array<string, mixed>> An associative array defining
     *                                           the session data properties.
     */
    protected static function define_properties(): array
    {
        return [
            'sessionid' => [
                'type' => PARAM_INT,
            ],
            'data' => [
                'type' => PARAM_RAW,
            ],
        ];
    }

    /**
     * Returns the decoded JSON session data.
     *
     * The stored JSON string is decoded into a PHP object or array.
     *
     * @return stdClass|array The decoded session data.
     * @throws coding_exception If the property access fails.
     */
    public function get_data_decoded(): stdClass|array
    {
        return json_decode($this->get('data'));
    }

    /**
     * Sets the session data from a PHP structure.
     *
     * The provided data is encoded to JSON before being stored.
     *
     * @param stdClass|array|string $data The data to encode and store.
     * @return static The current persistent instance.
     * @throws coding_exception If the property assignment fails.
     */
    public function set_data_from_object(stdClass|array|string $data): static
    {
        $this->set('data', json_encode($data));

        return $this;
    }
}
