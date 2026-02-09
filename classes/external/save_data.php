<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

namespace quizaccess_cheatdetect\external;

defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/externallib.php');

use external_api;
use external_function_parameters;
use external_single_structure;
use external_multiple_structure;
use external_value;
use dml_transaction_exception;
use quizaccess_cheatdetect\persistent\event;
use quizaccess_cheatdetect\persistent\metric;
use quizaccess_cheatdetect\persistent\extension;
use quizaccess_cheatdetect\service\event_handler;
use stdClass;
use coding_exception;

/**
 * External function to save cheat detection tracking data.
 */
class save_data extends external_api {

    private const TIMESTAMP_CONVERSION_FACTOR = 1000;

    /**
     * Define parameters.
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'session_id' => new external_value(PARAM_TEXT, 'Session identifier'),
            'attemptid'  => new external_value(PARAM_INT, 'Quiz attempt id'),
            'userid'     => new external_value(PARAM_INT, 'User id'),
            'quizid'     => new external_value(PARAM_INT, 'Quiz id'),
            'slot'       => new external_value(PARAM_INT, 'Question slot', VALUE_OPTIONAL),
            'events'     => new external_multiple_structure(
                new external_single_structure([
                    'action' => new external_value(PARAM_TEXT, 'Event action'),
                    'timestamp' => new external_single_structure([
                        'unix' => new external_value(PARAM_INT, 'JS timestamp in ms'),
                        'timezone' => new external_value(PARAM_TEXT, 'Client timezone', VALUE_OPTIONAL),
                    ]),
                    'data' => new external_value(PARAM_RAW, 'Event data (JSON)', VALUE_OPTIONAL),
                ])
            ),
        ]);
    }

    /**
     * Execute the external function.
     */
    public static function execute(
        string $session_id,
        int $attemptid,
        int $userid,
        int $quizid,
        ?int $slot,
        array $events
    ): array {
        global $DB;

        self::validate_parameters(self::execute_parameters(), [
            'session_id' => $session_id,
            'attemptid' => $attemptid,
            'userid' => $userid,
            'quizid' => $quizid,
            'slot' => $slot,
            'events' => $events,
        ]);

        $context = \context_system::instance();
        self::validate_context($context);
        require_login();

        $transaction = $DB->start_delegated_transaction();

        try {
            foreach ($events as $eventdata) {
                self::process_event((object) $eventdata, [
                    'session_id' => $session_id,
                    'attemptid' => $attemptid,
                    'userid' => $userid,
                    'quizid' => $quizid,
                    'slot' => $slot,
                ]);
            }

            $transaction->allow_commit();

            // Ne jamais renvoyer les événements bruts à Moodle
            return [
                'success' => true,
                'processed' => count($events),
            ];

        } catch (\Throwable $e) {
            if (!$transaction->is_disposed()) {
                $transaction->rollback($e);
            }

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Define return structure.
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Operation success'),
            'processed' => new external_value(PARAM_INT, 'Number of events processed', VALUE_OPTIONAL),
            'error' => new external_value(PARAM_TEXT, 'Error message', VALUE_OPTIONAL),
        ]);
    }

    /* =======================
     * === Internal logic ===
     * ======================= */

    private static function process_event(\stdClass $eventdata, array $context): void {
        if (empty($eventdata->action) || empty($eventdata->timestamp['unix'])) {
            return;
        }

        // Délégation à event_handler
        event_handler::process_event((object)$eventdata, $context);

        // Gestion spécifique des extensions détectées
        if ($eventdata->action === 'extensions_detected') {
            self::save_extensions($eventdata, $context);
        }
    }

    private static function convert_timestamp_to_seconds(int $timestamp): int {
        return (int) ($timestamp / self::TIMESTAMP_CONVERSION_FACTOR);
    }

    private static function save_extensions(\stdClass $eventdata, array $context): void {
        if (empty($eventdata->data)) {
            return;
        }

        $extensions = is_string($eventdata->data) ? json_decode($eventdata->data, true) : $eventdata->data;

        if (!is_array($extensions)) {
            return;
        }

        foreach ($extensions as $ext) {
            $record = new extension();
            $record->set('attemptid', $context['attemptid']);
            $record->set('userid', $context['userid']);
            $record->set('quizid', $context['quizid']);
            $record->set('slot', $context['slot']);
            $record->set('session_id', $context['session_id']);
            $record->set('extension_key', $ext['extensionKey'] ?? '');
            $record->set('element_uid', $ext['uid'] ?? null);
            $record->create();
        }
    }
}
