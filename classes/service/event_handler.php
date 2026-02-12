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
 * @author     gnormand@cblue.be, abrichard@cblue.be
 * @since      1.0.0
 */

namespace quizaccess_cheatdetect\service;

defined('MOODLE_INTERNAL') || die();

use coding_exception;
use quizaccess_cheatdetect\persistent\event;
use quizaccess_cheatdetect\persistent\metric;
use quizaccess_cheatdetect\persistent\extension;
/**
 * Service responsible for handling and processing cheat detection events.
 *
 * This class acts as the main entry point for incoming frontend events.
 * It stores raw events, updates related metrics, dispatches specific
 * handlers depending on the action type, and manages extension detection.
 *
 * @package    mod_quizaccess_cheatdetect
 */
class event_handler {

    const TIMESTAMP_CONVERSION_FACTOR = 1000;

    /**
     * Main entry point for processing an incoming event.
     *
     * Validates the event payload, stores the raw event, updates metrics,
     * dispatches the corresponding handler, and processes extensions if needed.
     *
     * @param \stdClass $eventdata The event data received from the frontend.
     * @param array $context Context information (attemptid, userid, quizid, slot, session_id).
     * @return void
     */
    public static function process_event(\stdClass $eventdata, array $context): void {
        if (empty($eventdata->action) || empty($eventdata->timestamp['unix'])) {
            return;
        }

        $timestamp = (int)$eventdata->timestamp['unix'];

        // Sauvegarder l'événement brut
        self::save_raw_event($eventdata, $context, $timestamp);

        // Récupère ou crée le metric
        $metric = self::metric($context);

        // Mettre à jour le timestamp du dernier événement
        $metric->set('last_event_timestamp', (int)$eventdata->timestamp['unix']);
        $metric->set('timemodified', time());

        // Dispatcher vers le handler spécifique selon l'action
        $timestamp = (int)$eventdata->timestamp['unix'];
        self::dispatch_handler($eventdata, $context, $timestamp);

        // Si extensions_detected, traiter séparément
        if ($eventdata->action === 'extensions_detected') {
            self::save_extensions($eventdata, $context);
        }
    }

    /**
     * Dispatches the event to the corresponding handler method.
     *
     * The handler method name is dynamically generated based on the action.
     *
     * @param \stdClass $event_data The event data.
     * @param array $context Context information.
     * @param int $timestamp The event timestamp (milliseconds).
     * @return void
     */
    private static function dispatch_handler(\stdClass $event_data, array $context, int $timestamp): void {
        $action = $event_data->action;
        $method = 'handle_' . str_replace(['-', ' '], '_', $action) . '_event';

        if (method_exists(self::class, $method)) {
            self::$method($event_data, $context, $timestamp);
        }
    }

    /**
     * Persists the raw event into the database.
     *
     * Creates a new event persistent record and stores the event payload.
     *
     * @param \stdClass $event_data The event data.
     * @param array $context Context information.
     * @param int $timestamp The event timestamp (milliseconds).
     * @return void
     * @throws coding_exception If validation fails.
     */
    private static function save_raw_event(\stdClass $event_data, array $context, int $timestamp): void {
        $record = new event();
        $record->set('attemptid', (int)$context['attemptid']);
        $record->set('userid', (int)$context['userid']);
        $record->set('quizid', (int)$context['quizid']);
        $record->set('slot', isset($context['slot']) ? (int)$context['slot'] : null);
        $record->set('session_id', $context['session_id']);
        $record->set('timestamp', $timestamp);
        $record->set('action', $event_data->action);
        $record->set('timecreated', time());

        if (!empty($event_data->data)) {
            $record->set('data_json', json_encode($event_data->data));
        }

        // Debug : afficher les erreurs de validation
        if (!$record->is_valid()) {
            $errors = $record->get_errors();
            error_log('EVENT VALIDATION ERRORS: ' . json_encode($errors));
            throw new \coding_exception('Event validation failed: ' . json_encode($errors));
        }

        $record->create();
    }

