<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Capability definitions for the quizaccess_cheatdetect plugin.
 *
 * Defines all access control permissions used by the plugin,
 * including system-level configuration and course-level reporting access.
 *
 * @package    mod_quizaccess_cheatdetect
 * @category   access
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     gnormand@cblue.be
 * @author     abrichard@cblue.be
 * @since      1.0.0
 */
defined('MOODLE_INTERNAL') || exit();

/**
 * Capability definitions for the plugin.
 *
 * Each capability defines:
 * - captype: Type of access (read/write)
 * - contextlevel: Context in which the capability applies
 * - archetypes: Default role permissions
 * - riskbitmask: Optional risk level associated with the capability
 *
 * @var array
 */
$capabilities = [

    /**
     * Allows viewing cheat detection configuration and global data.
     *
     * Context level: System
     * Default access: Managers only
     */
    'quizaccess/cheatdetect:view' => [
        'captype' => 'read',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => [
            'manager' => CAP_ALLOW,
            'coursecreator' => CAP_PREVENT,
            'teacher' => CAP_PREVENT,
            'editingteacher' => CAP_PREVENT,
        ],
    ],
    /**
     * Allows managing cheat detection configuration.
     *
     * Context level: System
     * Risk level: Configuration changes (RISK_CONFIG)
     * Default access: Managers only
     */
    'quizaccess/cheatdetect:manage' => [
        'riskbitmask' => RISK_CONFIG,
        'captype' => 'write',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => [
            'manager' => CAP_ALLOW,
            'coursecreator' => CAP_PREVENT,
            'teacher' => CAP_PREVENT,
            'editingteacher' => CAP_PREVENT,
        ],
    ],
    /**
     * Allows viewing cheat detection reports within a course.
     *
     * Context level: Course
     * Default access: Managers, teachers, editing teachers and course creators
     */
    'quizaccess/cheatdetect:viewcoursereports' => [
        'captype' => 'read',
        'contextlevel' => CONTEXT_COURSE,
        'archetypes' => [
            'manager' => CAP_ALLOW,
            'teacher' => CAP_ALLOW,
            'editingteacher' => CAP_ALLOW,
            'coursecreator' => CAP_ALLOW,
        ],
    ],
];
