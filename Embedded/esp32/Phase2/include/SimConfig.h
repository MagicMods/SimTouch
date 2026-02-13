#ifndef PHASE2_SIMCONFIG_H
#define PHASE2_SIMCONFIG_H

#include <Arduino.h>
#include <stddef.h>

enum ParamType : uint8_t
{
  PARAM_UINT8,
  PARAM_UINT16,
  PARAM_INT8,
  PARAM_FLOAT,
  PARAM_BOOL
};

struct SimConfig
{
  float timeStep = 1.0f / 60.0f;
  float timeScale = 1.0f;
  float velocityDamping = 0.995f;
  float maxVelocity = 2.0f;
  uint16_t particleCount = 200;
  float particleRadius = 0.01f;
  float restDensity = 2.0f;
  float picFlipRatio = 0.0f;

  uint8_t boundaryMode = 0;
  uint8_t boundaryShape = 0;
  float boundaryScale = 1.03f;
  float boundaryDamping = 0.8f;
  float boundaryRestitution = 1.0f;
  float boundaryRepulsion = 0.0f;
  float boundaryFriction = 0.8f;

  float gravityX = 0.0f;
  float gravityY = 0.0f;

  bool collisionEnabled = true;
  uint8_t collisionGridSize = 8;
  float collisionRepulsion = 0.5f;
  float particleRestitution = 0.8f;
  float collisionDamping = 0.98f;

  uint8_t gridMode = 0;
  // Keep idle output darker; touch/forces should drive highlights.
  float maxDensity = 16.0f;
  float smoothRateIn = 0.15f;
  float smoothRateOut = 0.08f;

  uint16_t targetCellCount = 338;
  uint8_t gridGap = 0;
  uint8_t theme = 1;
  float gridAspectRatio = 1.0f;
  float gridScale = 1.0f;
  uint8_t gridAllowCut = 3;
  int8_t gridCenterOffsetX = 0;
  int8_t gridCenterOffsetY = 0;
  float shadowIntensity = 0.17f;
  float shadowThreshold = 0.0f;
  float shadowBlurAmount = 0.23f;

  float touchStrength = 0.1f;
  float touchRadius = 0.6f;
  uint8_t touchMode = 0;

  float imuSensitivity = 0.5f;
  float imuSmoothing = 0.12f;
  // UI gravity is authoritative by default in Phase2.
  bool imuEnabled = false;

  // Turbulence defaults to off so idle scene is calm.
  float turbStrength = 0.0f;
  float turbScale = 6.0f;
  float turbSpeed = 0.8f;
  float turbRotation = 0.0f;
  float turbRotationSpeed = 0.0f;
  float turbPullFactor = 1.0f;
  bool turbAffectPosition = false;
  bool turbScaleField = false;
  bool turbAffectScale = true;
  float turbMinScale = 0.008f;
  float turbMaxScale = 0.03f;
  uint8_t turbPatternStyle = 0;
  float turbDecayRate = 1.0f;
  float turbDirectionBiasX = 0.0f;
  float turbDirectionBiasY = 0.0f;
  float turbContrast = 0.5f;
  float turbBiasStrength = 0.3f;
  float turbPatternFrequency = 2.0f;
  float turbSeparation = 0.0f;
  float turbDomainWarp = 0.0f;
  float turbDomainWarpSpeed = 0.0f;
  float turbSymmetryAmount = 0.0f;
  float turbPhase = 0.0f;
  float turbPhaseSpeed = -1.0f;
  float turbBlurAmount = 0.8f;

  // Placeholders for future particle rendering path on ESP32.
  bool particleColorWhite = true;
  float particleOpacity = 0.1f;
};

struct ParamDef
{
  uint8_t index;
  const char *name;
  const char *group;
  ParamType type;
  float minVal;
  float maxVal;
  float step;
  uint16_t offsetInConfig;
};

