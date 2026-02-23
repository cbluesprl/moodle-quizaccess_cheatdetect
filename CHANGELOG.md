Changelog
All notable changes to the Quiz Access Cheat Detection plugin will be documented in this file.
The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.
[Unreleased]
Added

Initial release of the cheat detection plugin
Automatic activation for quizzes with "one question per page" layout
JavaScript-based behavior monitoring during quiz attempts
Event tracking system for:

Focus loss (tab/window switching)
Copy/paste actions
Browser extension detection
Page visibility changes


Real-time event storage in database
Persistent classes for data management:

event - Raw event records
metric - Aggregated metrics
extension - Detected browser extensions


Dynamic layout warning in quiz settings form
Teacher reporting interface (planned)

Changed

N/A (initial release)

Deprecated

N/A (initial release)

Removed

N/A (initial release)

Fixed

N/A (initial release)

Security

N/A (initial release)


[2.0.0] - 2026-02-04
Added

Complete rewrite of the cheat detection system
New database schema with three tables:

quizaccess_cheatdetect_events - Raw event audit trail
quizaccess_cheatdetect_metrics - Aggregated metrics per slot/attempt
quizaccess_cheatdetect_extensions - Browser extension detections


Automatic activation based on quiz layout (no manual toggle required)
Enhanced JavaScript tracking module with:

Session-based event grouping
Per-question (slot) tracking
Millisecond-precision timestamps
Comprehensive data collection


Informational UI elements in quiz settings:

Blue info box explaining automatic activation
Yellow warning for incompatible layouts
Dynamic JavaScript layout checker


Complete PHPDoc documentation for all classes and methods
Utility methods in event persistent:

get_events_by_attempt()
get_events_by_action()
get_event_counts_by_action()
delete_events_by_attempt()
delete_events_by_quiz()
get_data() / set_data() for JSON handling


Validation error messages for all persistent properties
Hook before_create() for automatic timestamp setting

Changed

Plugin now activates automatically when questionsperpage = 1
Removed manual activation checkbox from quiz settings
Improved database schema for better performance and scalability
Updated version to 2026020400
Changed timecreated default from time() to 0 with hook handling

Removed

Settings table (no longer needed with automatic activation)
Manual activation toggle in quiz form
Unnecessary configuration options

Fixed

Issue with time() being evaluated at class load instead of record creation
Missing PHPDoc tags throughout codebase
Inconsistent type hints in method signatures

Security

Added input validation messages for all persistent properties
Implemented proper JSON encoding/decoding with error handling
Protected against invalid data in event records


[1.0.0] - 2025-10-30
Added

Initial proof-of-concept release
Basic event tracking functionality
Simple database storage
Preliminary JavaScript monitoring

Known Issues

Limited to basic tracking
Manual activation required
Minimal documentation
Performance issues with large datasets


Version History
Version Numbering Scheme

Major version (X.0.0): Breaking changes or significant architectural updates
Minor version (0.X.0): New features, backwards-compatible
Patch version (0.0.X): Bug fixes, documentation updates

Moodle Compatibility

v2.0.0+: Moodle 4.0+ (with compatibility for Moodle 3.11+ via class aliases)
v1.0.0: Moodle 3.9+


Upgrade Notes
From 1.x to 2.0
Database Changes:

Old tables quizaccess_cheatdetect_sess and quizaccess_cheatdetect_data are dropped
New tables quizaccess_cheatdetect_events, quizaccess_cheatdetect_metrics, and quizaccess_cheatdetect_extensions are created
Migration is handled automatically by db/upgrade.php

Behavioral Changes:

Plugin now activates automatically for compatible quizzes
No action required from teachers (was previously manual checkbox)
Only works with "one question per page" layout

Configuration Changes:

No settings to configure in quiz form
Plugin behavior is now determined solely by quiz layout

Steps to Upgrade:

Backup your database
Upload new plugin files
Visit Site Administration > Notifications
Follow the upgrade process
Review existing quizzes (plugin will auto-activate where applicable)


Roadmap

Nothing planned

Under Consideration

Real-time alerts for teachers
Student-facing behavior summary
Integration with plagiarism detection tools
Support for other quiz layouts (with limitations)
Customizable monitored actions


Contributing
See CONTRIBUTING.md for details on how to contribute to this project.

Support

Issue Tracker: GitHub Issues
Documentation: Wiki
Email: support@cblue.be


License
This plugin is licensed under the GNU GPL v3 or later.
See LICENSE for the full license text.

Credits
Developed by: CBlue SRL
Authors: gnormand@cblue.be, abrichard@cblue.be
Copyright: © 2026 CBlue SRL
Special thanks to the Moodle community for their support and feedback.