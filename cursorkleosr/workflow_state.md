# Workflow State & Rules (STM + Rules + Log)

*This file contains the dynamic state, embedded rules, active plan, and log for the current session.*
*It is read and updated frequently by the AI during its operational loop.*

---

## State

*Holds the current status of the workflow.*

```yaml
Phase: BLUEPRINT # Current workflow phase (ANALYZE, ANALYZE+, BLUEPRINT, BLUEPRINT+, CONSTRUCT, VALIDATE)
Status: NEEDS_PLAN_APPROVAL # Current status (READY, IN_PROGRESS, BLOCKED_*, NEEDS_*, COMPLETED)
CurrentTaskID: ui_pattern_consistency # Identifier for the main task being worked on
CurrentStep: null # Identifier for the specific step in the plan being executed
```

---

## Plan

*Contains the step-by-step implementation plan generated during the BLUEPRINT phase.*

Based on the analysis of the Sim and Grid projects, I've identified the following potential improvements to ensure UI pattern consistency as per project requirements:

1. Resolve UI Component Inheritance Inconsistency
   * Fix import path in Sim/src/ui/uiComponent.js which incorrectly imports BaseUi from "../panels/baseUi.js" instead of "../baseUi.js"
   * Ensure all UI components properly extend either BaseUi or UiComponent as appropriate

2. Standardize UI Component Contract Implementation
   * Ensure all UI components implement the required methods: getControlTargets(), updateControllerDisplays()
   * Verify proper error handling for missing dependencies as per Direct Responsibility Principle

3. Harmonize UI Container Management
   * Compare container creation and positioning between Sim and Grid projects
   * Standardize container positioning CSS classes

4. Document Established UI Patterns
   * Create a comprehensive document of identified UI patterns
   * Include examples of correct implementation for future reference

---

## Rules

*Embedded rules governing the AI's autonomous operation.*

**# --- Core Workflow Rules ---**

RULE_WF_PHASE_ANALYZE:
  **Constraint:** Pure information gathering and understanding. NO creativity, innovation, solutioning, or implementation planning.
  **Permitted:** Reading files, asking clarifying questions, understanding code structure
  **Forbidden:** Any form of creativity, suggestions, or planning

RULE_WF_PHASE_ANALYZE_PLUS:
  **Constraint:** Information gathering with creative problem-solving. NO implementation planning.
  **Permitted:**
    - Reading files, asking clarifying questions
    - Brainstorming possibilities
    - Creative problem-solving approaches
    - Innovation in understanding and approach
  **Forbidden:** Implementation planning or concrete solutions

RULE_WF_PHASE_BLUEPRINT:
  **Constraint:** Creating technical specification from requirements. NO creativity or innovation.
  **Permitted:** Converting requirements to concrete steps, creating detailed plans
  **Forbidden:** Creative solutions, innovative approaches, implementation

RULE_WF_PHASE_BLUEPRINT_PLUS:
  **Constraint:** Creating technical specification with creative solution design. NO implementation.
  **Permitted:**
    - Converting requirements to concrete steps
    - Creative solution design
    - Innovative approaches
    - Alternative implementation strategies
  **Forbidden:** Actual implementation

RULE_WF_PHASE_CONSTRUCT:
  **Constraint:** Implementing exactly as planned. NO creativity or deviation.
  **Permitted:** Implementing the approved plan exactly
  **Forbidden:** Any creative additions or deviations from plan

RULE_WF_PHASE_VALIDATE:
  **Constraint:** Verifying implementation against plan. Zero tolerance for deviation.
  **Permitted:** Testing, validation, comparison against plan
  **Forbidden:** Any modifications or creative solutions

RULE_WF_TRANSITION_01:
  **Trigger:** Explicit user command (`@analyze`, `@analyze+`, `@blueprint`, `@blueprint+`, `@construct`, `@validate`).
  **Action:** Update `State.Phase` accordingly. Log phase change.

RULE_WF_TRANSITION_02:
  **Trigger:** AI determines current phase constraint prevents fulfilling user request OR error handling dictates phase change.
  **Action:** Log the reason. Update `State.Phase` appropriately. Set `State.Status` appropriately. Report to user.

