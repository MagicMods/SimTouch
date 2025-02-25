import GUI from "lil-gui";

// Initialize presets and parameters
const presets = {
  Default: { size: 1, speed: 0.5, color: "#ff0000" },
  // Add more presets here
};

const params = { ...presets.Default };
let currentPresetName = "Default";

const gui = new GUI();
const presetFolder = gui.addFolder("Presets");

// Add parameter controllers
gui.add(params, "size", 0, 5);
gui.add(params, "speed", 0, 2);
gui.add(params, "color");

// Preset management functions
function refreshPresetDropdown() {
  // Remove existing dropdown
  presetFolder.controllers.forEach((ctrl) => presetFolder.remove(ctrl));

  // Create new dropdown with updated presets
  presetFolder
    .add({ preset: currentPresetName }, "preset", Object.keys(presets))
    .name("Preset")
    .onChange((value) => {
      currentPresetName = value;
      Object.assign(params, presets[value]);
    });

  // Add Save and Delete buttons
  presetFolder
    .add(
      {
        save: () => {
          const presetName = prompt("Enter preset name:", currentPresetName);
          if (presetName) {
            presets[presetName] = { ...params };
            currentPresetName = presetName;
            refreshPresetDropdown();
          }
        },
        delete: () => {
          if (
            currentPresetName !== "Default" &&
            confirm(`Delete preset "${currentPresetName}"?`)
          ) {
            delete presets[currentPresetName];
            currentPresetName = "Default";
            Object.assign(params, presets.Default);
            refreshPresetDropdown();
          }
        },
      },
      "save"
    )
    .name("Save Preset");

  presetFolder.add({}, "delete").name("Delete Preset");

  presetFolder.open();
}

// Initial setup
refreshPresetDropdown();
