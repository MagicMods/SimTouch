## Debug Log: Particle Size Rendering Issue (YYYY-MM-DD)

**Issue:** Particles are all rendered with the same size, corresponding to the size calculated for particle index 0, despite the `turbulenceField` correctly calculating and storing different radii in `particleSystem.particleRadii`.

**Debugging Steps & Findings:**

1.  **Initial Check:** Confirmed the issue is visual rendering; collision diameters seemed correct.
2.  **Data Path Verification:**
    - Verified `particleSystem.getParticles()` calculates `p.size = particleRadii[i] * renderScale`.
    - Logged `particleRadii` values after turbulence update; confirmed different radii are being calculated.
    - Logged `p.size` values passed to `particleRenderer.js` and the `sizes` array created; confirmed different values matching scaled radii are passed to the renderer.
3.  \*\*Shader Verification (`particles` shader in `Sim/src/shaders/shaderManager.js`):
    - Confirmed shader uses `attribute float size;`.
    - Confirmed shader assigns `size` to `gl_PointSize`.
    - Dumped shader source at runtime to verify.
4.  \*\*Attribute Setup Verification (`Sim/src/renderer/particleRenderer.js`):
    - Confirmed correct attribute locations (`position`: 0, `size`: 1).
    - Corrected order of buffer binding/`bufferData`/`vertexAttribPointer` calls. **Issue persisted.**
    - Verified `size` attribute array was enabled before draw (`gl.getVertexAttrib`).
    - Verified correct shader program was active (`gl.getParameter(gl.CURRENT_PROGRAM)`).
5.  **VAO State Check:**
    - Explicitly unbound VAOs (`gl.bindVertexArray(null)`) at the start of `particleRenderer.draw`. **Issue persisted.**
    - Code search confirmed no active VAO usage in relevant renderers.
6.  **Constant Attribute Test:**
    - Disabled `size` attribute array and used `gl.vertexAttrib1f` to set a constant size.
    - Result: All particles rendered at the constant size. **Proves pipeline works for constants.**
7.  **`Sim copy` Comparison:**
    - Analyzed `Sim copy/src/renderer/particleRenderer.js` (which worked), noting its conditional check for `program.attributes.size`.
    - Modified `Sim copy` renderer to remove the conditional check, mirroring the main `Sim` renderer's logic.
    - Result: The modified `Sim copy` renderer **still worked correctly**.

**Current Conclusion:** The rendering logic within `particleRenderer.js` and the data pipeline are likely correct. The failure in the main `Sim` application probably stems from external factors (global GL state, shader management differences, initialization order, etc.) interfering with the per-vertex attribute functionality.

**Resolution (YYYY-MM-DD):**

- **Hypothesis:** Global WebGL state related to attribute divisors, potentially set by the instanced drawing in `gridGenRenderer`, was not being reset correctly before `particleRenderer` draw calls, causing the non-instanced `size` attribute to behave like an instanced one (divisor=1).
- **Fix:** Explicitly set the attribute divisor for the `size` attribute to 0 in `particleRenderer.js` immediately after the `vertexAttribPointer` call:
  ```javascript
  this.gl.vertexAttribPointer(program.attributes.size, 1, this.gl.FLOAT, false, 0, 0);
  this.gl.vertexAttribDivisor(program.attributes.size, 0); // Explicitly set divisor to 0
  ```
- **Result:** This correctly forced the `size` attribute to be treated as per-vertex, resolving the issue. Particles now render with their individual sizes.
