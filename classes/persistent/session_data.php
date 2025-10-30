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

class session_data extends persistent
{
    const TABLE = 'quizaccess_cheatdetect_data';

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
     * @throws coding_exception
     */
    public function get_data_decoded(): stdClass|array
    {
        return json_decode($this->get('data'));
    }

    /**
     * @throws coding_exception
     */
    public function set_data_from_object(stdClass|array|string $data): static
    {
        $this->set('data', json_encode($data));

        return $this;
    }
}
