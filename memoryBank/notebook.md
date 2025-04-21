## Analysis: C-Bounce & B-Bounce Effectiveness (2024-07-27)

**Query:** User reported particle-particle (C-Bounce) and particle-boundary (B-Bounce) collisions seem ineffective.

**[THINK] Analysis Findings:**

**C-Bounce (`collisionSystem.js::resolveCollision`):**

1.  **Detection:** Spatial grid used to optimize checks.
2.  **Resolution Logic:**
    - Calculates overlap based on particle radii (dynamic if `turbulence.affectScale` is true) and `restDensity` (which modifies minimum separation distance `minDist`).
    - **Repulsion:** Applies a primary velocity change based on overlap (`Math.pow(overlap / minDist, 1.5) * this.repulsion`).
    - **Restitution (Bounce):** Applied _only if_ particles are moving towards each other (`vn < 0`). Crucially, the restitution coefficient is _softened_ by overlap (`this.particleRestitution * (1.0 - overlap / minDist)`). Deep overlaps result in very little bounce.
    - **Position Correction:** Minimal position correction applied only for significant overlaps (>10% of `minDist`).
    - **Damping:** `collisionSystem.damping` exists but isn't applied directly in `resolveCollision`. Global damping occurs later in `particleSystem`.
3.  **Potential Ineffectiveness Reasons:**
    - Soft restitution leads to weak bounce with overlap.
    - Repulsion force might dominate, pushing particles apart without a distinct "bounce".
    - Density factor allows closer proximity at high densities, reducing interaction space.
    - Global damping might reduce collision velocity effects quickly.

**B-Bounce (`particleSystem.js::updateParticles` -> `boundaryManager` -> `boundary.resolveCollision`):**

1.  **Handling:** Occurs _after_ velocity updates, particle-particle collisions, and global damping.
2.  **Process:**
    - Iterates particles.
    - Gets _current_ boundary object from `boundaryManager` for each particle.
    - Calls `currentBoundary.resolveCollision(position, velocity, physicsRadius, this.boundaryDamping)`.
    - `physicsRadius` depends on `turbulence.affectScale`.
    - `boundaryDamping` (default 0.95 in `particleSystem`) is passed to the boundary's method.
3.  **Potential Ineffectiveness Reasons:**
    - **Logic Delegated:** Effectiveness depends entirely on the `resolveCollision` implementation within the specific boundary class (e.g., `CircularBoundary.js`, `RectangularBoundary.js`), which hasn't been reviewed yet.
    - **Boundary Damping:** The `boundaryDamping` value directly controls energy loss at the boundary.
    - **Order of Operations:** Collisions are checked after other physics steps may have already reduced particle velocity.

**Next Steps:**

1.  Inspect the `resolveCollision` method in the relevant boundary class(es).
2.  Analyze the interplay and tuning of parameters: `repulsion`, `particleRestitution`, `restDensity`, `velocityDamping`, `boundaryDamping`.

## Deep Analysis: C-Bounce & B-Bounce (UI to Physics) (2024-07-27)

**Query:** Deep analysis of C-Bounce and B-Bounce effectiveness, from UI to applied physics.

**[THINK] Analysis Findings:**

**1. UI Controls & Parameter Flow:**

