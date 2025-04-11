# Project Roadmap

## Current Roadmap Items (Phase 1 Focus)

- **JS Template Refinement (`Grid` Project) ✅**

  - **Objective:** Establish architectural patterns and reusable components in a simpler environment. _[Status: Complete]_
  - **Strategy:** Implemented and verified core components (`DimensionManager`, `BoundaryManager`, etc.) adhering to architectural principles. Serves as the reference for `Sim`.

- **JS Core Refactoring (`Sim` Project)**
  - **Objective:** Align the `Sim` project's core logic with the Architectural Principles, using the `Grid` project as a template, to prepare it for eventual C# translation. _[Status: In Progress]_
  - **Strategy:** Parallel build approach, component substitution, dependency audits, detailed planning via `plan.md`, verification.
  - **Strategy Update:** Employing a "LEGACY Prefix" parallel development strategy: Rename existing components (`LEGACY_`), integrate template-aligned versions, maintain pipeline via LEGACY components initially, manage switchover deliberately.
  - _Note on Audio:_ Defer deep refactoring of the complex but functional audio system initially.
