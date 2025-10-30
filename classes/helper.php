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
 * Helper class for quizaccess_cheatdetect.
 *
 * @copyright  2025 CBlue SRL <support@cblue.be>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_cheatdetect;

defined('MOODLE_INTERNAL') || exit();

use dml_exception;
use quizaccess_cheatdetect\persistent\session;
use quizaccess_cheatdetect\persistent\session_data;
use stdClass;

class helper
{
    /**
     * @param  int  $attemptid
     * @param  array  $options
     * @return array
     *
     * @throws dml_exception
     */
    public static function get_attempt_sessions(int $attemptid, array $options = []): array
    {
        global $DB;

        $where = ['attemptid = :attemptid'];
        $params = ['attemptid' => $attemptid];

        if (! empty($options['timestart'])) {
            $where[] = 'timecreated >= :timestart';
            $params['timestart'] = $options['timestart'];
        }

        if (! empty($options['timeend'])) {
            $where[] = 'timecreated <= :timeend';
            $params['timeend'] = $options['timeend'];
        }

        if (! empty($options['slot'])) {
            $where[] = 'slot = :slot';
            $params['slot'] = $options['slot'];
        }

        $wherestr = implode(' AND ', $where);

        return $DB->get_records_sql(
            'SELECT * FROM {'.session::TABLE.'} WHERE ' . $wherestr . ' ORDER BY timecreated DESC',
            $params
        );
    }

    /**
     * @param  int  $quizid
     * @param  array  $options
     * @return array
     *
     * @throws dml_exception
     */
    public static function get_quiz_sessions(int $quizid, array $options = []): array
    {
        global $DB;

        $where = ['quizid = :quizid'];
        $params = ['quizid' => $quizid];

        if (! empty($options['timestart'])) {
            $where[] = 'timecreated >= :timestart';
            $params['timestart'] = $options['timestart'];
        }

        if (! empty($options['timeend'])) {
            $where[] = 'timecreated <= :timeend';
            $params['timeend'] = $options['timeend'];
        }

        if (! empty($options['userid'])) {
            $where[] = 'userid = :userid';
            $params['userid'] = $options['userid'];
        }

        if (! empty($options['slot'])) {
            $where[] = 'slot = :slot';
            $params['slot'] = $options['slot'];
        }

        $wherestr = implode(' AND ', $where);

        return $DB->get_records_sql(
            'SELECT * FROM {'.session::TABLE.'} WHERE ' . $wherestr . ' ORDER BY timecreated DESC',
            $params
        );
    }

    /**
     * @param  int  $sessionid
     * @return stdClass|null
     *
     * @throws dml_exception
     */
    public static function get_session_with_data(int $sessionid): ?stdClass
    {
        global $DB;

        $session = $DB->get_record(session::TABLE, ['id' => $sessionid]);

        if (! $session) {
            return null;
        }

        $sessiondata = $DB->get_record(session_data::TABLE, ['sessionid' => $sessionid]);

        if ($sessiondata && ! empty($sessiondata->data)) {
            $session->data = json_decode($sessiondata->data);
        } else {
            $session->data = null;
        }

        return $session;
    }

    /**
     * @param  int  $attemptid
     * @param  array  $options
     * @return stdClass
     *
     * @throws dml_exception
     */
    public static function get_attempt_summary(int $attemptid, array $options = []): stdClass
    {
        global $DB;

        $params = ['attemptid' => $attemptid];
        $where = ['attemptid = :attemptid'];

        if (! empty($options['timestart'])) {
            $where[] = 'timecreated >= :timestart';
            $params['timestart'] = $options['timestart'];
        }

        if (! empty($options['timeend'])) {
            $where[] = 'timecreated <= :timeend';
            $params['timeend'] = $options['timeend'];
        }

        $wherestr = implode(' AND ', $where);

        $sessionsql = '
            SELECT
                COUNT(*) as session_count,
                SUM(duration) as total_duration,
                AVG(duration) as avg_duration
            FROM {'.session::TABLE.'}
            WHERE ' . $wherestr;

        $session = $DB->get_record_sql($sessionsql, $params);

        $result = new stdClass;
        $result->attemptid = $attemptid;
        $result->session_count = $session->session_count ?? 0;
        $result->total_duration = $session->total_duration ?? 0;
        $result->avg_duration = $session->avg_duration ?? 0;

        return $result;
    }

    /**
     * @param  int  $quizid
     * @param  array  $options
     * @return array
     *
     * @throws dml_exception
     */
    public static function get_quiz_user_activity_summary(int $quizid, array $options = []): array
    {
        global $DB;

        $params = ['quizid' => $quizid];
        $where = ['quizid = :quizid'];

        if (! empty($options['timestart'])) {
            $where[] = 'timecreated >= :timestart';
            $params['timestart'] = $options['timestart'];
        }

        if (! empty($options['timeend'])) {
            $where[] = 'timecreated <= :timeend';
            $params['timeend'] = $options['timeend'];
        }

        $wherestr = implode(' AND ', $where);

        $sessionsql = '
            SELECT
                userid,
                attemptid,
                COUNT(*) as session_count,
                SUM(duration) as total_duration
            FROM {'.session::TABLE.'}
            WHERE ' . $wherestr . '
            GROUP BY userid, attemptid
        ';

        $sessions = $DB->get_records_sql($sessionsql, $params);

        $result = [];

        foreach ($sessions as $session) {
            $userid = $session->userid;
            $attemptid = $session->attemptid;

            if (! isset($result[$userid])) {
                $result[$userid] = new stdClass;
                $result[$userid]->userid = $userid;
                $result[$userid]->attempts = [];
            }

            $result[$userid]->attempts[$attemptid] = new stdClass;
            $result[$userid]->attempts[$attemptid]->attemptid = $attemptid;
            $result[$userid]->attempts[$attemptid]->session_count = $session->session_count;
            $result[$userid]->attempts[$attemptid]->total_duration = $session->total_duration;
        }

        return $result;
    }
}