- **Initialization:** Default parameters for simulation, collision, and boundary are set in `main.js` constructor within `simParams`.
- **UI Binding (`boundaryUi.js`):** Controls for `B-Mode`, `B-Scale`, `B-Friction` (`boundary.damping`), `B-Bounce` (`boundary.restitution`), `B-Repulse` (`boundary.repulsion`) are bound to `main.simParams.boundary`.
- **Collision UI:** UI controls for `collision.repulsion` and `collision.particleRestitution` were not located in the reviewed files (`boundaryUi.js`). Defaults are set in `main.js` (`repulsion: 0.5`, `particleRestitution: 0.8`).
- **Event Handling:** UI changes emit `uiControlChanged` -> `main.js` updates `simParams` -> `main.js` emits `simParamsUpdated`.
- **Propagation to Sim:** `ParticleSystem` and `CollisionSystem` listen for `simParamsUpdated` and update their internal states from `simParams.simulation.*` and `simParams.collision.*` respectively.
- **CRITICAL Boundary Parameter Disconnect:**
  - `BaseBoundary` (and its children) initializes its _own_ defaults: `cBoundaryRestitution = 0.8`, `damping = 0.95`, `boundaryRepulsion = 0.1`.
  - `ParticleSystem` passes its `boundaryDamping` property (which is actually set by `simParams.simulation.velocityDamping`) to the boundary's `resolveCollision` as `externalDamping`.
  - Boundary classes use this `externalDamping` for friction/damping, `this.cBoundaryRestitution` (internal default 0.8) for bounce, and `this.boundaryRepulsion` (internal default 0.1) for repulsion.
  - **Conclusion:** The UI controls for `boundary.damping` (B-Friction), `boundary.restitution` (B-Bounce), and `boundary.repulsion` (B-Repulse) **DO NOT AFFECT** the boundary physics calculations. They modify `simParams.boundary`, but these values are not read or used by the `BaseBoundary` derived classes during collision resolution.

**2. C-Bounce Physics (`collisionSystem.js::resolveCollision`):**

- **Parameters Used:** `this.repulsion`, `this.particleRestitution` (from `simParams.collision`), `particleSystem.restDensity` (from `simParams.simulation`), `particleSystem.particleRadius`/`particleRadii` (from `simParams.simulation`).
- **Logic:** Applies repulsion (`overlap^1.5 * repulsion`) and softened restitution bounce (`particleRestitution * (1 - overlap/minDist)` if `vn < 0`).
- **Damping:** `collisionSystem.damping` (from `simParams.collision.damping`) is **NOT USED** in `resolveCollision`. Global `particleSystem.velocityDamping` (from `simParams.simulation.velocityDamping`) is applied later.
- **Ineffectiveness Factors:** Soft restitution on overlap, potentially high repulsion force, reliance on later global damping.

**3. B-Bounce Physics (`circularBoundary.js`/`rectangularBoundary.js`::`resolveCollision`):**

- **Parameters Used:**
  - `externalDamping`: Provided by `ParticleSystem`, value comes from `simParams.simulation.velocityDamping` (default 0.98).
  - `this.cBoundaryRestitution`: Internal default `0.8` (from `BaseBoundary`). **Not** from `simParams.boundary.restitution`.
  - `this.boundaryRepulsion`: Internal default `0.1` (from `BaseBoundary`). **Not** from `simParams.boundary.repulsion`.
- **Logic (Circular):** Reflects normal velocity using `cBoundaryRestitution=0.8`, applies tangential friction using `externalDamping` (i.e., `velocityDamping`). Adds repulsion force near edge based on `boundaryRepulsion=0.1`.
- **Logic (Rectangular):** Reflects perpendicular velocity component using `cBoundaryRestitution=0.8`, applies overall damping using `externalDamping` (i.e., `velocityDamping`). Adds repulsion force near edge based on `boundaryRepulsion=0.1`.
- **Ineffectiveness Factors:**
  - **Disconnected UI Parameters:** The primary reason. UI sliders for B-Bounce, B-Friction, B-Repulse have no effect.
  - **Fixed Restitution:** Boundary bounce is fixed at 0.8.
  - **Fixed Repulsion:** Boundary repulsion is fixed at a low 0.1.
  - **Damping Source:** Boundary damping/friction uses the global particle `velocityDamping`.
  - **Position Correction:** Minor push-in after collision might dampen rapid bounces.

**Overall Conclusion:**

- **C-Bounce:** Effectiveness depends on tuning `collision.particleRestitution`, `collision.repulsion`, and `simulation.velocityDamping`. Softening effect is inherent.
- **B-Bounce:** **Likely ineffective and unresponsive to UI controls** due to the parameter disconnect. Boundary physics uses hardcoded defaults (restitution 0.8, repulsion 0.1) and global velocity damping.

**Recommendation:** Fix the parameter flow for boundary physics to use the values from `simParams.boundary` set by the UI controls.

