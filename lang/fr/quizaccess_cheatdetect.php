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

// Results
$string['cheatdetection'] = 'Détection de triche';
$string['noeventsdetected'] = 'Aucun événement suspect détecté';
$string['eventsdetected'] = '{$a} événement(s) suspect(s) détecté(s)';

// Quiz creation layout
$string['layoutwarning'] = 'Attention, dans cette configuration, le plugin de détection de triche ne peut pas fonctionner. Pour l\'utiliser, veuillez sélectionner le paramètre "Chaque question".';

// Review question page - summary block
$string['questiondetails'] = 'Détails de la question';
$string['timespent'] = 'L\'utilisateur a passé {$a->duration} ({$a->percentage}% du quiz) sur la question {$a->slot}';
$string['day'] = 'jour';
$string['days'] = 'jours';
$string['hour'] = 'heure';
$string['hours'] = 'heures';
$string['minute'] = 'minute';
$string['minutes'] = 'minutes';
$string['second'] = 'seconde';
$string['seconds'] = 'secondes';
$string['copycount'] = 'Nombre de copie(s) sur l\'intitulé de la question : {$a}';
$string['focuslosscount'] = 'Nombre de perte(s) de focus de la page : {$a}';
$string['extensiondetected'] = 'Détection d\'extension de triche : {$a}';
$string['yes'] = 'Oui';
$string['no'] = 'Non';
$string['closepopover'] = 'Fermer';