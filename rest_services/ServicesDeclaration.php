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

namespace quizaccess_cheatdetect\rest_services;

use local_rest\Routes;

defined('MOODLE_INTERNAL') || die();

class ServicesDeclaration extends Routes
{
    public array $services = [];

    public function __construct()
    {
        global $CFG;

        $this->register_middleware($CFG->dirroot . '/mod/quiz/accessrule/cheatdetect/rest_services/middlewares/SessionMiddleware.php','quizaccess_cheatdetect\rest_services\middlewares\SessionMiddleware','SessionMiddleware','handle');

        $this->register_service('POST', '/save-data', $CFG->dirroot . '/mod/quiz/accessrule/cheatdetect/rest_services/services/SaveDataService.php', 'quizaccess_cheatdetect\rest_services\services\SaveDataService', 'save_data', 'SessionMiddleware');
        $this->register_service('GET', '/attempt-summary/{attemptid}', $CFG->dirroot . '/mod/quiz/accessrule/cheatdetect/rest_services/services/AttemptSummaryService.php', 'quizaccess_cheatdetect\rest_services\services\AttemptSummaryService', 'get_attempt_summary', 'SessionMiddleware');
    }
}
