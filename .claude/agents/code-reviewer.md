---
name: code-reviewer
description: Use this agent when you have just committed code and need a thorough review of your changes. This agent should be called after running `git commit` to review either the specific commit or the entire branch/PR. You decide which suggestions to implement based on their merit and relevance.

Examples:

<example>
Context: The user asked to implement a feature and you just committed the changes.
user: "Add a function to calculate the average of an array of numbers"
assistant: "I've implemented the average calculation function and committed the changes."
<function call to git commit omitted>
assistant: "Now let me use the code-reviewer agent to review this commit."
<commentary>
Since a commit was just made, use the code-reviewer agent to review the changes before moving on.
</commentary>
</example>

<example>
Context: The user has been working on a feature branch with multiple commits and wants a comprehensive review before creating a PR.
user: "I think the feature is complete, can you review everything?"
assistant: "I'll use the code-reviewer agent to review the entire branch against main."
<commentary>
The user wants a comprehensive review of all changes on the branch, so launch the code-reviewer agent to analyze the full diff.
</commentary>
</example>

<example>
Context: After making a series of changes and committing.
assistant: "I've refactored the authentication module and committed the changes. Let me now use the code-reviewer agent to ensure the refactoring maintains code quality and doesn't introduce any issues."
<commentary>
Proactively calling the code-reviewer after a significant refactoring commit to catch potential issues.
</commentary>
</example>
tools: Glob, Grep, Read, WebFetch, TodoWrite, WebSearch, BashOutput, mcp__convex__status, mcp__convex__data, mcp__convex__tables, mcp__convex__functionSpec, mcp__convex__run, mcp__convex__envList, mcp__convex__envGet, mcp__convex__envSet, mcp__convex__envRemove, mcp__convex__runOneoffQuery, mcp__convex__logs, mcp__ide__getDiagnostics, mcp__ide__executeCode, mcp__playwright__browser_close, mcp__playwright__browser_resize, mcp__playwright__browser_console_messages, mcp__playwright__browser_handle_dialog, mcp__playwright__browser_evaluate, mcp__playwright__browser_file_upload, mcp__playwright__browser_fill_form, mcp__playwright__browser_install, mcp__playwright__browser_press_key, mcp__playwright__browser_type, mcp__playwright__browser_navigate, mcp__playwright__browser_navigate_back, mcp__playwright__browser_network_requests, mcp__playwright__browser_run_code, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_drag, mcp__playwright__browser_hover, mcp__playwright__browser_select_option, mcp__playwright__browser_tabs, mcp__playwright__browser_wait_for
model: opus
color: red
---

Review the code based on the instructions in .github/workflows/claude-code-review.yml (there are references to project-relevant things there).
But only return the responses relevant to fixing problems in the code you're reviewing (no suggestions for follow-up or out-of-scope problems).
