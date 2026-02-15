#include "ConfigWeb.h"

#include <Arduino.h>
#include <WebServer.h>

static WebServer gServer(80);
static SimConfig *gConfig = nullptr;
static bool gGridDirty = false;
static bool gRestartRequested = false;

static String BuildConfigJson()
{
  String s = "{";
  s += "\"timeStep\":" + String(gConfig->timeStep, 4) + ",";
  s += "\"timeScale\":" + String(gConfig->timeScale, 3) + ",";
  s += "\"velocityDamping\":" + String(gConfig->velocityDamping, 4) + ",";
  s += "\"maxVelocity\":" + String(gConfig->maxVelocity, 3) + ",";
  s += "\"particleCount\":" + String(gConfig->particleCount) + ",";
  s += "\"particleRadius\":" + String(gConfig->particleRadius, 4) + ",";
  s += "\"restDensity\":" + String(gConfig->restDensity, 3) + ",";
  s += "\"picFlipRatio\":" + String(gConfig->picFlipRatio, 3) + ",";
  s += "\"gravityX\":" + String(gConfig->gravityX, 3) + ",";
  s += "\"gravityY\":" + String(gConfig->gravityY, 3) + ",";
  s += "\"touchStrength\":" + String(gConfig->touchStrength, 4) + ",";
  s += "\"touchRadius\":" + String(gConfig->touchRadius, 3) + ",";
  s += "\"gridMode\":" + String(gConfig->gridMode) + ",";
  s += "\"maxDensity\":" + String(gConfig->maxDensity, 3) + ",";
  s += "\"smoothRateIn\":" + String(gConfig->smoothRateIn, 3) + ",";
  s += "\"smoothRateOut\":" + String(gConfig->smoothRateOut, 3) + ",";
  s += "\"collisionEnabled\":" + String(gConfig->collisionEnabled ? 1 : 0) + ",";
  s += "\"collisionGridSize\":" + String(gConfig->collisionGridSize) + ",";
  s += "\"collisionRepulsion\":" + String(gConfig->collisionRepulsion, 3) + ",";
  s += "\"particleRestitution\":" + String(gConfig->particleRestitution, 3) + ",";
  s += "\"collisionDamping\":" + String(gConfig->collisionDamping, 4) + ",";
  s += "\"boundaryMode\":" + String(gConfig->boundaryMode) + ",";
  s += "\"boundaryShape\":" + String(gConfig->boundaryShape) + ",";
  s += "\"boundaryScale\":" + String(gConfig->boundaryScale, 3) + ",";
  s += "\"boundaryDamping\":" + String(gConfig->boundaryDamping, 3) + ",";
  s += "\"boundaryRestitution\":" + String(gConfig->boundaryRestitution, 3) + ",";
  s += "\"boundaryRepulsion\":" + String(gConfig->boundaryRepulsion, 3) + ",";
  s += "\"boundaryFriction\":" + String(gConfig->boundaryFriction, 3) + ",";
  s += "\"turbStrength\":" + String(gConfig->turbStrength, 3) + ",";
  s += "\"turbScale\":" + String(gConfig->turbScale, 3) + ",";
  s += "\"turbSpeed\":" + String(gConfig->turbSpeed, 3) + ",";
  s += "\"turbRotation\":" + String(gConfig->turbRotation, 3) + ",";
  s += "\"turbRotationSpeed\":" + String(gConfig->turbRotationSpeed, 3) + ",";
  s += "\"turbPullFactor\":" + String(gConfig->turbPullFactor, 3) + ",";
  s += "\"turbAffectPosition\":" + String(gConfig->turbAffectPosition ? 1 : 0) + ",";
  s += "\"turbScaleField\":" + String(gConfig->turbScaleField ? 1 : 0) + ",";
  s += "\"turbAffectScale\":" + String(gConfig->turbAffectScale ? 1 : 0) + ",";
  s += "\"turbMinScale\":" + String(gConfig->turbMinScale, 4) + ",";
  s += "\"turbMaxScale\":" + String(gConfig->turbMaxScale, 4) + ",";
  s += "\"turbPatternStyle\":" + String(gConfig->turbPatternStyle) + ",";
  s += "\"turbDecayRate\":" + String(gConfig->turbDecayRate, 3) + ",";
  s += "\"turbDirectionBiasX\":" + String(gConfig->turbDirectionBiasX, 3) + ",";
  s += "\"turbDirectionBiasY\":" + String(gConfig->turbDirectionBiasY, 3) + ",";
  s += "\"turbContrast\":" + String(gConfig->turbContrast, 3) + ",";
  s += "\"turbBiasStrength\":" + String(gConfig->turbBiasStrength, 3) + ",";
  s += "\"turbPatternFrequency\":" + String(gConfig->turbPatternFrequency, 3) + ",";
  s += "\"turbSeparation\":" + String(gConfig->turbSeparation, 3) + ",";
  s += "\"turbDomainWarp\":" + String(gConfig->turbDomainWarp, 3) + ",";
  s += "\"turbDomainWarpSpeed\":" + String(gConfig->turbDomainWarpSpeed, 3) + ",";
  s += "\"turbSymmetryAmount\":" + String(gConfig->turbSymmetryAmount, 3) + ",";
  s += "\"turbPhase\":" + String(gConfig->turbPhase, 3) + ",";
  s += "\"turbPhaseSpeed\":" + String(gConfig->turbPhaseSpeed, 3) + ",";
  s += "\"turbBlurAmount\":" + String(gConfig->turbBlurAmount, 3) + ",";
  s += "\"targetCellCount\":" + String(gConfig->targetCellCount) + ",";
  s += "\"gridGap\":" + String(gConfig->gridGap) + ",";
  s += "\"theme\":" + String(gConfig->theme) + ",";
  s += "\"gridAspectRatio\":" + String(gConfig->gridAspectRatio, 3) + ",";
  s += "\"gridScale\":" + String(gConfig->gridScale, 3) + ",";
  s += "\"gridAllowCut\":" + String(gConfig->gridAllowCut) + ",";
  s += "\"gridCenterOffsetX\":" + String(gConfig->gridCenterOffsetX) + ",";
  s += "\"gridCenterOffsetY\":" + String(gConfig->gridCenterOffsetY) + ",";
  s += "\"shadowIntensity\":" + String(gConfig->shadowIntensity, 3) + ",";
  s += "\"shadowThreshold\":" + String(gConfig->shadowThreshold, 3) + ",";
  s += "\"shadowBlurAmount\":" + String(gConfig->shadowBlurAmount, 3) + ",";
  s += "\"particleColorWhite\":" + String(gConfig->particleColorWhite ? 1 : 0) + ",";
  s += "\"particleOpacity\":" + String(gConfig->particleOpacity, 3);
  s += "}";
  return s;
}

