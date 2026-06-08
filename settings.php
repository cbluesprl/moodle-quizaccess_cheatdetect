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
 * Global configuration settings for the quizaccess_cheatdetect plugin.
 *
 * Lets administrators override the description shown to students in the quiz
 * info section. One configurable field per supported language (EN/FR); each
 * field defaults to the localized base string so leaving it untouched keeps
 * the original behavior.
 *
 * @package    quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since      1.0.0
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {

    // Heading for the description override section.
    $settings->add(new admin_setting_heading(
        'quizaccess_cheatdetect/descriptionheading',
        get_string('setting:descriptionheading', 'quizaccess_cheatdetect'),
        get_string('setting:descriptionheading_desc', 'quizaccess_cheatdetect')
    ));

    // Master switch: when disabled, the localized base string is always used and
    // the override fields below are ignored.
    $settings->add(new admin_setting_configcheckbox(
        'quizaccess_cheatdetect/customdescriptionenabled',
        get_string('setting:customdescriptionenabled', 'quizaccess_cheatdetect'),
        get_string('setting:customdescriptionenabled_desc', 'quizaccess_cheatdetect'),
        '0'
    ));

    // English description shown to students. Defaults to the English base string,
    // forced via the string manager so it stays English regardless of the admin's language.
    $settings->add(new admin_setting_configtextarea(
        'quizaccess_cheatdetect/descriptionen',
        get_string('setting:descriptionen', 'quizaccess_cheatdetect'),
        get_string('setting:descriptionen_desc', 'quizaccess_cheatdetect'),
        get_string_manager()->get_string('cheatdetectdescription', 'quizaccess_cheatdetect', null, 'en'),
        PARAM_TEXT
    ));

    // French description shown to students. Defaults to the French base string,
    // forced via the string manager so it stays French regardless of the admin's language.
    $settings->add(new admin_setting_configtextarea(
        'quizaccess_cheatdetect/descriptionfr',
        get_string('setting:descriptionfr', 'quizaccess_cheatdetect'),
        get_string('setting:descriptionfr_desc', 'quizaccess_cheatdetect'),
        get_string_manager()->get_string('cheatdetectdescription', 'quizaccess_cheatdetect', null, 'fr'),
        PARAM_TEXT
    ));

    // Hide the override fields when the custom description is disabled.
    $settings->hide_if('quizaccess_cheatdetect/descriptionen',
        'quizaccess_cheatdetect/customdescriptionenabled', 'notchecked');
    $settings->hide_if('quizaccess_cheatdetect/descriptionfr',
        'quizaccess_cheatdetect/customdescriptionenabled', 'notchecked');
}