IMPLEMENTATION CHECKLIST:

1.  - [x] **Modify CSS Rule:** Edit `Sim/src/ui/css/global.css`. Locate the `#app-logo` ruleset and remove the line `pointer-events: none;`.
2.  - [x] **Modify JavaScript Code:** Edit `Sim/src/ui/uiManager.js`. Locate the code block added previously that creates the logo image (near the end of the `constructor`). Replace that block with the following code to wrap the image in an anchor tag:

    ```javascript
    // Create and add the linked logo
    const logoLink = document.createElement("a");
    logoLink.href = "https://github.com/MagicMods/SimTouch/tree/phase1";
    logoLink.target = "_blank"; // Open in new tab
    logoLink.rel = "noopener noreferrer"; // Security best practice

    const logoImg = document.createElement("img");
    logoImg.id = "app-logo"; // Keep the ID for styling
    // Use relative path from ui/ to image/
    logoImg.src = "../image/MagicMods-brush-extended_200W.png";
    logoImg.alt = "Magic Mods Logo - Link to GitHub"; // Update alt text

    logoLink.appendChild(logoImg); // Place the image inside the link
    document.body.appendChild(logoLink); // Append the link (containing the image)
    ```

3.  - [x] **Log Plan:** Update `memoLTM/plan.md` with this new plan, replacing the previous one.