static bool SetParam(const String &key, float value)
{
  if (key == "timeStep")
  {
    gConfig->timeStep = constrain(value, 0.001f, 0.05f);
    return true;
  }
  if (key == "timeScale")
  {
    gConfig->timeScale = constrain(value, 0.1f, 8.0f);
    return true;
  }
  if (key == "velocityDamping")
  {
    gConfig->velocityDamping = constrain(value, 0.8f, 1.0f);
    return true;
  }
  if (key == "maxVelocity")
  {
    gConfig->maxVelocity = constrain(value, 0.1f, 8.0f);
    return true;
  }
  if (key == "particleCount")
  {
    gConfig->particleCount = (uint16_t)constrain((int)value, 2, 200);
    return true;
  }
  if (key == "particleRadius")
  {
    gConfig->particleRadius = constrain(value, 0.002f, 0.15f);
    return true;
  }
  if (key == "restDensity")
  {
    gConfig->restDensity = constrain(value, 0.0f, 40.0f);
    return true;
  }
  if (key == "picFlipRatio")
  {
    gConfig->picFlipRatio = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "gravityX")
  {
    gConfig->gravityX = constrain(value, -2.0f, 2.0f);
    return true;
  }
  if (key == "gravityY")
  {
    gConfig->gravityY = constrain(value, -2.0f, 2.0f);
    return true;
  }
  if (key == "touchStrength")
  {
    gConfig->touchStrength = constrain(value, 0.0f, 0.3f);
    return true;
  }
  if (key == "touchRadius")
  {
    gConfig->touchRadius = constrain(value, 0.01f, 1.2f);
    return true;
  }
  if (key == "gridMode")
  {
    gConfig->gridMode = (uint8_t)constrain((int)value, 0, 8);
    return true;
  }
  if (key == "maxDensity")
  {
    gConfig->maxDensity = constrain(value, 0.1f, 8.0f);
    return true;
  }
  if (key == "smoothRateIn")
  {
    gConfig->smoothRateIn = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "smoothRateOut")
  {
    gConfig->smoothRateOut = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "collisionRepulsion")
  {
    gConfig->collisionRepulsion = constrain(value, 0.0f, 2.0f);
    return true;
  }
  if (key == "collisionEnabled")
  {
    gConfig->collisionEnabled = value >= 0.5f;
    return true;
  }
  if (key == "collisionGridSize")
  {
    gConfig->collisionGridSize = (uint8_t)constrain((int)value, 4, 16);
    return true;
  }
  if (key == "particleRestitution")
  {
    gConfig->particleRestitution = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "collisionDamping")
  {
    gConfig->collisionDamping = constrain(value, 0.8f, 1.0f);
    return true;
  }
  if (key == "boundaryMode")
  {
    gConfig->boundaryMode = (uint8_t)constrain((int)value, 0, 1);
    return true;
  }
  if (key == "boundaryShape")
  {
    gConfig->boundaryShape = (uint8_t)constrain((int)value, 0, 1);
    gGridDirty = true;
    return true;
  }
  if (key == "boundaryScale")
  {
    gConfig->boundaryScale = constrain(value, 0.6f, 1.2f);
    gGridDirty = true;
    return true;
  }
  if (key == "boundaryDamping")
  {
    gConfig->boundaryDamping = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "boundaryRestitution")
  {
    gConfig->boundaryRestitution = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "boundaryRepulsion")
  {
    gConfig->boundaryRepulsion = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "boundaryFriction")
  {
    gConfig->boundaryFriction = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "turbStrength")
  {
    gConfig->turbStrength = constrain(value, 0.0f, 20.0f);
    return true;
  }
  if (key == "turbScale")
  {
    gConfig->turbScale = constrain(value, 0.1f, 10.0f);
    return true;
  }
  if (key == "turbSpeed")
  {
    gConfig->turbSpeed = constrain(value, 0.0f, 2.0f);
    return true;
  }
  if (key == "turbRotation")
  {
    gConfig->turbRotation = constrain(value, 0.0f, 6.2831853f);
    return true;
  }
  if (key == "turbRotationSpeed")
  {
    gConfig->turbRotationSpeed = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "turbPullFactor")
  {
    gConfig->turbPullFactor = constrain(value, -1.0f, 1.0f);
    return true;
  }
  if (key == "turbAffectPosition")
  {
    gConfig->turbAffectPosition = value >= 0.5f;
    return true;
  }
  if (key == "turbScaleField")
  {
    gConfig->turbScaleField = value >= 0.5f;
    return true;
  }
  if (key == "turbAffectScale")
  {
    gConfig->turbAffectScale = value >= 0.5f;
    return true;
  }
  if (key == "turbMinScale")
  {
    gConfig->turbMinScale = constrain(value, 0.005f, 0.015f);
    return true;
  }
  if (key == "turbMaxScale")
  {
    gConfig->turbMaxScale = constrain(value, 0.015f, 0.03f);
    return true;
  }
  if (key == "turbPatternStyle")
  {
    gConfig->turbPatternStyle = (uint8_t)constrain((int)value, 0, 14);
    return true;
  }
  if (key == "turbDecayRate")
  {
    gConfig->turbDecayRate = constrain(value, 0.9f, 1.0f);
    return true;
  }
  if (key == "turbDirectionBiasX")
  {
    gConfig->turbDirectionBiasX = constrain(value, -1.0f, 1.0f);
    return true;
  }
  if (key == "turbDirectionBiasY")
  {
    gConfig->turbDirectionBiasY = constrain(value, -1.0f, 1.0f);
    return true;
  }
  if (key == "turbContrast")
  {
    gConfig->turbContrast = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "turbBiasStrength")
  {
    gConfig->turbBiasStrength = constrain(value, 0.0f, 2.0f);
    return true;
  }
  if (key == "turbPatternFrequency")
  {
    gConfig->turbPatternFrequency = constrain(value, 0.1f, 10.0f);
    return true;
  }
  if (key == "turbSeparation")
  {
    gConfig->turbSeparation = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "turbDomainWarp")
  {
    gConfig->turbDomainWarp = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "turbDomainWarpSpeed")
  {
    gConfig->turbDomainWarpSpeed = constrain(value, 0.0f, 2.0f);
    return true;
  }
  if (key == "turbSymmetryAmount")
  {
    gConfig->turbSymmetryAmount = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "turbPhase")
  {
    gConfig->turbPhase = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "turbPhaseSpeed")
  {
    gConfig->turbPhaseSpeed = constrain(value, -1.0f, 1.0f);
    return true;
  }
  if (key == "turbBlurAmount")
  {
    gConfig->turbBlurAmount = constrain(value, 0.0f, 2.0f);
    return true;
  }
  if (key == "targetCellCount")
  {
    gConfig->targetCellCount = (uint16_t)constrain((int)value, 32, 512);
    gGridDirty = true;
    return true;
  }
  if (key == "gridGap")
  {
    gConfig->gridGap = (uint8_t)constrain((int)value, 0, 8);
    gGridDirty = true;
    return true;
  }
  if (key == "theme")
  {
    gConfig->theme = (uint8_t)constrain((int)value, 0, 10);
    return true;
  }
  if (key == "gridAspectRatio")
  {
    gConfig->gridAspectRatio = constrain(value, 0.2f, 5.0f);
    gGridDirty = true;
    return true;
  }
  if (key == "gridScale")
  {
    gConfig->gridScale = constrain(value, 0.5f, 1.0f);
    gGridDirty = true;
    return true;
  }
  if (key == "gridAllowCut")
  {
    gConfig->gridAllowCut = (uint8_t)constrain((int)value, 0, 3);
    gGridDirty = true;
    return true;
  }
  if (key == "gridCenterOffsetX")
  {
    gConfig->gridCenterOffsetX = (int8_t)constrain((int)value, -100, 100);
    gGridDirty = true;
    return true;
  }
  if (key == "gridCenterOffsetY")
  {
    gConfig->gridCenterOffsetY = (int8_t)constrain((int)value, -100, 100);
    gGridDirty = true;
    return true;
  }
  if (key == "shadowIntensity")
  {
    gConfig->shadowIntensity = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "shadowThreshold")
  {
    gConfig->shadowThreshold = constrain(value, 0.0f, 0.5f);
    return true;
  }
  if (key == "shadowBlurAmount")
  {
    gConfig->shadowBlurAmount = constrain(value, 0.0f, 1.0f);
    return true;
  }
  if (key == "particleColorWhite")
  {
    gConfig->particleColorWhite = value >= 0.5f;
    return true;
  }
  if (key == "particleOpacity")
  {
    gConfig->particleOpacity = constrain(value, 0.0f, 1.0f);
    return true;
  }
  return false;
}

