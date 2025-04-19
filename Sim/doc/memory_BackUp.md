---
description:
globs:
alwaysApply: true
---

description: |

## AI Collaboration Memory Protocol

This rule ensures the AI assistant utilizes dedicated files within the `memoryBank/` directory to maintain context, track analysis, and manage implementation plans throughout the development process, adhering to the RIPER-5 protocol.

**Key Objectives:**

1.  **Persistent Context:** Prevent loss of information between interactions.
2.  **Structured Process:** Align file usage with RIPER-5 modes.
3.  **Transparency:** Keep a clear record of analysis, planning, and learning.
4.  **Progress Tracking:** Maintain an up-to-date implementation checklist and roadmap.

globs:

- "\*_/_"

alwaysApply: true

---

## AI Instructions for memoryBank Usage:

**File Overview:**

- **`notebook.md`:** Chronological log of THINK/THINK+ discussions, decisions, and EXEC/CHECK results.
- **`goals.md`:** Overarching project vision, strategy, architectural principles, and scope definition.
- **`architecture_grid.md`:** Definitive state and principles of the `Grid` project.
- **`architecture_sim.md`:** Current/target state and principles of the `Sim` project.
- **`roadmap.md`:** Actionable roadmap tracking major development phases and their status.
- **`learnings.md`:** Consolidated lessons, patterns, and process refinements.
- **`plan.md`:** Tactical checklist for the current implementation task.
- **`notebook_archive.md`:** (Optional) Long-term archive of pruned notebook sections.

**Detailed Usage:**

**1. `memoryBank/notebook.md` - The Collaboration Log:**

- **Purpose:** Record the narrative flow of analysis, brainstorming, decisions, and execution steps.
- **RIPER-5 Usage:**
  - **[THINK]:** Append detailed observations, file summaries, comparisons.
  - **[THINK+]:** Document brainstormed ideas, pros/cons, potential approaches, and decisions leading to synthesis.
  - **[EXE]:** Log execution actions and any immediate, significant results or errors encountered during steps.
  - **[CHECK]:** Log validation results and deviations found.
- **Format:** Use standard markdown. Add timestamps or clear separators. Reference other memoryBank files where synthesis occurs.
- **DO NOT** put planning checklists or final architectural states here.

**2. `memoryBank/goals.md` - Goals & Strategy:**

- **Purpose:** Document the overarching project vision, development strategy, core architectural principles, and scope definitions (inclusions/exclusions).
- **RIPER-5 Usage:**
  - **[THINK/THINK+]:** Consult FIRST for foundational goals, strategy, and architectural rules before consulting other files. Use as the primary source for "Why" and "Rules".
- **Format:** Well-structured markdown with clear headings for vision, strategy, principles, scope.
- **DO NOT** put tactical plans or chronological notes here.

**3. `memoryBank/plan.md` - The Implementation Blueprint:**

- **Purpose:** Define and track the precise, step-by-step implementation plan for the **current task**.
- **RIPER-5 Usage:**
  - **[PLAN]:** Create the detailed, numbered checklist with markdown checkboxes (`- [ ]`) here. Each item must be atomic.
  - **[EXEC]:** Read the plan _only_ from this file. Implement steps EXACTLY as written.
  - **[CHECK]:** Verify implementation against _only_ this file. Update checkboxes to `- [x]` upon successful validation of a step.
- **Format:** Adhere strictly to the header format and the numbered checklist structure (`1. - [ ] Action...`).
- **DO NOT** put general notes, analysis, or long-term goals here.

**4. `memoryBank/architecture_grid.md` & `memoryBank/architecture_sim.md` - Architecture Definitions:**

- **Purpose:** Document the definitive, verified state, component structures, core principles, and key data flows for each respective project.
- **RIPER-5 Usage:**
  - **[THINK/THINK+]:** Consult these files for existing state. Synthesize _finalized_ architectural decisions or verified component states here after discussion in `notebook.md`.
- **Format:** Well-structured markdown with clear headings for components, principles, etc.

**5. `memoryBank/roadmap.md` - Actionable Roadmap:**

- **Purpose:** Track actionable, sequential development phases and their status.
- **RIPER-5 Usage:**
  - **[THINK+]:** Consult for context on current/next major development phase.
  - **[PLAN]:** Use as input when formulating tactical `plan.md` checklists for specific roadmap items.
- **Format:** Markdown list or outline of major development phases/items.

**6. `memoryBank/learnings.md` - Consolidated Experience:**

- **Purpose:** Store lessons learned, validated patterns, process refinements, and key insights applicable moving forward.
- **RIPER-5 Usage:**
  - **[THINK/THINK+/CHECK]:** Consult for established best practices. Synthesize significant learnings or process changes here after identification/discussion in `notebook.md`.
- **Format:** Markdown sections detailing specific learnings, patterns, or principles.

**7. `memoryBank/notebook_archive.md` - Long-Term Archive (Optional):**

- **Purpose:** Store older, verbose sections pruned from `notebook.md` for historical reference if needed.
- **Usage:** Manually populated during notebook cleanup. Not actively consulted during typical workflow.

**General Conduct:**

- **[THINK Mode]:** After analysis, append observations to `notebook.md`. **Log verification steps (e.g., '[VERIFY] Checked `main.js` for `debugFlags.turbulence`. Confirmed: exists.')**. If analysis reveals definitive state updates, consult relevant `goals.md`, `architecture_*.md`, `roadmap.md`, or `learnings.md` and synthesize updates there, noting the update action in `notebook.md`. **Log detailed failure analysis following any deviation, error, or rejection encountered in EXE/CHECK modes, as required by the `riper-5.mdc` Deviation Handling protocol.** Confirm all updates in your response.
- **[THINK+ Mode]:** After brainstorming, append discussion/decisions to `notebook.md`. **If proposing custom logic for a common task, explicitly state that existing utilities (e.g., `TickLog`) were considered and why they are not being used (per Pattern Adherence Principle).** If decisions lead to synthesis, update the relevant `goals.md`, `architecture_*.md`, `roadmap.md`, or `learnings.md` file and note the update action in `notebook.md`. Confirm all updates in your response.
- **[PLAN Mode]:** Create the checklist in `memoryBank/plan.md`. **If using fallback logging (`Math.random()`), note the justification here.** Confirm this action in your response.
- **[EXEC Mode]:** Read steps _only_ from `memoryBank/plan.md`. Log execution in `notebook.md`.
- **[CHECK Mode]:** Validate _only_ against `memoryBank/plan.md`. Update `plan.md` checkboxes. Log results in `notebook.md`. If learnings occur, update `learnings.md` and note in `notebook.md`.
- **[All Modes]:** When asked about previous states, plans, goals, or learnings, you MUST consult the relevant structured file (`goals.md`, `architecture_*.md`, `plan.md`, `roadmap.md`, `learnings.md`) before `notebook.md`. Use the information found. Do not simply state you will consult; perform the consultation. Consult `goals.md` first for strategic context.
