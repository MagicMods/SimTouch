# JavaScript Coding Standards

## Error Handling and Code Clarity

### Avoid Silent Failures

* DO NOT use optional chaining and type checks as substitutes for proper dependency management
* BAD: `if (obj?.prop?.method && typeof obj.prop.method === 'function') { obj.prop.method(); }`
* GOOD: `obj.prop.method(); // obj.prop.method must exist - documented in requirements`

### Component References

* Components should be accessed through their documented paths
* BAD: `this.main?.turbulenceUi` (incorrect path + optional chaining)
* GOOD: `this.main.ui.turbulenceUi` (direct access through correct path)

### Fail Fast

* Let errors surface where they occur rather than hiding them
* BAD: `try { /* risky code */ } catch (e) {}`
* GOOD: `try { /* risky code */ } catch (e) { console.error('Specific operation failed:', e); throw e; }`

## Dependency Management

### Clear Dependencies

* Components should clearly document their dependencies
* Each module should specify what objects it requires to function
* Initialization should validate that required dependencies exist

### Single Source of Truth

* Avoid multiple ways to access the same resource
* BAD: Trying multiple paths to find an object (`a.b.c || a.d.c || global.c`)
* GOOD: Document and use the canonical path to each resource

## Practical Examples

### Before (with excessive safety checks)

```javascript
handleMouseWheel(e) {
  // Find turbulence field with multiple fallbacks
  let turbulenceField = this.main?.turbulenceField;
  if (!turbulenceField && this.particleSystem?.main?.turbulenceField) {
    turbulenceField = this.particleSystem.main.turbulenceField;
  }
  
  if (!turbulenceField) return;
  
  // Update UI with excessive safety checks
  if (this.main?.ui?.turbulenceUi && typeof this.main.ui.turbulenceUi.updateControllerDisplays === 'function') {
    this.main.ui.turbulenceUi.updateControllerDisplays();
  }
}
```

### After (direct and clear)

```javascript
handleMouseWheel(e) {
  // Use primary access path, documented in class requirements
  let turbulenceField = this.main.turbulenceField;
  if (!turbulenceField) return;
  
  // UI updates should use the direct, documented path
  this.main.ui.turbulenceUi.updateControllerDisplays();
}
```
