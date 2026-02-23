Contributing to Quiz Access Cheat Detection
Thank you for your interest in contributing to the Quiz Access Cheat Detection plugin! This document provides guidelines and instructions for contributing.

Table of Contents

Code of Conduct
Getting Started
Development Setup
Coding Standards
Making Changes
Testing
Submitting Changes
Reporting Bugs
Feature Requests
Documentation


Code of Conduct
This project adheres to the Moodle Community Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to support@cblue.be.
Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:

Age
Body size
Disability
Ethnicity
Gender identity and expression
Level of experience
Nationality
Personal appearance
Race
Religion
Sexual identity and orientation


Getting Started
Prerequisites
Before contributing, ensure you have:

Moodle Development Environment

Moodle 4.0+ installed locally
PHP 7.4 or higher
MySQL 5.7+ or PostgreSQL 10+
Web server (Apache/Nginx)


Development Tools

Git
Composer (for dependencies)
Node.js and npm (for JavaScript)
Text editor or IDE (PHPStorm, VS Code recommended)


Knowledge

PHP programming
Moodle plugin development basics
JavaScript (ES6+)
SQL and database concepts
Git version control



Useful Resources

Moodle Developer Documentation
Moodle Coding Style
Moodle Plugin Development


Development Setup
1. Fork and Clone
   bash# Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/moodle-quizaccess_cheatdetect.git
   cd moodle-quizaccess_cheatdetect

# Add upstream remote
git remote add upstream https://github.com/cblue-srl/moodle-quizaccess_cheatdetect.git
2. Install in Moodle
   bash# Symlink or copy to your Moodle installation
   cd /path/to/moodle
   ln -s /path/to/moodle-quizaccess_cheatdetect mod/quiz/accessrule/cheatdetect

# Or copy
cp -r /path/to/moodle-quizaccess_cheatdetect mod/quiz/accessrule/cheatdetect
3. Install Dependencies (if any)
   bash# Install PHP dependencies
   composer install

# Install JavaScript dependencies
npm install
4. Run Moodle Upgrade
   Visit your Moodle site and navigate to:

Site Administration > Notifications
Follow the upgrade process to install the plugin


Coding Standards
PHP Code
We follow the Moodle Coding Style.
Key Points:

Indentation: 4 spaces (no tabs)
Line length: Maximum 132 characters (soft limit 80)
Braces: Opening brace on same line
Naming: lowercase_with_underscores for functions, CamelCase for classes
PHPDoc required for all classes, methods, and functions

Example:
php/**
* Short description.
*
* Long description if needed.
*
* @param int $userid The user ID.
* @param string $action The action type.
* @return bool True on success.
* @since 2.0.0
  */
  public function process_event(int $userid, string $action): bool {
  // Implementation
  return true;
  }
  JavaScript Code
  We follow modern JavaScript best practices (ES6+).
  Key Points:

Use const and let, avoid var
Arrow functions where appropriate
Async/await for asynchronous code
JSDoc comments for public functions
AMD module format for Moodle compatibility

Example:
javascript/**
* Track user action.
*
* @param {string} action The action type
* @param {Object} data Additional data
* @returns {Promise<void>}
  */
  const trackAction = async (action, data) => {
  // Implementation
  };
  Database Code
  Key Points:

Use Moodle's XMLDB for schema definitions
Always use prepared statements (no raw SQL with user input)
Use placeholders (:name) not ? style
Follow Moodle table naming conventions

Example:
php$sql = "SELECT *
FROM {quizaccess_cheatdetect_events}
WHERE attemptid = :attemptid
AND action = :action
ORDER BY timestamp ASC";

$params = [
'attemptid' => $attemptid,
'action' => $action,
];

$events = $DB->get_records_sql($sql, $params);
File Organization
quizaccess_cheatdetect/
├── classes/
│   ├── persistent/          # Persistent classes
│   ├── external/            # Web service definitions
│   └── privacy/             # Privacy API implementation
├── db/
│   ├── install.xml          # Database schema
│   ├── upgrade.php          # Upgrade logic
│   └── services.php         # External functions
├── lang/
│   └── en/
│       └── quizaccess_cheatdetect.php
├── amd/
│   └── src/                 # JavaScript modules
├── tests/
│   ├── phpunit/             # PHPUnit tests
│   └── behat/               # Behat tests
├── rule.php                 # Main access rule class
└── version.php              # Plugin version

Making Changes
Branching Strategy
We use Git Flow:

main - Stable releases only
develop - Integration branch for features
feature/* - New features
bugfix/* - Bug fixes
hotfix/* - Urgent fixes for production

Creating a Feature Branch
bash# Update your local repository
git checkout develop
git pull upstream develop

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes...
git add .
git commit -m "Add: Brief description of changes"
Commit Message Guidelines
Follow the Conventional Commits specification:
<type>: <description>

[optional body]

[optional footer]
Types:

feat: New feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting, etc.)
refactor: Code refactoring
test: Adding or updating tests
chore: Maintenance tasks

Examples:
bashgit commit -m "feat: Add event count aggregation method"
git commit -m "fix: Correct timestamp calculation in event tracking"
git commit -m "docs: Update CHANGELOG for v2.1.0 release"

Testing
PHPUnit Tests
All new code should include PHPUnit tests.
Running Tests:
bash# Initialize PHPUnit
php admin/tool/phpunit/cli/init.php

# Run plugin tests
vendor/bin/phpunit --filter quizaccess_cheatdetect

# Run specific test
vendor/bin/phpunit mod/quiz/accessrule/cheatdetect/tests/event_test.php
Writing Tests:
phpnamespace quizaccess_cheatdetect;

/**
* Test event persistent.
*
* @package    quizaccess_cheatdetect
* @covers     \quizaccess_cheatdetect\persistent\event
  */
  class event_test extends \advanced_testcase {

  public function test_create_event() {
  $this->resetAfterTest();

       $event = new \quizaccess_cheatdetect\persistent\event();
       $event->set('attemptid', 123);
       // ... set other properties
       $event->create();
       
       $this->assertTrue($event->get('id') > 0);
  }
  }
  Behat Tests
  Write Behat tests for user-facing features.
  Running Behat:
  bash# Initialize Behat
  php admin/tool/behat/cli/init.php

# Run plugin scenarios
vendor/bin/behat --tags @quizaccess_cheatdetect
Writing Scenarios:
gherkin@quizaccess_cheatdetect
Feature: Cheat detection activation
In order to monitor quiz behavior
As a teacher
I need the plugin to activate automatically for compatible quizzes

Scenario: Plugin activates for one question per page layout
Given I log in as "admin"
And I create a quiz with "one question per page" layout
When a student attempts the quiz
Then cheat detection should be active
Manual Testing Checklist
Before submitting:

Test on Moodle 4.0+
Test with different quiz layouts
Test event tracking in browser
Verify database records are created
Check for JavaScript errors in console
Test with different browsers (Chrome, Firefox, Safari)
Verify no PHP warnings/errors in debug mode


Submitting Changes
Pull Request Process

Update Documentation

Update CHANGELOG.md
Update README.md if needed
Add/update PHPDoc comments


Ensure Tests Pass

bash   vendor/bin/phpunit --filter quizaccess_cheatdetect

Run Code Checks

bash   # Moodle Code Checker
php /path/to/moodle-local_codechecker/run.php /path/to/cheatdetect

# PHPStan (if configured)
vendor/bin/phpstan analyse

Push to Your Fork

bash   git push origin feature/your-feature-name

Create Pull Request

Go to GitHub and create a PR from your branch to develop
Fill out the PR template
Link related issues



Pull Request Template
markdown## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regressions found

## Checklist
- [ ] Code follows Moodle coding standards
- [ ] PHPDoc comments added/updated
- [ ] CHANGELOG.md updated
- [ ] Tests pass locally
- [ ] No merge conflicts

## Related Issues
Fixes #123

Reporting Bugs
Before Reporting

Check existing issues
Verify bug exists in latest version
Enable Moodle debugging to get error details

Bug Report Template
markdown## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Moodle Version: 4.x
- Plugin Version: 2.0.0
- PHP Version: 8.1
- Database: MySQL 8.0
- Browser: Chrome 120

## Error Messages
Error text from logs

## Screenshots
If applicable

Feature Requests
We welcome feature requests! Please:

Check if feature already exists or is planned
Describe the use case clearly
Explain expected behavior
Consider implementation complexity

Feature Request Template
markdown## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches you've thought of

## Additional Context
Screenshots, examples, etc.

Documentation
Where to Document

Code Comments: PHPDoc, inline comments
README.md: Installation, basic usage
Wiki: Detailed guides, tutorials
CHANGELOG.md: All changes
Language Strings: User-facing text

Documentation Standards

Write in clear, simple English
Include examples where helpful
Keep up-to-date with code changes
Use Markdown for formatting

Language Strings
All user-facing text must be in language files:
php// Good
$mform->addElement('static', 'info', '',
get_string('cheatdetectinfo', 'quizaccess_cheatdetect'));

// Bad
$mform->addElement('static', 'info', '',
'Cheat detection is enabled');

Getting Help
Communication Channels

GitHub Issues: Bug reports, feature requests
Email: support@cblue.be
Moodle Forums: General Moodle questions

Response Times

Bug reports: 2-3 business days
Feature requests: 1 week
Pull requests: 1 week for initial review


Recognition
Contributors will be:

Listed in CHANGELOG.md
Credited in release notes
Mentioned in documentation (if desired)

Thank you for contributing to making Moodle quizzes more secure! 🎉

Last Updated: February 2026
Maintainers: CBlue SRL (gnormand@cblue.be, abrichard@cblue.be)