#include "ConfigWeb.h"

#include <Arduino.h>
#include <WebServer.h>

static WebServer gServer(80);
static SimConfig *gConfig = nullptr;
static bool gGridDirty = false;

static String BuildConfigJson()
{
  String s = "{";
  s += "\"timeScale\":" + String(gConfig->timeScale, 3) + ",";
  s += "\"particleCount\":" + String(gConfig->particleCount) + ",";
  s += "\"gravityX\":" + String(gConfig->gravityX, 3) + ",";
  s += "\"gravityY\":" + String(gConfig->gravityY, 3) + ",";
  s += "\"touchStrength\":" + String(gConfig->touchStrength, 4) + ",";
  s += "\"touchRadius\":" + String(gConfig->touchRadius, 3) + ",";
  s += "\"maxDensity\":" + String(gConfig->maxDensity, 3) + ",";
  s += "\"collisionRepulsion\":" + String(gConfig->collisionRepulsion, 3) + ",";
  s += "\"turbStrength\":" + String(gConfig->turbStrength, 3) + ",";
  s += "\"targetCellCount\":" + String(gConfig->targetCellCount);
  s += "}";
  return s;
}

static bool SetParam(const String &key, float value)
{
  if (key == "timeScale")
  {
    gConfig->timeScale = constrain(value, 0.1f, 8.0f);
    return true;
  }
  if (key == "particleCount")
  {
    gConfig->particleCount = (uint16_t)constrain((int)value, 50, 300);
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
  if (key == "maxDensity")
  {
    gConfig->maxDensity = constrain(value, 0.1f, 64.0f);
    return true;
  }
  if (key == "collisionRepulsion")
  {
    gConfig->collisionRepulsion = constrain(value, 0.0f, 2.0f);
    return true;
  }
  if (key == "turbStrength")
  {
    gConfig->turbStrength = constrain(value, 0.0f, 2.0f);
    return true;
  }
  if (key == "targetCellCount")
  {
    gConfig->targetCellCount = (uint16_t)constrain((int)value, 32, 512);
    gGridDirty = true;
    return true;
  }
  return false;
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
    .card { background:#1e1e1e; border-radius:10px; padding:12px; margin-bottom:12px; }
    .row { margin:10px 0; }
    label { display:block; font-size:13px; margin-bottom:4px; }
    input[type=range] { width:100%; }
    .val { font-size:12px; opacity:.8; float:right; }
    input[type=number] { width:120px; }
  </style>
</head>
<body>
  <h2>Phase2 Sim Config</h2>
  <div class="card" id="controls"></div>
  <script>
    const defs = [
      ["timeScale",0.1,8,0.01],
      ["particleCount",50,300,1],
      ["gravityX",-2,2,0.01],
      ["gravityY",-2,2,0.01],
      ["touchStrength",0,0.3,0.001],
      ["touchRadius",0.01,1.2,0.005],
      ["maxDensity",0.1,64,0.1],
      ["collisionRepulsion",0,2,0.01],
      ["turbStrength",0,2,0.01],
      ["targetCellCount",32,512,1]
    ];
    const root = document.getElementById("controls");
    const inputs = {};
    defs.forEach(([k,min,max,step]) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<label>${k}<span class="val" id="v_${k}"></span></label>
        <input id="${k}" type="range" min="${min}" max="${max}" step="${step}"/>`;
      root.appendChild(row);
      const el = document.getElementById(k);
      const v = document.getElementById("v_"+k);
      el.addEventListener("input", async () => {
        v.textContent = el.value;
        await fetch(`/api/set?k=${encodeURIComponent(k)}&v=${encodeURIComponent(el.value)}`, {method:"POST"});
      });
      inputs[k] = [el,v];
    });
    async function pull(){
      const r = await fetch("/api/config");
      const c = await r.json();
      Object.keys(inputs).forEach(k => {
        if (c[k] !== undefined){
          inputs[k][0].value = c[k];
          inputs[k][1].textContent = c[k];
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
