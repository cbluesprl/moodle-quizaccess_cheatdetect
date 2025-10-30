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
 * @copyright  2025 CBlue SRL <support@cblue.be>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_cheatdetect\rest_services\services;

use local_rest\Routes;
use quizaccess_cheatdetect\helper;
use stdClass;

defined('MOODLE_INTERNAL') || die();

class AttemptSummaryService extends Routes
{
    public static function get_attempt_summary(?stdClass $payload, ?stdclass $route_params, ?stdclass $get_params): stdClass
    {
        $response = new stdClass();
        $response->success = false;

        try {
            if (empty($route_params->attemptid)) {
                throw new \Exception('No attemptid provided');
            }

            $attemptid = (int) $route_params->attemptid;

            $summary = helper::get_attempt_summary($attemptid);

            $response->success = true;
            $response->data = $summary;
        } catch (\Throwable $e) {
            $response->error = $e->getMessage();
        }

        return $response;
    }
}
