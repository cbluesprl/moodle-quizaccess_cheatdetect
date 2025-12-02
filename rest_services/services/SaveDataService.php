<?php

namespace quizaccess_cheatdetect\rest_services\services;

use coding_exception;
use core\invalid_persistent_exception;
use dml_transaction_exception;
use local_rest\Routes;
use quizaccess_cheatdetect\persistent\event;
use quizaccess_cheatdetect\persistent\metric;
use quizaccess_cheatdetect\persistent\extension;
use stdClass;

defined('MOODLE_INTERNAL') || die();

class SaveDataService extends Routes
{
    const TIMESTAMP_CONVERSION_FACTOR = 1000;

    /**
     * @param stdClass|null $payload
     * @param stdClass|null $route_params
     * @param stdClass|null $get_params
     * @return stdClass
     * @throws dml_transaction_exception
     */
    public static function save_data(?stdClass $payload, ?stdclass $route_params, ?stdclass $get_params): stdClass
    {
        global $DB;
        $response = new stdClass();
        $response->success = false;

        try {
            if (empty($payload)) {
                throw new \Exception('No data provided');
            }

            $session_id = $payload->session_id ?? null;
            $attemptid = $payload->attemptid ?? null;
            $userid = $payload->userid ?? null;
            $quizid = $payload->quizid ?? null;
            $slot = ($payload->slot === false) ? null : ($payload->slot ?? null); // parfois slot est false, ça fait bugguer la suite
            $events = $payload->events ?? [];

            if (empty($session_id) || empty($attemptid) || empty($userid) || empty($quizid)) {
                throw new \Exception('Missing required fields');
            }

            if (empty($events) || !is_array($events)) {
                throw new \Exception('No events to process');
            }

            $context = [
                'session_id' => $session_id,
                'attemptid' => $attemptid,
                'userid' => $userid,
                'quizid' => $quizid,
                'slot' => $slot,
            ];

            $transaction = $DB->start_delegated_transaction();

            foreach ($events as $event_data) {
                self::process_event($event_data, $context);
            }

            $transaction->allow_commit();

            $response->success = true;
            $response->processed = count($events);

        } catch (\Throwable $e) {
            if (isset($transaction) && !$transaction->is_disposed()) {
                $transaction->rollback($e);
            }
            $response->error = $e->getMessage();
        }

        return $response;
    }

    /**
     * @param $event_data
     * @param array $context
     * @return void
     * @throws coding_exception
     * @throws invalid_persistent_exception
     */
    private static function process_event($event_data, array $context): void
    {
        if (empty($event_data) || !is_object($event_data)) {
            return;
        }

        $action = $event_data->action ?? null;
        $timestamp = $event_data->timestamp->unix ?? null;

        if (empty($action) || empty($timestamp)) {
            return;
        }
        $timestamp_seconds = self::convert_timestamp_to_seconds($timestamp);

        self::save_raw_event($event_data, $context, $timestamp_seconds);

        self::update_metrics_for_event($event_data, $context, $timestamp_seconds);

        if ($action === 'extensions_detected') {
            self::save_extensions($event_data, $context);
        }
    }

    /**
     * @throws coding_exception
     * @throws invalid_persistent_exception
     */
    private static function save_raw_event($event_data, array $context, int $timestamp_seconds): void
    {
        $event_record = new event();
        $event_record->set('attemptid', $context['attemptid']);
        $event_record->set('userid', $context['userid']);
        $event_record->set('quizid', $context['quizid']);
        $event_record->set('slot', $context['slot']);
        $event_record->set('session_id', $context['session_id']);
        $event_record->set('timestamp', $timestamp_seconds);
        $event_record->set('action', $event_data->action);

        if (!empty($event_data->data)) {
            $event_record->set('data_json', json_encode($event_data->data));
        }
        $event_record->create();
    }

    /**
     * @param $event_data
     * @param array $context
     * @param int $timestamp_seconds
     * @return void
     */
    private static function update_metrics_for_event($event_data, array $context, int $timestamp_seconds): void
    {
        $action = $event_data->action;

        $handler_method = 'handle_' . str_replace(['-', ' '], '_', $action) . '_event';

        if (method_exists(self::class, $handler_method)) {
            self::$handler_method($event_data, $context, $timestamp_seconds);
        }
    }

    /**
     * @param $event_data
     * @param array $context
     * @param int $timestamp_seconds
     * @return void
     * @throws coding_exception|invalid_persistent_exception
     */
    private static function handle_copy_event($event_data, array $context, int $timestamp_seconds): void
    {
        $metric = self::get_or_create_metric($context['attemptid'], $context['userid'], $context['quizid'], $context['slot']);

        $metric->set('copy_count', $metric->get('copy_count') + 1);
        $metric->set('timemodified', time());

        $metric->save();
     }

    /**
     * @param $event_data
     * @param array $context
     * @param int $timestamp_seconds
     * @return void
     * @throws coding_exception|invalid_persistent_exception
     */
    private static function handle_page_background_event($event_data, array $context, int $timestamp_seconds): void
    {
        $metric = self::get_or_create_metric($context['attemptid'], $context['userid'], $context['quizid'], $context['slot']);

        $metric->set('focus_loss_count', $metric->get('focus_loss_count') + 1);

        if ($metric->get('last_event_timestamp') && $metric->get('current_state') === 'focused') {
            $time_delta = $timestamp_seconds - $metric->get('last_event_timestamp');
            if ($time_delta > 0 && $time_delta < 3600) {
                $metric->set('time_focused', $metric->get('time_focused') + $time_delta);
                $metric->set('time_total', $metric->get('time_total') + $time_delta);
            }
        }

        $metric->set('current_state', 'unfocused');
        $metric->set('last_event_timestamp', $timestamp_seconds);
        $metric->set('timemodified', time());

        $metric->save();
    }

