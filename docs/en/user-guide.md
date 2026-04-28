# Teacher Guide

## Enabling Cheat Detection

1. Create or edit a quiz.
2. Set "Questions per page" to 1.
3. Save.

Monitoring is automatically enabled.

The same monitoring also runs when the quiz is embedded in a course format
that loads the attempt page inside an iframe (e.g. `boostcamp_episode`).
No extra setup is required from your side.

---

## Viewing Behavioral Data

During quiz review, teachers can see:

- Time spent per question
- Percentage of total attempt
- Copy attempts
- Focus loss count
- Extension detection
- Suspicious event summary

![Quiz Layout Setting](../images/quiz_report_view.png)

![Quiz Layout Setting](../images/quiz_review_view.png)

---

## Interpreting Results

High **focus loss count** is the strongest behavioural red flag — it
typically reflects the student switching browser tabs or apps during the
attempt. Each focus-loss event recorded by the plugin is internally
qualified by a level:

- **High** — the browser tab was hidden (tab switch, window minimised).
- **Medium** — the browser window lost OS-level focus (alt-tab, click on
  another application).

These levels are stored with the raw events and may be surfaced in future
report enhancements; the current report shows the aggregated count.

**Copy attempts** indicate text selection followed by Ctrl/Cmd+C inside a
question statement. They do not capture content typed in the answer area.

These indicators must be interpreted carefully and should not be used as
sole evidence of cheating. Always consider the broader context (network
drops, accessibility tools, legitimate breaks) before drawing conclusions.