**# --- JavaScript Standards Rules ---**

RULE_JS_STANDARDS_01:
  **Trigger:** Any code modification.
  **Action:** Enforce Direct Access Principle:
    - No optional chaining
    - No excessive type checks
    - Fail fast on missing dependencies

RULE_JS_STANDARDS_02:
  **Trigger:** Error handling implementation.
  **Action:** Enforce Explicit Failure Principle:
    - No silent error handling
    - Clear error messages
    - Proper error propagation

RULE_JS_STANDARDS_03:
  **Trigger:** Component creation/modification.
  **Action:** Enforce Direct Responsibility Principle:
    - Clear dependency documentation
    - Single source of truth
    - Proper dependency injection

**# --- UI Structure Rules ---**

RULE_UI_STRUCTURE_01:
  **Trigger:** Before UI structure changes.
  **Action:**
    1. Search for similar UI components
    2. Document established patterns
    3. Show relevant code to user
    4. Get pattern confirmation

RULE_UI_STRUCTURE_02:
  **Trigger:** Multiple UI change attempts.
  **Action:**
    1. Stop immediately
    2. Document failed attempts
    3. Show relevant code
    4. Request user guidance

**# --- Initialization & Resumption Rules ---**

RULE_INIT_01:
  **Trigger:** AI session/task starts AND `workflow_state.md` is missing or empty.
  **Action:**
    1. Create `workflow_state.md` with default structure.
    2. Read `project_config.md` (prompt user if missing).
    3. Set `State.Phase = ANALYZE`, `State.Status = READY`.
    4. Log "Initialized new session."
    5. Prompt user for the first task.

RULE_INIT_02:
  **Trigger:** AI session/task starts AND `workflow_state.md` exists.
  **Action:**
    1. Read `project_config.md`.
    2. Read existing `workflow_state.md`.
    3. Log "Resumed session."
    4. Check `State.Status`: Handle READY, COMPLETED, BLOCKED_*, NEEDS_*, IN_PROGRESS appropriately.

RULE_INIT_03:
  **Trigger:** User confirms continuation via RULE_INIT_02 (for IN_PROGRESS state).
  **Action:** Proceed with the next action based on loaded state and rules.

**# --- Memory Management Rules ---**

RULE_MEM_READ_LTM_01:
  **Trigger:** Start of a new major task or phase.
  **Action:** Read `project_config.md`. Log action.

RULE_MEM_READ_STM_01:
  **Trigger:** Before *every* decision/action cycle.
  **Action:** Read `workflow_state.md`.

RULE_MEM_UPDATE_STM_01:
  **Trigger:** After *every* significant action or information receipt.
  **Action:** Immediately update relevant sections (`## State`, `## Plan`, `## Log`) in `workflow_state.md` and save.

RULE_MEM_UPDATE_LTM_01:
  **Trigger:** User command (`@config/update`) OR end of successful VALIDATE phase for significant change.
  **Action:** Propose concise updates to `project_config.md` based on `## Log`/diffs. Set `State.Status = NEEDS_LTM_APPROVAL`. Await user confirmation.

RULE_MEM_VALIDATE_01:
  **Trigger:** After updating `workflow_state.md` or `project_config.md`.
  **Action:** Perform internal consistency check. If issues found, log and set `State.Status = NEEDS_CLARIFICATION`.

**# --- Tool Integration Rules (Cursor Environment) ---**

RULE_TOOL_LINT_01:
  **Trigger:** Relevant source file saved during CONSTRUCT phase.
  **Action:** Instruct Cursor terminal to run lint command. Log attempt. On completion, parse output, log result, set `State.Status = BLOCKED_LINT` if errors.

RULE_TOOL_FORMAT_01:
  **Trigger:** Relevant source file saved during CONSTRUCT phase.
  **Action:** Instruct Cursor to apply formatter or run format command via terminal. Log attempt.

RULE_TOOL_TEST_RUN_01:
  **Trigger:** Command `@validate` or entering VALIDATE phase.
  **Action:** Instruct Cursor terminal to run test suite. Log attempt. On completion, parse output, log result, set `State.Status = BLOCKED_TEST` if failures, `TESTS_PASSED` if success.

