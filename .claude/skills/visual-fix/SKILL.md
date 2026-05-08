---
name: visual-fix
description: |
  Orchestrate a visual UI bug fix with iterative screenshot verification. Use whenever the user reports a UI bug they can see (spacing, layout, shadow, alignment, broken chart, etc.) or when they paste a screenshot of broken UI. Automatically runs the screenshot-fix-screenshot loop until the rendered output proves the issue is resolved.
trigger:
  - "fix the UI"
  - "fix this design"
  - "the layout is broken"
  - "spacing is off"
  - "this looks weird"
  - user_uploads_screenshot_of_broken_ui
---

# Visual Fix — Iterative Loop

You are about to fix a UI bug. The user has reported it visually. **You will iterate until the screenshot proves the bug is gone**, not until you think the code is right.

## The Loop (NON-NEGOTIABLE)

This is the loop you will execute. Do not exit it until step 5 returns "all clear" with visual evidence.

### Step 1 — Capture the broken state

Use Playwright MCP to navigate to the affected route on the running dev server and screenshot:

- The full page
- The specific component if relevant
- Multiple viewports if responsive concerns (1440 / 768 / 390)

If the dev server isn't running, ask the user to start it. Don't guess — don't proceed.

### Step 2 — Identify the bug visually

Look at the screenshot. Compare to:

- The user's reported issue
- The design intent (from CLAUDE.md, the page composition, or attached references)
- The original screenshot if the user uploaded one

State explicitly what's wrong in the rendered output. Be specific: "the sparkline chart at row 2 is rendering as a 4px floating segment because the SVG has no defined viewBox or the data has only one point".

### Step 3 — Plan the fix

Use `superpowers:writing-plans` if the bug is non-trivial. For a simple fix, a one-paragraph plan is fine. State:

- Root cause hypothesis
- Files to change
- Expected visual change

### Step 4 — Implement

Use `ui-component-dev` to make the code change. It must:

- Make the change
- Wait for HMR to reload
- Take a fresh Playwright screenshot
- Compare new screenshot to the broken one

### Step 5 — Verify

Use `ui-design-reviewer` to:

- Take its own independent Playwright screenshot
- Judge whether the rendered output matches the design intent
- Specifically look at the bug the user reported AND check for regressions elsewhere on the page
- Return one of:
  - **"VERIFIED"** with screenshot showing fix → exit loop, report to user
  - **"NOT FIXED"** with screenshot showing remaining issue → return to Step 2 with the new context
  - **"NEW ISSUE INTRODUCED"** with screenshot showing regression → return to Step 2

### Step 6 — Loop or exit

- If `ui-design-reviewer` returned **VERIFIED**, exit the loop. Report to user with before/after screenshots.
- If anything else, **go back to Step 2** with the latest screenshot as the new "broken state".

## Loop Safety

- Maximum iterations: 8. If you reach 8 without convergence, stop and report what's blocking convergence (likely missing context, ambiguous intent, or environmental issue like dev server not reflecting changes).
- After every iteration, briefly note in conversation: "Iteration N: [what changed, current status]". This makes the loop visible to the user.

## What "VERIFIED" Means

`ui-design-reviewer` cannot mark VERIFIED based on:

- The code looking correct
- Believing the fix should work
- The HMR confirming the file saved

It can ONLY mark VERIFIED based on:

- A fresh Playwright screenshot
- Visual confirmation that the specific bug the user reported is no longer visible
- No new visual regressions on the same page

If the dev server is stale (didn't hot-reload), kill the loop, ask the user to restart the dev server, and resume.

## Output Format

When the loop exits successfully:

1. **Before** screenshot (from Step 1 of iteration 1)
2. **After** screenshot (final VERIFIED screenshot)
3. **Summary** of what was wrong and what fixed it (3-5 sentences)
4. **Diff** of the code changes
5. **Iterations needed** (transparency)

If the loop exits unsuccessfully (max iterations or environmental block):

1. The **last** screenshot taken
2. What you believe the remaining issue is
3. What's blocking further progress
4. Suggested next step for the user

## Mindset

- The screenshot is ground truth. The code is hypothesis.
- The user can see things you can't infer from code. Trust their report over your model of the rendering.
- Iteration is not failure. Iteration is the methodology. One-shot fixes for visual bugs are luck.
- Don't claim done until the picture says done.
