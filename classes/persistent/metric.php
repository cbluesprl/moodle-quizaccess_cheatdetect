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
 * Class representing a metric record.
 *
 * @copyright  2025 CBlue SRL <support@cblue.be>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_cheatdetect\persistent;

defined('MOODLE_INTERNAL') || exit();

use core\persistent;

class metric extends persistent
{
    const TABLE = 'quizaccess_cheatdetect_metrics';

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
            'time_total' => [
                'type' => PARAM_INT,
                'default' => 0,
            ],
            'time_focused' => [
                'type' => PARAM_INT,
                'default' => 0,
            ],
            'time_unfocused' => [
                'type' => PARAM_INT,
                'default' => 0,
            ],
            'copy_count' => [
                'type' => PARAM_INT,
                'default' => 0,
            ],
            'focus_loss_count' => [
                'type' => PARAM_INT,
                'default' => 0,
            ],
            'extension_count' => [
                'type' => PARAM_INT,
                'default' => 0,
            ],
            'last_event_timestamp' => [
                'type' => PARAM_INT,
                'null' => NULL_ALLOWED,
                'default' => null,
            ],
            'current_state' => [
                'type' => PARAM_ALPHANUMEXT,
                'null' => NULL_ALLOWED,
                'default' => null,
            ],
            'timecreated' => [
                'type' => PARAM_INT,
                'default' => time(),
            ],
            'timemodified' => [
                'type' => PARAM_INT,
                'default' => time(),
            ],
        ];
    }
}