    /**
     * @param $event_data
     * @param array $context
     * @param int $timestamp_seconds
     * @return void
     * @throws coding_exception|invalid_persistent_exception
     */
    private static function handle_page_foreground_event($event_data, array $context, int $timestamp_seconds): void
    {
        $metric = self::get_or_create_metric($context['attemptid'], $context['userid'], $context['quizid'], $context['slot']);

        if ($metric->get('last_event_timestamp') && $metric->get('current_state') === 'unfocused') {
            $time_delta = $timestamp_seconds - $metric->get('last_event_timestamp');
            if ($time_delta > 0 && $time_delta < 3600) {
                $metric->set('time_unfocused', $metric->get('time_unfocused') + $time_delta);
                $metric->set('time_total', $metric->get('time_total') + $time_delta);
            }
        }

        $metric->set('current_state', 'focused');
        $metric->set('last_event_timestamp', $timestamp_seconds);
        $metric->set('timemodified', time());

        $metric->save();
    }

    /**
     * @param $event_data
     * @param array $context
     * @param int $timestamp_seconds
     * @return void
     * @throws coding_exception|invalid_persistent_exception
     */
    private static function handle_page_load_event($event_data, array $context, int $timestamp_seconds): void
    {
        $metric = self::get_or_create_metric($context['attemptid'], $context['userid'], $context['quizid'], $context['slot']);

        $metric->set('current_state', 'focused');
        $metric->set('last_event_timestamp', $timestamp_seconds);
        $metric->set('timemodified', time());

        $metric->save();
    }

    /**
     * @param $event_data
     * @param array $context
     * @param int $timestamp_seconds
     * @return void
     * @throws coding_exception|invalid_persistent_exception
     */
    private static function handle_page_unload_event($event_data, array $context, int $timestamp_seconds): void
    {
        $metric = self::get_or_create_metric($context['attemptid'], $context['userid'], $context['quizid'], $context['slot']);

        if ($metric->get('last_event_timestamp')) {
            $time_delta = $timestamp_seconds - $metric->get('last_event_timestamp');
            if ($time_delta > 0 && $time_delta < 3600) {
                if ($metric->get('current_state') === 'focused') {
                    $metric->set('time_focused', $metric->get('time_focused') + $time_delta);
                } else {
                    $metric->set('time_unfocused', $metric->get('time_unfocused') + $time_delta);
                }
                $metric->set('time_total', $metric->get('time_total') + $time_delta);
            }
        }

        $metric->set('last_event_timestamp', $timestamp_seconds);
        $metric->set('timemodified', time());

        $metric->save();
    }

    /**
     * @param $event_data
     * @param array $context
     * @param int $timestamp_seconds
     * @return void
     * @throws coding_exception|invalid_persistent_exception
     */
    private static function handle_extensions_detected_event($event_data, array $context, int $timestamp_seconds): void
    {
        if (empty($event_data->data) || !is_array($event_data->data)) {
            return;
        }

        $extension_count = count($event_data->data);

        $metric = self::get_or_create_metric($context['attemptid'], $context['userid'], $context['quizid'], $context['slot']);
        $metric->set('extension_count', $metric->get('extension_count') + $extension_count);
        $metric->set('timemodified', time());
        $metric->save();
    }

    /**
     * @param $event_data
     * @param array $context
     * @return void
     * @throws coding_exception
     */
    private static function save_extensions($event_data, array $context): void
    {
        if (empty($event_data->data) || !is_array($event_data->data)) {
            return;
        }

        foreach ($event_data->data as $ext_data) {
            if (empty($ext_data->uid) || empty($ext_data->extensionKey)) {
                continue;
            }

            try {
                $existing = extension::get_record([
                    'attemptid' => $context['attemptid'],
                    'extension_uid' => $ext_data->uid,
                ]);

                if ($existing) {
                    continue;
                }
            } catch (\Exception $e) {
            }

            $extension_record = new extension();
            $extension_record->set('attemptid', $context['attemptid']);
            $extension_record->set('userid', $context['userid']);
            $extension_record->set('quizid', $context['quizid']);
            $extension_record->set('slot', $context['slot']);
            $extension_record->set('extension_key', $ext_data->extensionKey ?? 'unknown');
            $extension_record->set('extension_name', $ext_data->name ?? 'Unknown Extension');
            $extension_record->set('extension_uid', $ext_data->uid);

            if (!empty($ext_data)) {
                $extension_record->set('detection_data', json_encode($ext_data));
            }

            try {
                $extension_record->create();
            } catch (\Exception $e) {
            }
        }
    }

    /**
     * @param int $attemptid
     * @param int $userid
     * @param int $quizid
     * @param int|null $slot
     * @return metric
     * @throws coding_exception
     * @throws invalid_persistent_exception
     */
    private static function get_or_create_metric(int $attemptid, int $userid, int $quizid, ?int $slot): metric
    {
        $params = [
            'attemptid' => $attemptid,
            'slot' => $slot,
        ];

        try {
            $existing = metric::get_record($params);
            if ($existing) {
                return $existing;
            }
        } catch (\Exception $e) {
        }

        $metric = new metric();
        $metric->set('attemptid', $attemptid);
        $metric->set('userid', $userid);
        $metric->set('quizid', $quizid);
        $metric->set('slot', $slot);
        $metric->create();

        return $metric;
    }

    /**
     * @param $timestamp JS timestamp
     * @return int
     */
    private static function convert_timestamp_to_seconds($timestamp): int
    {
        return (int) ($timestamp / self::TIMESTAMP_CONVERSION_FACTOR);
    }
}