## Deviation Analysis: C-Bounce Damping Implementation (2024-07-27)

**Context:** After implementing the plan to apply `collisionSystem.damping` within `resolveCollision`.

**Observed Behavior:** User reported particles lost free-moving behavior, even when global `simulation.velocityDamping` was set to 1.

**[THINK] Failure Analysis:**

1.  **Plan vs. Implementation:** The implementation correctly applied `this.damping` multiplicatively to velocities of particles `i` and `j` at the end of the `if (distSq < minDistSq)` block in `resolveCollision`.
2.  **Root Cause:**
    - The collision-specific `this.damping` (default 0.98) is now applied every time any two particles are closer than `minDist`.
    - This occurs regardless of whether a bounce impulse is generated (`vn < 0`) or only repulsion is applied.
    - In dense situations, a particle can trigger this check with multiple neighbors within a single `update` cycle.
    - Consequently, a particle's velocity can be multiplied by `this.damping` (e.g., 0.98) _multiple times per frame_, leading to rapid velocity decay.
    - This happens _before_ the global `simulation.velocityDamping` is applied once in `ParticleSystem`, making the collision damping the dominant (and excessive) factor.
3.  **Conclusion:** The plan, while technically implemented correctly, resulted in unintended excessive damping due to the frequency and location of its application. Applying damping during every overlap check, potentially multiple times per particle, is too aggressive.

**Recommendation:** Revert the change or significantly revise the approach for applying collision-specific damping (e.g., only during impulse calculation, or reconsider its necessity given global damping).

<!-- AI Collaboration Log -->

### [Timestamp] - User Request: Modify `restDensity` Behavior

User reported quirky behavior with `restDensity` affecting particle spacing:

- `0`: Edge-to-edge collision (Correct)
- `0.01`: Max spacing (Incorrect)
- `2.9`: Edge-to-edge collision (Incorrect)
- `> 2.9`: Overlap (Incorrect)

Desired behavior:

- `0`: Edge-to-edge collision
- `> 0`: Increasing spacing, proportional to `restDensity`, max spacing at max density.

### [MODE: THINK] - Analysis

Reviewed `particleSystem.js`, `fluidFLIP.js`, `collisionSystem.js`, `collisionUi.js`, `main.js`.

**Findings:**

- `collisionSystem.js` calculates `minDist` using `densityFactor = max(0.5, min(2.0, restDensity / 3))`, then `minDist = (rI + rJ) * (1 / densityFactor)`. This _inversely_ scales spacing with density, causing the observed issue.
- `fluidFLIP.js` has an `applyRestDensityEffect` that applies repulsion _inversely_ proportional to density (`restEffect = 1.0 / max(0.01, restDensity)`), potentially conflicting with the desired behavior.

**Conclusion:** The primary issue is the `minDist` calculation in `CollisionSystem`. The `FluidFLIP` effect might also conflict.

### [MODE: THINK+] - Brainstorming

**Approach 1:** Modify only `CollisionSystem` to calculate `spacingMultiplier = 1.0 + (restDensity * scaleFactor)` and `minDist = (rI + rJ) * spacingMultiplier`. Chosen `scaleFactor = 0.05` for testing.
**Approach 2:** Modify `CollisionSystem` (as above) AND remove the `applyRestDensityEffect` from `FluidFLIP` to eliminate conflicting logic.

**Decision:** Proceed with Approach 2 for clarity and to ensure `CollisionSystem` is the sole driver of density-based spacing.

### [MODE: PLAN] - Implementation Plan

1.  **Modify `CollisionSystem.js`:** Replace `densityFactor` logic with new `spacingMultiplier` calculation (`1.0 + restDensity * 0.05`) and update `minDist` calculation.
2.  **Modify `FluidFLIP.js`:** Remove the call to `applyRestDensityEffect` in `transferToParticles` and delete the `applyRestDensityEffect` method itself.
3.  **Update Memory Bank:** Log analysis/plan in `notebook.md`, create plan in `plan.md`.

Plan created in `memoryBank/plan.md`.