    /**
     * Handles a copy event.
     *
     * Increments the copy counter in the metric record.
     *
     * @param \stdClass $event The event data.
     * @param array $ctx Context information.
     * @param int $ts The event timestamp.
     * @return void
     */
    private static function handle_copy_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);
        $metric->set('copy_count', $metric->get('copy_count') + 1);
        $metric->set('timemodified', time());
        $metric->save();
    }
    /**
     * Handles a focus loss event.
     *
     * Updates focus metrics and switches the current state to unfocused.
     *
     * @param \stdClass $event The event data.
     * @param array $ctx Context information.
     * @param int $ts The event timestamp.
     * @return void
     */
    private static function handle_focus_loss_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);
        $metric->set('focus_loss_count', $metric->get('focus_loss_count') + 1);

        self::close_time_window($metric, $ts, 'focused');

        $metric->set('current_state', 'unfocused');
        $metric->set('last_event_timestamp', $ts);
        $metric->set('timemodified', time());
        $metric->save();
    }
    /**
     * Handles a focus gain event.
     *
     * Updates focus metrics and switches the current state to focused.
     *
     * @param \stdClass $event The event data.
     * @param array $ctx Context information.
     * @param int $ts The event timestamp.
     * @return void
     */
    private static function handle_focus_gain_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);

        self::close_time_window($metric, $ts, 'unfocused');

        $metric->set('current_state', 'focused');
        $metric->set('last_event_timestamp', $ts);
        $metric->set('timemodified', time());
        $metric->save();
    }
    /**
     * Handles a page load event.
     *
     * Initializes the metric state as focused.
     *
     * @param \stdClass $event The event data.
     * @param array $ctx Context information.
     * @param int $ts The event timestamp.
     * @return void
     */
    private static function handle_page_load_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);
        $metric->set('current_state', 'focused');
        $metric->set('last_event_timestamp', $ts);
        $metric->save();
    }
    /**
     * Handles a page unload event.
     *
     * Closes the current time window based on the current state.
     *
     * @param \stdClass $event The event data.
     * @param array $ctx Context information.
     * @param int $ts The event timestamp.
     * @return void
     */
    private static function handle_page_unload_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);
        self::close_time_window($metric, $ts, $metric->get('current_state'));
        $metric->save();
    }
    /**
     * Handles an extensions detected event.
     *
     * Updates extension metrics and stores detected browser extensions
     * if they are not already recorded.
     *
     * @param \stdClass $event The event data.
     * @param array $ctx Context information.
     * @param int $ts The event timestamp.
     * @return void
     */
    private static function handle_extensions_detected_event(\stdClass $event, array $ctx, int $ts): void {
        if (empty($event->data) || !is_array($event->data)) {
            return;
        }

        $metric = self::metric($ctx);
        $metric->set('extension_count', $metric->get('extension_count') + count($event->data));
        $metric->save();

        foreach ($event->data as $ext) {
            if (empty($ext->uid)) {
                continue;
            }

            try {
                extension::get_record([
                    'attemptid' => $ctx['attemptid'],
                    'extension_uid' => $ext->uid,
                ]);
                continue;
            } catch (\Exception $e) {}

            $rec = new extension();
            $rec->set('attemptid', $ctx['attemptid']);
            $rec->set('userid', $ctx['userid']);
            $rec->set('quizid', $ctx['quizid']);
            $rec->set('slot', isset($ctx['slot']) ? (int)$ctx['slot'] : null);
            $rec->set('extension_uid', $ext->uid);
            $rec->set('extension_key', $ext->extensionKey ?? 'unknown');
            $rec->set('extension_name', $ext->name ?? 'Unknown');
            $rec->set('detection_data', json_encode($ext));
            $rec->create();
        }
    }

    /**
     * Retrieves or creates a metric record for the given context.
     *
     * If a metric record exists, it is returned.
     * Otherwise, a new one is created and persisted.
     *
     * @param array $context Context information.
     * @return metric The metric persistent instance.
     */
    public static function metric(array $context): metric {
        global $DB;

        // Chercher l'entrée existante
        $existing = metric::get_record([
            'attemptid' => $context['attemptid'],
            'userid'    => $context['userid'],
            'quizid'    => $context['quizid'],
            'slot'      => $context['slot']
        ]);

        if ($existing instanceof metric) {
            return $existing;
        }

        // Si rien n'existe, créer un nouveau metric au lieu de retourner false
        $new = new metric();
        $new->set('attemptid', $context['attemptid']);
        $new->set('userid', $context['userid']);
        $new->set('quizid', $context['quizid']);
        $new->set('slot', $context['slot']);
        $new->set('timecreated', time());
        $new->set('timemodified', time());
        $new->create(); // insérer dans la BDD immédiatement si besoin

        return $new;
    }
    /**
     * Closes the current time window and updates time counters.
     *
     * Computes the duration between the last event timestamp and the
     * current timestamp, then updates focused or unfocused time.
     *
     * @param metric $metric The metric instance.
     * @param int $ts The current timestamp (milliseconds).
     * @param string $expectedState The expected current state.
     * @return void
     */
    private static function close_time_window(metric $metric, int $ts, string $expectedState): void {
        $last = $metric->get('last_event_timestamp');
        if (!$last || $metric->get('current_state') !== $expectedState) {
            return;
        }

        $delta = (int)round(($ts / 1000) - ($last / 1000));
        if ($delta <= 0 || $delta > 3600) {
            return;
        }

        if ($expectedState === 'focused') {
            $metric->set('time_focused', $metric->get('time_focused') + $delta);
        } else {
            $metric->set('time_unfocused', $metric->get('time_unfocused') + $delta);
        }

        $metric->set('time_total', $metric->get('time_total') + $delta);
    }
    /**
     * Converts a JavaScript timestamp (milliseconds) to seconds.
     *
     * @param int|float $jsTimestamp The JavaScript timestamp.
     * @return int The converted timestamp in seconds.
     */
    private static function to_seconds($jsTimestamp): int {
        return (int) ($jsTimestamp / self::TIMESTAMP_CONVERSION_FACTOR);
    }
}