void ResetConfigToDefaults()
{
  if (!gConfig) return;
  
  // Create a temporary default config and copy it
  SimConfig defaultConfig;
  *gConfig = defaultConfig;
  gGridDirty = true;
}

static const char kIndexHtml[] PROGMEM = R"HTML(
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Phase2 Sim Config</title>
  <style>
    body { font-family: sans-serif; background:#121212; color:#eee; margin:0; padding:16px; }
    .toolbar { margin-bottom:12px; display:flex; gap:8px; }
    .btn { border:1px solid #444; background:#2a2a2a; color:#eee; border-radius:8px; padding:10px 14px; cursor:pointer; }
    .btn:hover { background:#343434; }
    .btn.danger { border-color:#7a2d2d; background:#552222; }
    .btn.danger:hover { background:#663030; }
    .fold-card { background:#1e1e1e; border-radius:10px; margin-bottom:12px; border:1px solid #2a2a2a; overflow:hidden; }
    .fold-card > summary { list-style:none; cursor:pointer; padding:12px; font-weight:600; background:#202020; user-select:none; }
    .fold-card > summary::-webkit-details-marker { display:none; }
    .fold-card[open] > summary { border-bottom:1px solid #2a2a2a; }
    .card-content { padding:10px 12px 12px 12px; }
    .row { margin:10px 0; }
    label { display:block; font-size:13px; margin-bottom:4px; }
    input[type=range] { width:100%; }
    select { width:100%; background:#2a2a2a; color:#eee; border:1px solid #444; border-radius:6px; padding:8px; }
    .val { font-size:12px; opacity:.8; float:right; }
  </style>
</head>
<body>
  <h2>Phase2 Sim Config</h2>
  <div class="toolbar">
    <button id="restartSimBtn" class="btn danger">Restart Sim</button>
    <button id="resetBtn" class="btn">Reset to Defaults</button>
  </div>
  <div id="controls"></div>
  <script>
    const groupedDefs = [
      ["Simulation", [
        ["timeStep",0.001,0.05,0.001],
        ["timeScale",0.1,8,0.01],
        ["velocityDamping",0.8,1.0,0.001],
        ["maxVelocity",0.1,8,0.1],
        ["particleCount",50,500,1],
        ["particleRadius",0.002,0.05,0.001],
        ["restDensity",0,40,0.1],
        ["picFlipRatio",0,1,0.01]
      ]],
      ["Gravity & Touch", [
        ["gravityX",-2,2,0.01],
        ["gravityY",-2,2,0.01],
        ["touchStrength",0,0.2,0.001],
        ["touchRadius",0.01,1.2,0.005]
      ]],
      ["Rendering & Grid", [
        ["gridMode",0,8,1],
        ["maxDensity",0.1,8,0.01],
        ["smoothRateIn",0,1,0.01],
        ["smoothRateOut",0,1,0.01],
        ["targetCellCount",32,512,1],
        ["gridGap",0,8,1],
        ["theme",0,10,1],
        ["gridAspectRatio",0.2,5,0.01],
        ["gridScale",0.5,1.0,0.001],
        ["gridAllowCut",0,3,1],
        ["gridCenterOffsetX",-100,100,1],
        ["gridCenterOffsetY",-100,100,1],
        ["particleColorWhite",0,1,1],
        ["particleOpacity",0,1,0.01]
      ]],
      ["Boundary", [
        ["boundaryMode",0,1,1],
        ["boundaryScale",0.6,1.2,0.01],
        ["boundaryDamping",0,1,0.01],
        ["boundaryRestitution",0,1,0.05],
        ["boundaryRepulsion",0,1,0.01],
        ["boundaryFriction",0,1,0.01]
      ]],
      ["Collision", [
        ["collisionEnabled",0,1,1],
        ["collisionGridSize",4,16,1],
        ["collisionRepulsion",0,2,0.01],
        ["particleRestitution",0,1,0.05],
        ["collisionDamping",0.8,1.0,0.001]
      ]],
      ["Turbulence", [
        ["turbStrength",0,20,0.5],
        ["turbScale",0.1,10,0.01],
        ["turbSpeed",0,2,0.01],
        ["turbRotation",0,6.2831853,0.01],
        ["turbRotationSpeed",0,1,0.01],
        ["turbPullFactor",-1,1,0.01],
        ["turbAffectPosition",0,1,1],
        ["turbScaleField",0,1,1],
        ["turbAffectScale",0,1,1],
        ["turbMinScale",0.005,0.015,0.001],
        ["turbMaxScale",0.015,0.03,0.001],
        ["turbPatternStyle",0,14,1],
        ["turbDecayRate",0.9,1.0,0.01],
        ["turbDirectionBiasX",-1,1,0.01],
        ["turbDirectionBiasY",-1,1,0.01],
        ["turbContrast",0,1,0.01],
        ["turbBiasStrength",0,2,0.01],
        ["turbPatternFrequency",0.1,10,0.01],
        ["turbSeparation",0,1,0.01],
        ["turbDomainWarp",0,1,0.01],
        ["turbDomainWarpSpeed",0,2,0.1],
        ["turbSymmetryAmount",0,1,0.01],
        ["turbPhase",0,1,0.01],
        ["turbPhaseSpeed",-1,1,0.1],
        ["turbBlurAmount",0,2,0.01]
      ]]
    ];
    const root = document.getElementById("controls");
    const inputs = {};

    const prettyLabel = (key) => key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
      .replace(/_/g, " ");

    const selectorOptions = {
      gridMode: [
        [0, "Noise"],
        [1, "Proximity"],
        [2, "Proximity B"],
        [3, "Density"],
        [4, "Velocity"],
        [5, "Pressure"],
        [6, "Vorticity"],
        [7, "Collision"],
        [8, "Overlap"]
      ],
      theme: [
        [0, "C0"],
        [1, "C1"],
        [2, "C2"],
        [3, "C3"],
        [4, "C4"],
        [5, "C5"],
        [6, "C6"],
        [7, "C7"],
        [8, "C8"],
        [9, "C9"],
        [10, "C10"]
      ]
    };

    groupedDefs.forEach(([groupName, defs], groupIndex) => {
      const card = document.createElement("details");
      card.className = "fold-card";
      card.open = groupIndex < 2;

      const summary = document.createElement("summary");
      summary.textContent = groupName;
      card.appendChild(summary);

      const content = document.createElement("div");
      content.className = "card-content";
      card.appendChild(content);

      defs.forEach(([k,min,max,step]) => {
        const row = document.createElement("div");
        row.className = "row";
        const isSelector = selectorOptions[k] !== undefined;
        if (isSelector) {
          row.innerHTML = `<label>${prettyLabel(k)}<span class="val" id="v_${k}"></span></label>
            <select id="${k}"></select>`;
        } else {
          row.innerHTML = `<label>${prettyLabel(k)}<span class="val" id="v_${k}"></span></label>
            <input id="${k}" type="range" min="${min}" max="${max}" step="${step}"/>`;
        }
        content.appendChild(row);
        const el = row.querySelector(`#${k}`);
        const v = row.querySelector(`#v_${k}`);
        if (isSelector) {
          selectorOptions[k].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = String(value);
            option.textContent = label;
            el.appendChild(option);
          });
          el.addEventListener("change", async () => {
            const selected = selectorOptions[k].find(([value]) => String(value) === el.value);
            v.textContent = selected ? selected[1] : el.value;
            await fetch(`/api/set?k=${encodeURIComponent(k)}&v=${encodeURIComponent(el.value)}`, {method:"POST"});
          });
        } else {
          el.addEventListener("input", async () => {
            v.textContent = el.value;
            await fetch(`/api/set?k=${encodeURIComponent(k)}&v=${encodeURIComponent(el.value)}`, {method:"POST"});
          });
        }
        inputs[k] = [el,v];
      });

      root.appendChild(card);
    });

    const restartBtn = document.getElementById("restartSimBtn");
    restartBtn.addEventListener("click", async () => {
      restartBtn.disabled = true;
      const prevText = restartBtn.textContent;
      restartBtn.textContent = "Restarting...";
      try {
        await fetch("/api/restart", { method: "POST" });
      } finally {
        setTimeout(() => {
          restartBtn.textContent = prevText;
          restartBtn.disabled = false;
        }, 400);
      }
    });

    const resetBtn = document.getElementById("resetBtn");
    resetBtn.addEventListener("click", async () => {
      if (!confirm("Reset all parameters to default values?")) return;
      resetBtn.disabled = true;
      const prevText = resetBtn.textContent;
      resetBtn.textContent = "Resetting...";
      try {
        await fetch("/api/reset", { method: "POST" });
        await pull();
      } finally {
        setTimeout(() => {
          resetBtn.textContent = prevText;
          resetBtn.disabled = false;
        }, 400);
      }
    });

    async function pull(){
      const r = await fetch("/api/config");
      const c = await r.json();
      Object.keys(inputs).forEach(k => {
        if (c[k] !== undefined){
          const [el, valEl] = inputs[k];
          el.value = c[k];
          if (selectorOptions[k]) {
            const selected = selectorOptions[k].find(([value]) => Number(value) === Number(c[k]));
            valEl.textContent = selected ? selected[1] : c[k];
          } else {
            valEl.textContent = c[k];
          }
        }
      });
    }
    pull();
    setInterval(pull, 1500);
  </script>
</body>
</html>
)HTML";

void SetupConfigWeb(SimConfig &config)
{
  gConfig = &config;
  gServer.on("/", HTTP_GET, []() { gServer.send_P(200, "text/html", kIndexHtml); });
  gServer.on("/api/config", HTTP_GET, []() { gServer.send(200, "application/json", BuildConfigJson()); });
  gServer.on("/api/set", HTTP_POST, []() {
    if (!gServer.hasArg("k") || !gServer.hasArg("v"))
    {
      gServer.send(400, "text/plain", "missing k/v");
      return;
    }
    const String key = gServer.arg("k");
    const float value = gServer.arg("v").toFloat();
    if (!SetParam(key, value))
    {
      gServer.send(400, "text/plain", "unknown param");
      return;
    }
    gServer.send(200, "application/json", BuildConfigJson());
  });
  gServer.on("/api/restart", HTTP_POST, []() {
    gRestartRequested = true;
    gServer.send(200, "application/json", "{\"ok\":true}");
  });
  gServer.on("/api/reset", HTTP_POST, []() {
    ResetConfigToDefaults();
    gRestartRequested = true;
    gServer.send(200, "application/json", BuildConfigJson());
  });
  gServer.begin();
  Serial.println("[Phase2] ConfigWeb started on http://192.168.4.1/");
}

void LoopConfigWeb()
{
  gServer.handleClient();
}

bool ConsumeConfigGridDirtyFlag()
{
  bool v = gGridDirty;
  gGridDirty = false;
  return v;
}

bool ConsumeConfigRestartFlag()
{
  bool v = gRestartRequested;
  gRestartRequested = false;
  return v;
}
