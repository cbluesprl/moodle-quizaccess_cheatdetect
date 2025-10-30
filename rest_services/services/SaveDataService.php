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
use quizaccess_cheatdetect\persistent\session;
use quizaccess_cheatdetect\persistent\session_data;
use stdClass;

defined('MOODLE_INTERNAL') || die();

class SaveDataService extends Routes
{
    public static function save_data(?stdClass $payload, ?stdclass $route_params, ?stdclass $get_params): stdClass
    {
        global $DB;

        $response = new stdClass();
        $response->success = false;

        try {
            if (empty($payload)) {
                throw new \Exception('No data provided');
            }

            $session_id = $payload->session_id ?? null;
            $attemptid = $payload->attemptid ?? null;
            $userid = $payload->userid ?? null;
            $quizid = $payload->quizid ?? null;
            $slot = $payload->slot ?? null;
            $events = $payload->events ?? [];

            if (empty($session_id) || empty($attemptid) || empty($userid) || empty($quizid)) {
                throw new \Exception('Missing required fields');
            }

            foreach ($events as $event) {
                $session_params = [
                    'session_id' => $session_id,
                    'attemptid' => $attemptid,
                    'userid' => $userid,
                    'quizid' => $quizid,
                    'slot' => $slot,
                    'duration' => 0,
                ];

                $where = ['session_id = :session_id', 'attemptid = :attemptid', 'userid = :userid'];
                $params = [
                    'session_id' => $session_id,
                    'attemptid' => $attemptid,
                    'userid' => $userid,
                ];

                if ($slot !== null) {
                    $where[] = 'slot = :slot';
                    $params['slot'] = $slot;
                } else {
                    $where[] = 'slot IS NULL';
                }

                $existing_session = $DB->get_record_select(session::TABLE, implode(' AND ', $where), $params);

                if ($existing_session) {
                    $session_record_id = $existing_session->id;
                } else {
                    $session_obj = new session(0, (object) $session_params);
                    $session_obj->create();
                    $session_record_id = $session_obj->get('id');
                }

                if (!empty($event)) {
                    $session_data_record = new session_data;
                    $session_data_record->set('sessionid', $session_record_id);
                    $session_data_record->set('data', json_encode($event));
                    $session_data_record->create();
                }
            }

            $response->success = true;
        } catch (\Throwable $e) {
            $response->error = $e->getMessage();
        }

        return $response;
    }
}