RULE_TOOL_APPLY_CODE_01:
  **Trigger:** AI determines code change needed per `## Plan` during CONSTRUCT phase.
  **Action:** Generate modification. Instruct Cursor to apply it. Log action.

**# --- Error Handling & Recovery Rules ---**

RULE_ERR_HANDLE_LINT_01:
  **Trigger:** `State.Status` is `BLOCKED_LINT`.
  **Action:** Analyze error in `## Log`. Attempt auto-fix if simple/confident. Apply fix via RULE_TOOL_APPLY_CODE_01. Re-run lint via RULE_TOOL_LINT_01. If success, reset `State.Status`. If fail/complex, set `State.Status = BLOCKED_LINT_UNRESOLVED`, report to user.

RULE_ERR_HANDLE_TEST_01:
  **Trigger:** `State.Status` is `BLOCKED_TEST`.
  **Action:** Analyze failure in `## Log`. Attempt auto-fix if simple/localized/confident. Apply fix via RULE_TOOL_APPLY_CODE_01. Re-run failed test(s) or suite via RULE_TOOL_TEST_RUN_01. If success, reset `State.Status`. If fail/complex, set `State.Phase = BLUEPRINT_REVISE`, `State.Status = NEEDS_PLAN_APPROVAL`, propose revised `## Plan` based on failure analysis, report to user.

RULE_ERR_HANDLE_GENERAL_01:
  **Trigger:** Unexpected error or ambiguity.
  **Action:** Log error/situation to `## Log`. Set `State.Status = BLOCKED_UNKNOWN`. Report to user, request instructions.

---

## Log

*A chronological log of significant actions, events, tool outputs, and decisions.*
*(This section will be populated by the AI during operation)*

*Example:*

* `[2025-03-26 17:55:00] Initialized new session.`
* `[2025-03-26 17:55:15] User task: Implement login feature.`
* `[2025-03-26 17:55:20] State.Phase changed to ANALYZE.`
* `[2025-03-26 17:56:00] Read project_config.md.`
* ...

*Actual Log:*

* `[2025-03-26 17:53:47] Initialized new session. State set to ANALYZE/READY.`
* `[2023-04-01 16:21:00] Resumed session. Read project_config.md.`
* `[2023-04-01 16:21:15] Read workflow_state.md. Current State: Phase=ANALYZE, Status=READY.`
* `[2023-04-01 16:22:00] User task: Operate autonomously based on project_config.md and workflow_state.md.`
* `[2023-04-01 16:22:15] State updated to ANALYZE/IN_PROGRESS.`
* `[2023-04-01 16:22:30] Analyzed project structure. Found two main directories: Sim/ and Grid/ as defined in project_config.md.`
* `[2023-04-01 16:23:15] Examined Sim/src directory structure and main.js - identified modular components for particle physics simulation.`
* `[2023-04-01 16:23:45] Examined Grid/src directory structure and main.js - identified grid generation functionality.`
* `[2023-04-01 16:24:00] Phase transitioned from ANALYZE to ANALYZE+ for deeper project understanding.`
* `[2023-04-01 16:24:15] Key observations:
   - Sim/ contains WebGL2-based particle physics simulation with modular architecture
   - Grid/ contains a grid generation tool for displaying cell configurations
   - Both follow similar architectural patterns with a Main class as orchestrator
   - Need to identify specific tasks or improvements for blueprint phase`
* `[2023-04-01 16:25:00] Analyzed UI components in both Sim and Grid projects.`
* `[2023-04-01 16:25:30] Discovered potential UI pattern inconsistency: incorrect import path in Sim/src/ui/uiComponent.js.`
* `[2023-04-01 16:26:00] Identified differences in UI component implementation between Sim and Grid projects.`
* `[2023-04-01 16:26:30] Examined UI container management in both projects - potential for standardization.`
* `[2023-04-01 16:27:00] Phase transitioned from ANALYZE+ to BLUEPRINT.`
* `[2023-04-01 16:27:15] Created plan for UI pattern consistency improvements.`
* `[2023-04-01 16:27:30] Set Status to NEEDS_PLAN_APPROVAL before proceeding to implementation.`
