IMPLEMENTATION CHECKLIST:

1.  [x] **Locate and Remove Duplicate `handleSimUIChange` Subscription (`Sim/src/main.js`)**
    - **File:** `Sim/src/main.js`
    - **Action:** Remove the duplicate subscription line `eventBus.on('uiControlChanged', this.handleSimUIChange.bind(this));` found in the _constructor_.
2.  [x] **Update `memoryBank/notebook.md`:**
    - **File:** `memoryBank/notebook.md`
    - **Action:** Add an entry detailing the finding (doubled `SimParams` logs), the cause (duplicate `handleSimUIChange` subscription in constructor), and the fix applied.
3.  [x] **Update `memoryBank/plan.md`:**
    - **File:** `memoryBank/plan.md`
    - **Action:** Replace the content of `plan.md` with this checklist (marked as complete).
