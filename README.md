# Quiz Access Rule - Cheat Detection

## Overview

**Cheat Detection** is a Moodle quiz access rule plugin that monitors student behavior during quiz attempts in order to detect potential cheating patterns.

The plugin collects behavioral signals such as:

- Time spent per question
- Page focus loss events
- Copy actions on question text
- Suspicious browser extensions detection
- Session metrics and behavioral patterns

The collected data is aggregated and displayed in quiz review and report pages for teachers and administrators.

---

## Features

- Automatic activation when using **"One question per page"** layout
- Detection of:
    - Focus loss events
    - Copy attempts
    - Browser extension presence
- Per-question behavioral metrics
- Detailed attempt summary
- Teacher report enhancement via AMD JavaScript
- GDPR-compliant Privacy API implementation

---

## Requirements

- Moodle 4.x or higher
- Quiz activity enabled
- JavaScript enabled in the browser

---

## Installation

### Method 1 – Manual installation

1. Copy the plugin folder into: mod/quiz/accessrule/cheatdetect
2. Visit : Site administration - Notifications
3. Complete the installation process.

---

### Method 2 – Via ZIP upload

1. Compress the `cheatdetect` folder.
2. Go to: Site administration - Plugins - Install plugins 

3. Upload the ZIP file.
4. Follow the installation instructions.

---

## Configuration

There is no global configuration required.

The plugin activates automatically when:

- The quiz layout is set to **"One question per page"**.

If another layout is selected, the plugin will display a warning and monitoring will not be active.

---

## Usage

### For Teachers

1. Create or edit a quiz.
2. Set **Questions per page = 1**.
3. Save the quiz.
4. During student attempts, monitoring is automatically enabled.
5. Review behavioral data in:
    - Quiz attempt review page
    - Question review page
    - Enhanced report views

### Report Data Includes

- Total time per question
- Percentage of total attempt time
- Copy count
- Focus loss count
- Detected extensions
- Aggregated suspicious event count

---

## Privacy

This plugin stores behavioral data related to quiz attempts.

Stored data includes:

- Attempt ID
- User ID
- Quiz ID
- Slot (question number)
- Behavioral metrics
- Event logs
- Detected extension information

The plugin implements Moodle’s Privacy API and supports:

- User data export
- User data deletion

---

## Limitations

- Requires **"One question per page"** layout.
- Depends on browser-side JavaScript.
- Cannot detect external devices or screen recording software.

---

## Security Notice

This plugin provides behavioral indicators only.

It does **not guarantee proof of cheating**, but provides data to help teachers identify suspicious patterns.

---

## Developer Information

Component name: `quizaccess_cheatdetect`  
Type: Quiz access rule plugin  
Namespace: `quizaccess_cheatdetect`

---

## License

GNU GPL v3 or later

---

## Author

CBlue SRL  
gnormand@cblue.be  
abrichard@cblue.be

## Documentation

Full documentation is available here:

- English: docs/en/user-guide.md
- Français : docs/fr/guide-utilisateur.md
