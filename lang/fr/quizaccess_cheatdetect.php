<?php
/**
 * @package     quizaccess_cheatdetect
 * @copyright   2025 CBlue SPRL
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author      gnormand@cblue.be
 */

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Détection de triche';
$string['privacy:metadata'] = 'Le plugin de règle d\'accès aux quiz Détection de triche ne stocke aucune donnée personnelle.'; // TODO A VERIFIER

// Settings
$string['cheatdetectenabled'] = 'Activer la détection de triche';
$string['cheatdetectenabled_help'] = 'Si activé, le quiz surveillera le comportement de l\'utilisateur pour détecter une triche potentielle.';

// Results
$string['cheatdetection'] = 'Détection de triche';
$string['noeventsdetected'] = 'Aucun événement suspect détecté';
$string['eventsdetected'] = '{$a} événement(s) suspect(s) détecté(s)';
