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
 * @package    mod_quizaccess_cheatdetect
 * @copyright  2026 CBlue SRL
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author     gnormand@cblue.be
 * @since      1.0.0
 */

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Détection de triche';
$string['privacy:metadata'] = 'Le plugin CheatDetect enregistre des informations sur les tentatives de quiz pour détecter la triche.';
$string['privacy:metadata:metric'] = 'Stocke des métriques telles que le temps de concentration, le nombre de copies et les pertes de focus.';
$string['privacy:metadata:event'] = 'Stocke les événements bruts capturés pendant une tentative de quiz.';
$string['privacy:metadata:extension'] = 'Stocke les informations sur les extensions de navigateur détectées.';

// Results
$string['cheatdetection'] = 'Détection de triche';
$string['noeventsdetected'] = 'Aucun événement suspect détecté';
$string['eventsdetected'] = '{$a} événement(s) suspect(s) détecté(s)';


// Review question page - summary block
$string['questiondetails'] = 'Détection de triche - Détails de la question';
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
$string['multiplepageswarning'] = 'Détection de triche indisponible : le quiz doit afficher une seule question par page.';

$string['cheatdetectheader'] = 'Détection de triche';
$string['cheatdetectinfo'] = 'La détection de triche est automatiquement activée pour ce quiz si vous sélectionnez la disposition "Une question par page". Le système surveillera le comportement des étudiants pendant les tentatives pour détecter des comportements suspects tels que la perte de focus, les actions copier/coller et les extensions de navigateur.';
$string['layoutwarning'] = 'Attention : La détection de triche ne fonctionne qu\'avec la disposition "Une question par page". Veuillez modifier le paramètre "Questions par page" pour activer la surveillance.';
$string['cheatdetectdescription'] = 'Ce quiz surveille le comportement des étudiants pendant les tentatives pour détecter des comportements suspects.';