static const ParamDef kParamRegistry[] = {
    {54, "Time Step", "Simulation", PARAM_FLOAT, 0.001f, 0.05f, 0.001f, (uint16_t)offsetof(SimConfig, timeStep)},
    {50, "Time Scale", "Simulation", PARAM_FLOAT, 0.1f, 8.0f, 0.01f, (uint16_t)offsetof(SimConfig, timeScale)},
    {51, "Velocity Damping", "Simulation", PARAM_FLOAT, 0.8f, 1.0f, 0.001f, (uint16_t)offsetof(SimConfig, velocityDamping)},
    {52, "Max Velocity", "Simulation", PARAM_FLOAT, 0.1f, 8.0f, 0.1f, (uint16_t)offsetof(SimConfig, maxVelocity)},
    {53, "Particle Count", "Simulation", PARAM_UINT16, 50.0f, 500.0f, 1.0f, (uint16_t)offsetof(SimConfig, particleCount)},
    {55, "Particle Radius", "Simulation", PARAM_FLOAT, 0.002f, 0.05f, 0.001f, (uint16_t)offsetof(SimConfig, particleRadius)},
    {56, "Rest Density", "Simulation", PARAM_FLOAT, 0.0f, 40.0f, 0.1f, (uint16_t)offsetof(SimConfig, restDensity)},
    {57, "PicFlipRatio", "Simulation", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, picFlipRatio)},

    {70, "Boundary Mode", "Boundary", PARAM_UINT8, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, boundaryMode)},
    {71, "Boundary Shape", "Boundary", PARAM_UINT8, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, boundaryShape)},
    {72, "Boundary Scale", "Boundary", PARAM_FLOAT, 0.6f, 1.2f, 0.01f, (uint16_t)offsetof(SimConfig, boundaryScale)},
    {73, "Boundary Damping", "Boundary", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, boundaryDamping)},
    {74, "Boundary Restitution", "Boundary", PARAM_FLOAT, 0.0f, 1.0f, 0.05f, (uint16_t)offsetof(SimConfig, boundaryRestitution)},
    {75, "Boundary Repulsion", "Boundary", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, boundaryRepulsion)},
    {76, "Boundary Friction", "Boundary", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, boundaryFriction)},

    {80, "Gravity X", "Gravity", PARAM_FLOAT, -2.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, gravityX)},
    {81, "Gravity Y", "Gravity", PARAM_FLOAT, -2.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, gravityY)},

    {90, "Collision Enabled", "Collision", PARAM_BOOL, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, collisionEnabled)},
    {91, "Collision Grid Size", "Collision", PARAM_UINT8, 4.0f, 16.0f, 1.0f, (uint16_t)offsetof(SimConfig, collisionGridSize)},
    {92, "Collision Repulsion", "Collision", PARAM_FLOAT, 0.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, collisionRepulsion)},
    {93, "Particle Restitution", "Collision", PARAM_FLOAT, 0.0f, 1.0f, 0.05f, (uint16_t)offsetof(SimConfig, particleRestitution)},
    {94, "Collision Damping", "Collision", PARAM_FLOAT, 0.8f, 1.0f, 0.001f, (uint16_t)offsetof(SimConfig, collisionDamping)},

    {100, "Turb Strength", "Turbulence", PARAM_FLOAT, 0.0f, 20.0f, 0.5f, (uint16_t)offsetof(SimConfig, turbStrength)},
    {101, "Turb Rotation", "Turbulence", PARAM_FLOAT, 0.0f, 6.2831853f, 0.01f, (uint16_t)offsetof(SimConfig, turbRotation)},
    {102, "Turb Rotation Speed", "Turbulence", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbRotationSpeed)},
    {103, "Turb Pull Factor", "Turbulence", PARAM_FLOAT, -1.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbPullFactor)},
    {104, "Turb Affect Position", "Turbulence", PARAM_BOOL, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, turbAffectPosition)},
    {105, "Turb Scale Field", "Turbulence", PARAM_BOOL, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, turbScaleField)},
    {106, "Turb Affect Scale", "Turbulence", PARAM_BOOL, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, turbAffectScale)},
    {107, "Turb Min Scale", "Turbulence", PARAM_FLOAT, 0.005f, 0.015f, 0.001f, (uint16_t)offsetof(SimConfig, turbMinScale)},
    {108, "Turb Max Scale", "Turbulence", PARAM_FLOAT, 0.015f, 0.03f, 0.001f, (uint16_t)offsetof(SimConfig, turbMaxScale)},
    {109, "Turb Pattern Style", "Turbulence", PARAM_UINT8, 0.0f, 14.0f, 1.0f, (uint16_t)offsetof(SimConfig, turbPatternStyle)},
    {110, "Turb Decay Rate", "Turbulence", PARAM_FLOAT, 0.9f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbDecayRate)},
    {111, "Turb Direction Bias X", "Turbulence", PARAM_FLOAT, -1.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbDirectionBiasX)},
    {112, "Turb Direction Bias Y", "Turbulence", PARAM_FLOAT, -1.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbDirectionBiasY)},
    {113, "Turb Contrast", "Turbulence", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbContrast)},
    {114, "Turb Bias Strength", "Turbulence", PARAM_FLOAT, 0.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbBiasStrength)},
    {115, "Turb Pattern Frequency", "Turbulence", PARAM_FLOAT, 0.1f, 10.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbPatternFrequency)},
    {116, "Turb Separation", "Turbulence", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbSeparation)},
    {117, "Turb Domain Warp", "Turbulence", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbDomainWarp)},
    {118, "Turb Domain Warp Speed", "Turbulence", PARAM_FLOAT, 0.0f, 2.0f, 0.1f, (uint16_t)offsetof(SimConfig, turbDomainWarpSpeed)},
    {119, "Turb Symmetry Amount", "Turbulence", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbSymmetryAmount)},
    {160, "Turb Scale", "Turbulence", PARAM_FLOAT, 0.1f, 10.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbScale)},
    {161, "Turb Speed", "Turbulence", PARAM_FLOAT, 0.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbSpeed)},

    {120, "Touch Strength", "Touch", PARAM_FLOAT, 0.0f, 0.2f, 0.001f, (uint16_t)offsetof(SimConfig, touchStrength)},
    {121, "Touch Radius", "Touch", PARAM_FLOAT, 0.01f, 1.2f, 0.005f, (uint16_t)offsetof(SimConfig, touchRadius)},
    {122, "Touch Mode", "Touch", PARAM_UINT8, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, touchMode)},
    {130, "IMU Sensitivity", "IMU", PARAM_FLOAT, 0.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, imuSensitivity)},
    {131, "IMU Smoothing", "IMU", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, imuSmoothing)},
    {132, "IMU Enabled", "IMU", PARAM_BOOL, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, imuEnabled)},
    {140, "Grid Mode", "Rendering", PARAM_UINT8, 0.0f, 8.0f, 1.0f, (uint16_t)offsetof(SimConfig, gridMode)},
    {141, "Max Density", "Rendering", PARAM_FLOAT, 0.1f, 8.0f, 0.01f, (uint16_t)offsetof(SimConfig, maxDensity)},
    {142, "Smooth In", "Rendering", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, smoothRateIn)},
    {143, "Smooth Out", "Rendering", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, smoothRateOut)},
    {144, "Target Cell Count", "Rendering", PARAM_UINT16, 32.0f, 512.0f, 1.0f, (uint16_t)offsetof(SimConfig, targetCellCount)},
    {145, "Grid Gap", "Rendering", PARAM_UINT8, 0.0f, 8.0f, 1.0f, (uint16_t)offsetof(SimConfig, gridGap)},
    {146, "Theme", "Rendering", PARAM_UINT8, 0.0f, 10.0f, 1.0f, (uint16_t)offsetof(SimConfig, theme)},
    {147, "Grid Aspect Ratio", "Rendering", PARAM_FLOAT, 0.2f, 5.0f, 0.01f, (uint16_t)offsetof(SimConfig, gridAspectRatio)},
    {148, "Grid Scale", "Rendering", PARAM_FLOAT, 0.5f, 1.0f, 0.001f, (uint16_t)offsetof(SimConfig, gridScale)},
    {149, "Grid Allow Cut", "Rendering", PARAM_UINT8, 0.0f, 3.0f, 1.0f, (uint16_t)offsetof(SimConfig, gridAllowCut)},
    {150, "Grid Center Offset X", "Rendering", PARAM_INT8, -100.0f, 100.0f, 1.0f, (uint16_t)offsetof(SimConfig, gridCenterOffsetX)},
    {151, "Grid Center Offset Y", "Rendering", PARAM_INT8, -100.0f, 100.0f, 1.0f, (uint16_t)offsetof(SimConfig, gridCenterOffsetY)},
    {152, "Particle Color White", "Rendering", PARAM_BOOL, 0.0f, 1.0f, 1.0f, (uint16_t)offsetof(SimConfig, particleColorWhite)},
    {153, "Particle Opacity", "Rendering", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, particleOpacity)},
    {154, "Shadow Intensity", "Rendering", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, shadowIntensity)},
    {155, "Shadow Threshold", "Rendering", PARAM_FLOAT, 0.0f, 0.5f, 0.01f, (uint16_t)offsetof(SimConfig, shadowThreshold)},
    {156, "Shadow Blur Amount", "Rendering", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, shadowBlurAmount)},
    {157, "Turb Phase", "Turbulence", PARAM_FLOAT, 0.0f, 1.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbPhase)},
    {158, "Turb Phase Speed", "Turbulence", PARAM_FLOAT, -1.0f, 1.0f, 0.1f, (uint16_t)offsetof(SimConfig, turbPhaseSpeed)},
    {159, "Turb Blur Amount", "Turbulence", PARAM_FLOAT, 0.0f, 2.0f, 0.01f, (uint16_t)offsetof(SimConfig, turbBlurAmount)},
};

static constexpr size_t kParamRegistryCount = sizeof(kParamRegistry) / sizeof(kParamRegistry[0]);

#endif
