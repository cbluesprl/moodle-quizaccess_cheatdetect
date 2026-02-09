<?php

namespace quizaccess_cheatdetect\service;

defined('MOODLE_INTERNAL') || die();

use coding_exception;
use quizaccess_cheatdetect\persistent\event;
use quizaccess_cheatdetect\persistent\metric;
use quizaccess_cheatdetect\persistent\extension;

class event_handler {

    const TIMESTAMP_CONVERSION_FACTOR = 1000;

    /**
     * Point d’entrée unique
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

    /* ============================================================
     * Dispatcher
     * ============================================================
     */

    private static function dispatch_handler(\stdClass $event_data, array $context, int $timestamp): void {
        $action = $event_data->action;
        $method = 'handle_' . str_replace(['-', ' '], '_', $action) . '_event';

        if (method_exists(self::class, $method)) {
            self::$method($event_data, $context, $timestamp);
        }
    }

    /* ============================================================
     * Raw event persistence
     * ============================================================
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

    /* ============================================================
     * HANDLERS
     * ============================================================
     */

    private static function handle_copy_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);
        $metric->set('copy_count', $metric->get('copy_count') + 1);
        $metric->set('timemodified', time());
        $metric->save();
    }

    private static function handle_focus_loss_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);
        $metric->set('focus_loss_count', $metric->get('focus_loss_count') + 1);

        self::close_time_window($metric, $ts, 'focused');

        $metric->set('current_state', 'unfocused');
        $metric->set('last_event_timestamp', $ts);
        $metric->set('timemodified', time());
        $metric->save();
    }

    private static function handle_focus_gain_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);

        self::close_time_window($metric, $ts, 'unfocused');

        $metric->set('current_state', 'focused');
        $metric->set('last_event_timestamp', $ts);
        $metric->set('timemodified', time());
        $metric->save();
    }

    private static function handle_page_load_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);
        $metric->set('current_state', 'focused');
        $metric->set('last_event_timestamp', $ts);
        $metric->save();
    }

    private static function handle_page_unload_event(\stdClass $event, array $ctx, int $ts): void {
        $metric = self::metric($ctx);
        self::close_time_window($metric, $ts, $metric->get('current_state'));
        $metric->save();
    }

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

    /* ============================================================
     * Helpers
     * ============================================================
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

    private static function to_seconds($jsTimestamp): int {
        return (int) ($jsTimestamp / self::TIMESTAMP_CONVERSION_FACTOR);
    }
}
