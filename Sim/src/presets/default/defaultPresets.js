export const defaultPresets = {
  "_meta": {
    "version": "1.0",
    "exportDate": "2025-04-28T16:26:45.500Z",
    "appName": "SimTouch"
  },
  "presets": {
    "turbulence": {
      "Default": {
        "controllers": {}
      },
      "Vex": {
        "controllers": {
          "T-AfPosition": false,
          "T-AfScaleF": false,
          "T-AfScale": true,
          "T-Strength": 9.57,
          "T-Scale": 2.3200000000000003,
          "T-Speed": 1.386,
          "T-Min Size": 0.008,
          "T-Max Size": 0.028,
          "T-Rot": 1.03672557568463,
          "T-RotSpd": 0.076,
          "T-Decay": 0.99,
          "T-DirX": 0,
          "T-DirY": 0,
          "T-DomWarp": 0,
          "T-DomWarpSp": 0,
          "T-Pull Mode": -0.9778198072098548,
          "T-PatternStyle": "fractal",
          "T-Freq": 1.18,
          "T-PhaseSp": -1,
          "T-Phase": 0,
          "T-Symmetry": 0,
          "T-Blur": 0.68,
          "T-OffsetX": 0.5,
          "T-OffsetY": -0.5,
          "T-BiasX Spd": 0,
          "T-BiasY Spd": 0,
          "T-Bias Amt": 0.3,
          "T-Contrast": 0.5,
          "T-Quantize": 0
        }
      }
    },
    "voronoi": {
      "Default": {
        "controllers": {}
      },
      "None": {
        "voronoi": {
          "controllers": [
            {
              "property": "strength",
              "value": 0
            }
          ]
        }
      },
      "Max": {
        "controllers": {
          "V-Strength": 10,
          "V-CellSpeed": 4,
          "V-EdgeWidth": 50,
          "V-Attract": 8,
          "V-CellCount": 10,
          "V-Decay": 1
        }
      },
      "Zero": {
        "controllers": {
          "V-Strength": 0,
          "V-CellSpeed": 0,
          "V-EdgeWidth": 0.1,
          "V-Attract": 0,
          "V-CellCount": 1,
          "V-Decay": 0.9
        }
      },
      "Test": {
        "controllers": {
          "V-Strength": 5.27,
          "V-CellSpeed": 2.04,
          "V-EdgeWidth": 29.3412,
          "V-Attract": 4.08,
          "V-CellCount": 5,
          "V-Decay": 0.946
        }
      }
    },
    "organic": {
      "Default": {
        "controllers": {}
      },
    },
    "pulse": {
      "None": {
        "modulators": []
      },
      "BoundaryPulse": {
        "modulators": [
          {
            "type": "sine",
            "enabled": true,
            "frequency": 1,
            "amplitude": 1,
            "phase": 0,
            "waveform": "sine",
            "min": 0.3,
            "max": 0.55,
            "targetName": "B-Size",
            "sync": true
          }
        ]
      },
      "PullMode": {
        "modulators": [
          {
            "type": "sine",
            "enabled": true,
            "frequency": 1,
            "amplitude": 1,
            "phase": 0,
            "waveform": "sine",
            "min": -1,
            "max": 1,
            "targetName": "T-Pull Mode",
            "sync": true
          }
        ]
      },
      " Joystick": {
        "modulators": [
          {
            "type": "sine",
            "enabled": true,
            "frequency": 0.64,
            "amplitude": 1,
            "phase": 0,
            "waveform": "sine",
            "min": -1,
            "max": 0.55,
            "targetName": "Joystick X",
            "sync": true
          },
          {
            "type": "sine",
            "enabled": true,
            "frequency": 0.64,
            "amplitude": 1,
            "phase": 1.70902640355285,
            "waveform": "sine",
            "min": -1,
            "max": 0.62,
            "targetName": "Joystick Y",
            "sync": true
          }
        ]
      },
      "T-PatternStyle": {
        "modulators": [
          {
            "type": "triangle",
            "enabled": true,
            "frequency": 1,
            "amplitude": 1,
            "phase": 0,
            "waveform": "sine",
            "min": 0,
            "max": 14,
            "targetName": "T-PatternStyle",
            "sync": true
          }
        ]
      },
      "RestState": {
        "modulators": [
          {
            "type": "sawtooth",
            "enabled": true,
            "frequency": 1,
            "amplitude": 1,
            "phase": 0,
            "waveform": "sine",
            "min": 0,
            "max": 3,
            "targetName": "C-RestState",
            "sync": true,
            "frequencyBpm": 85
          }
        ]
      },
      "Joystick": {
        "modulators": [
          {
            "type": "sine",
            "enabled": false,
            "frequency": 1,
            "amplitude": 1,
            "phase": 0,
            "waveform": "sine",
            "min": -1,
            "max": 1,
            "targetName": "J-X",
            "beatDivision": "2",
            "frequencyBpm": 32
          },
          {
            "type": "sine",
            "enabled": false,
            "frequency": 1,
            "amplitude": 1,
            "phase": 1.70902640355285,
            "waveform": "sine",
            "min": -1,
            "max": 1,
            "targetName": "J-Y",
            "beatDivision": "4",
            "frequencyBpm": 32
          }
        ]
      },
      "T-PhaseST": {
        "modulators": [
          {
            "type": "sawtooth",
            "enabled": false,
            "frequency": 1,
            "amplitude": 1,
            "phase": 0,
            "waveform": "sine",
            "min": 0,
            "max": 1,
            "targetName": "T-Phase",
            "beatDivision": "1",
            "frequencyBpm": 60
          }
        ]
      }
    },
    "input": {
      "Default": {
        "modulators": []
      },
      "Test_01": {
        "enabled": true,
        "sensitivity": 5.1,
        "modulators": [
          {
            "type": "input",
            "inputSource": "mic",
            "enabled": true,
            "frequencyBand": "custom",
            "sensitivity": 1,
            "smoothing": 0.88,
            "threshold": 0,
            "min": 0,
            "max": 1,
            "targetName": "T-RotSpd",
            "customFreq": 2240,
            "customWidth": 270
          },
          {
            "type": "input",
            "inputSource": "mic",
            "enabled": true,
            "frequencyBand": "bass",
            "sensitivity": 0.5,
            "smoothing": 0.33,
            "threshold": 0,
            "min": 10,
            "max": 3.81,
            "targetName": "Density",
            "customFreq": 1000,
            "customWidth": 100
          },
          {
            "type": "input",
            "inputSource": "mic",
            "enabled": true,
            "frequencyBand": "highMid",
            "sensitivity": 1,
            "smoothing": 0.7,
            "threshold": 0,
            "min": 1.19,
            "max": 4,
            "targetName": "SimSpeed",
            "customFreq": 1000,
            "customWidth": 100
          }
        ]
      },
      "Test": {
        "enabled": true,
        "sensitivity": 1,
        "modulators": [
          {
            "type": "input",
            "inputSource": "mic",
            "enabled": true,
            "frequencyBand": "lowMid",
            "sensitivity": 0.97,
            "smoothing": 0.7,
            "threshold": 0,
            "min": 0.01,
            "max": 0.5,
            "targetName": "FadOutSpd",
            "customFreq": 1000,
            "customWidth": 100
          }
        ]
      },
      "T-Blur": {
        "enabled": true,
        "sensitivity": 5,
        "modulators": [
          {
            "type": "input",
            "inputSource": "mic",
            "enabled": true,
            "frequencyBand": "Mid",
            "sensitivity": 0.55,
            "smoothing": 0.7,
            "attack": 0,
            "release": 0.9,
            "threshold": 0.28,
            "min": 1.68,
            "max": 0,
            "targetName": "T-Blur",
            "customFreq": 1000,
            "customWidth": 100
          }
        ]
      },
      "Jarred": {
        "enabled": true,
        "sensitivity": 8.9,
        "modulators": [
          {
            "type": "input",
            "inputSource": "mic",
            "enabled": true,
            "frequencyBand": "Presence",
            "sensitivity": 0.37,
            "smoothing": 0.7,
            "attack": 0.3,
            "release": 0.7,
            "threshold": 0,
            "min": 7.59,
            "max": 1.6,
            "targetName": "Density",
            "customFreq": 1000,
            "customWidth": 100
          },
          {
            "type": "input",
            "inputSource": "mic",
            "enabled": true,
            "frequencyBand": "Custom",
            "sensitivity": 0.3,
            "smoothing": 0.7,
            "attack": 0.56,
            "release": 0,
            "threshold": 0.47,
            "min": 0,
            "max": 1,
            "targetName": "T-Phase",
            "customFreq": 1000,
            "customWidth": 100
          },
          {
            "type": "input",
            "inputSource": "mic",
            "enabled": true,
            "frequencyBand": "None",
            "sensitivity": 1,
            "smoothing": 0.7,
            "attack": 0.3,
            "release": 0.7,
            "threshold": 0,
            "min": 0,
            "max": 10,
            "targetName": "T-Strength",
            "customFreq": 1000,
            "customWidth": 100
          }
        ]
      }
    },
    "randomizer": {
      "None": {
        "paramTargets": {}
      },
      "All": {
        "paramTargets": {}
      },
      "Particles": {
        "controllers": {
          "Mode": false,
          "Boundary": false,
          "Density": false,
          "FadInSpd": false,
          "FadOutSpd": false,
          "SimSpeed": false,
          "VeloDamp": false,
          "MaxVelocity": false,
          "PicFlipRatio": false,
          "P-Count": true,
          "P-Size": true,
          "P-Opacity": false,
          "G-X": false,
          "G-Y": false,
          "C-Repulse": false,
          "C-Bounce": false,
          "C-Damping": false,
          "C-RestState": false,
          "B-Size": false,
          "B-Repulse": false,
          "B-Friction": false,
          "B-Bounce": false,
          "T-AfPosition": false,
          "T-AfScaleF": false,
          "T-AfScale": false,
          "T-Strength": false,
          "T-Scale": false,
          "T-Speed": false,
          "T-Min Size": false,
          "T-Max Size": false,
          "T-Rot": false,
          "T-RotSpd": false,
          "T-Decay": false,
          "T-DirX": false,
          "T-DirY": false,
          "T-DomWarp": false,
          "T-DomWarpSp": false,
          "T-Pull Mode": false,
          "T-PatternStyle": false,
          "T-Freq": false,
          "T-PhaseSp": false,
          "T-Phase": false,
          "T-Blur": false,
          "T-OffsetX": false,
          "T-OffsetY": false,
          "T-BiasX": false,
          "T-BiasY": false,
          "T-Bias Friction": false,
          "T-Symetry": false,
          "V-Strength": false,
          "V-CellSpeed": false,
          "V-EdgeWidth": false,
          "V-Attract": false,
          "V-CellCount": false,
          "V-Decay": false,
          "V-Pull Mode": false,
          "O-Force": false,
          "O-Radius": false,
          "F-SurfaceT": false,
          "F-Visco": false,
          "F-Damp": false,
          "S-Cohesion": false,
          "S-Align": false,
          "S-Separation": false,
          "S-MaxSpeed": false,
          "A-Repulse": false,
          "A-Attract": false,
          "A-Threshold": false,
          "Ch-LinkDist": false,
          "Ch-LinkStr": false,
          "Ch-Align": false,
          "Ch-Branch": false,
          "Ch-MaxLinks": false,
          "J-X": false,
          "J-Y": false,
          "J-G-Strength": false,
          "J-T-BiasStrength": false
        }
      },
      "Turbulences": {
        "controllers": {
          "Mode": false,
          "Boundary": false,
          "Density": false,
          "FadInSpd": false,
          "FadOutSpd": false,
          "SimSpeed": false,
          "VeloDamp": false,
          "MaxVelocity": false,
          "PicFlipRatio": false,
          "P-Count": false,
          "P-Size": false,
          "P-Opacity": false,
          "G-X": false,
          "G-Y": false,
          "C-Repulse": false,
          "C-Bounce": false,
          "C-Damping": false,
          "C-RestState": false,
          "B-Size": false,
          "B-Repulse": false,
          "B-Friction": false,
          "B-Bounce": false,
          "T-AfPosition": true,
          "T-AfScaleF": false,
          "T-AfScale": true,
          "T-Strength": true,
          "T-Scale": false,
          "T-Speed": true,
          "T-Min Size": false,
          "T-Max Size": false,
          "T-Rot": false,
          "T-RotSpd": false,
          "T-Decay": false,
          "T-DirX": false,
          "T-DirY": false,
          "T-DomWarp": true,
          "T-DomWarpSp": true,
          "T-Pull Mode": false,
          "T-PatternStyle": true,
          "T-Freq": false,
          "T-PhaseSp": true,
          "T-Phase": false,
          "T-Blur": true,
          "T-OffsetX": false,
          "T-OffsetY": false,
          "T-BiasX": false,
          "T-BiasY": false,
          "T-Bias Friction": false,
          "T-Symetry": false,
          "V-Strength": false,
          "V-CellSpeed": false,
          "V-EdgeWidth": false,
          "V-Attract": false,
          "V-CellCount": false,
          "V-Decay": false,
          "V-Pull Mode": false,
          "O-Force": false,
          "O-Radius": false,
          "F-SurfaceT": false,
          "F-Visco": false,
          "F-Damp": false,
          "S-Cohesion": false,
          "S-Align": false,
          "S-Separation": false,
          "S-MaxSpeed": false,
          "A-Repulse": false,
          "A-Attract": false,
          "A-Threshold": false,
          "Ch-LinkDist": false,
          "Ch-LinkStr": false,
          "Ch-Align": false,
          "Ch-Branch": false,
          "Ch-MaxLinks": false,
          "J-X": false,
          "J-Y": false,
          "J-G-Strength": false,
          "J-T-BiasStrength": false
        }
      }
    },
    "grid": {
      "WaveShare | C | 240x240 | 338": {
        "screen": {
          "width": 240,
          "height": 240,
          "shape": "circular"
        },
        "gridSpecs": {
          "targetCellCount": 338,
          "gap": 1,
          "aspectRatio": 1,
          "scale": 1,
          "allowCut": 3,
          "centerOffsetX": 0,
          "centerOffsetY": 0
        },
        "shadow": {
          "shadowIntensity": 0.17,
          "shadowThreshold": 0,
          "blurAmount": 0.23
        },
        "flags": {
          "showGridCells": true,
          "showIndices": false,
          "showCellCenters": false,
          "showBoundary": false
        },
        "colors": {
          "gradientPreset": "c0"
        }
      },
      "WaveShare | R | 170x320 | 338": {
        "screen": {
          "width": 170,
          "height": 320,
          "shape": "rectangular"
        },
        "gridSpecs": {
          "targetCellCount": 338,
          "gap": 1,
          "aspectRatio": 1,
          "scale": 1,
          "allowCut": 0,
          "centerOffsetX": 0,
          "centerOffsetY": 0
        },
        "shadow": {
          "shadowIntensity": 0.17,
          "shadowThreshold": 0,
          "blurAmount": 0.23
        },
        "flags": {
          "showGridCells": true,
          "showIndices": false,
          "showCellCenters": false,
          "showBoundary": false
        },
        "colors": {
          "gradientPreset": "c0"
        }
      }
    },
    "master": {
      "3BouncingBall": {
        "paramUi": {
          "controllers": {
            "Mode": "Velocity",
            "Density": 1.7,
            "FadInSpd": 0.1,
            "FadOutSpd": 0.05,
            "Time Step": 0.032,
            "SimSpeed": 1,
            "PicFlipRatio": 1
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 3,
            "P-Size": 0.05,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.65,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": -1
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 5,
            "C-GridRez": 16,
            "C-Bounce": 1,
            "C-RestDens": 3.6
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.8,
            "B-Bounce": 1
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 4,
            "T-Scale": 3,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "checkerboard",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.8,
            "T-OffsetX": 0.5,
            "T-OffsetY": -0.5,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 0.1,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-X": false,
            "J-Y": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false,
            "Enable External": false,
            "Enable EMU": false
          }
        }
      },
      "CircleSwipe_01": {
        "paramUi": {
          "controllers": {
            "Mode": "--- NOISE ---",
            "Density": 2.1,
            "FadInSpd": 0.15,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 0,
            "P-Size": 0.015,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1.03,
            "B-Repulse": 0.1,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": [
            {
              "type": "sine",
              "enabled": false,
              "frequency": 1,
              "amplitude": 1,
              "phase": 0,
              "waveform": "sine",
              "min": 0.68,
              "max": 2.52,
              "targetName": "T-Scale",
              "beatDivision": "8",
              "frequencyBpm": 60
            }
          ]
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": true,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 4,
            "T-Scale": 2.5174223482260816,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 0.99,
            "T-DirX": -0.00798611111111111,
            "T-DirY": 0,
            "T-DomWarp": 0.253,
            "T-DomWarpSp": 0.9,
            "T-Pull Mode": 1,
            "T-PatternStyle": "dots",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 1.59,
            "T-OffsetX": 0.5,
            "T-OffsetY": -0.5,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "CircleSwipe_02": {
        "paramUi": {
          "controllers": {
            "Mode": "--- NOISE ---",
            "Density": 1.9,
            "FadInSpd": 0.15,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.006,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0.1,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 4,
            "T-Scale": 2.5174223482260816,
            "T-Speed": 1,
            "T-Min Size": 0.006,
            "T-Max Size": 0.03,
            "T-Rot": 5.167848026154519,
            "T-RotSpd": 0.124,
            "T-Decay": 0.99,
            "T-DirX": -0.00798611111111111,
            "T-DirY": 0,
            "T-DomWarp": 0.253,
            "T-DomWarpSp": 0.9,
            "T-Pull Mode": -1,
            "T-PatternStyle": "grid",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.88,
            "T-OffsetX": 0.5,
            "T-OffsetY": -0.5,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Vortex_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 1.8,
            "FadInSpd": 0.17493,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 1
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 389,
            "P-Size": 0.01,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 1.16,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": true,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 10,
            "T-Scale": 1.9999999999999993,
            "T-Speed": 1.03,
            "T-Min Size": 0.008,
            "T-Max Size": 0.025,
            "T-Rot": 6.23471511230597,
            "T-RotSpd": 0.463,
            "T-Decay": 1,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "vortex",
            "T-Freq": 0.76,
            "T-PhaseSp": 0,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Joystick": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 4.4,
            "FadInSpd": 0.15,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.01,
            "P-VeloMax": 1,
            "P-VeloDamp": 0.98,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 2.2133360306353396,
            "G-Y": -2.8088873563729013
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "WARP",
            "B-Scale": 1,
            "B-Repulse": 0.1,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": [
            {
              "type": "sine",
              "enabled": false,
              "frequency": 1,
              "amplitude": 1,
              "phase": 0,
              "waveform": "sine",
              "min": -0.42,
              "max": 0.49,
              "targetName": "J-X",
              "beatDivision": "1",
              "frequencyBpm": 28
            },
            {
              "type": "sine",
              "enabled": false,
              "frequency": 1,
              "amplitude": 1,
              "phase": 0.529,
              "waveform": "sine",
              "min": -0.64,
              "max": 0.63,
              "targetName": "J-Y",
              "beatDivision": "2",
              "frequencyBpm": 28
            }
          ]
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": true,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 4,
            "T-Scale": 3.3000000000000007,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 0.99,
            "T-DirX": 0.22081159072156736,
            "T-DirY": 0.2763214498988407,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "water",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.8,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": -0.005450736081418559,
            "T-BiasY Spd": -0.06701712685748594,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-X": false,
            "J-Y": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Blob_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Collision",
            "Density": 12,
            "FadInSpd": 0.1029,
            "FadOutSpd": 0.04606,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 0.8,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 784,
            "P-Size": 0.01,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 1.19,
            "C-GridRez": 10,
            "C-Bounce": 1,
            "C-RestDens": 19.4
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 1,
            "B-Bounce": 1
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 4,
            "T-Scale": 3.6000000000000005,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "voronoi",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.8,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Gate_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 1.4,
            "FadInSpd": 0.14112,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.015,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 1.6
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 9.57,
            "T-Scale": 2.3200000000000003,
            "T-Speed": 1.386,
            "T-Min Size": 0.008,
            "T-Max Size": 0.028,
            "T-Rot": 1.03672557568463,
            "T-RotSpd": 0.076,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": -1,
            "T-PatternStyle": "fractal",
            "T-Freq": 1.18,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.68,
            "T-OffsetX": 0.5,
            "T-OffsetY": -0.5,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Gate_02": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 3.4,
            "FadInSpd": 0.15,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.015,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 1.6
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0.1,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": [
            {
              "type": "sine",
              "enabled": false,
              "frequency": 1,
              "amplitude": 1,
              "phase": 0,
              "waveform": "sine",
              "min": -1,
              "max": 1,
              "targetName": "T-Pull Mode",
              "beatDivision": "4",
              "frequencyBpm": 60
            }
          ]
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 4.76,
            "T-Scale": 1.52,
            "T-Speed": 1.386,
            "T-Min Size": 0.008,
            "T-Max Size": 0.023,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 0.9999834136273433,
            "T-PatternStyle": "circles",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.89,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Chromo_02": {
        "paramUi": {
          "controllers": {
            "Mode": "--- NOISE ---",
            "Density": 1.9,
            "FadInSpd": 0.14112,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.009,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 1.6
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": true,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 5.54,
            "T-Scale": 3.7200000000000015,
            "T-Speed": 1.386,
            "T-Min Size": 0.008,
            "T-Max Size": 0.017,
            "T-Rot": 3.155806935171736,
            "T-RotSpd": 0.189,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0.205,
            "T-DomWarpSp": 0,
            "T-Pull Mode": -0.7658200212461668,
            "T-PatternStyle": "circles",
            "T-Freq": 1.18,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 1.67,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Chromo_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 4.1,
            "FadInSpd": 0.14112,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 0.5,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.009,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 1.6
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": true,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 5.54,
            "T-Scale": 3.7200000000000015,
            "T-Speed": 1.386,
            "T-Min Size": 0.008,
            "T-Max Size": 0.017,
            "T-Rot": 5.066792242351346,
            "T-RotSpd": 0.189,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0.205,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "waves",
            "T-Freq": 1.18,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 2,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": -0.0037060546875,
            "T-BiasY Spd": 0.0031585693359375,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-X": false,
            "J-Y": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false,
            "Enable External": false,
            "Enable EMU": false
          }
        }
      },
      "Bias_01": {
        "paramUi": {
          "controllers": {
            "Mode": "--- NOISE ---",
            "Density": 1.4,
            "FadInSpd": 0.14112,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 0,
            "P-Size": 0.015,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 1.6
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 7.01,
            "T-Scale": 2.3200000000000003,
            "T-Speed": 1.386,
            "T-Min Size": 0.008,
            "T-Max Size": 0.028,
            "T-Rot": 2.7304589090178957,
            "T-RotSpd": 0.173,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "grid",
            "T-Freq": 1.18,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 1.76,
            "T-OffsetX": 0.5,
            "T-OffsetY": -0.5,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.479,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Peace_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 2.9,
            "FadInSpd": 0.14112,
            "FadOutSpd": 0.08,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 517,
            "P-Size": 0.015,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 1.6
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.95,
            "B-Bounce": 0.8
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 7.01,
            "T-Scale": 9.96,
            "T-Speed": 0.782,
            "T-Min Size": 0.005,
            "T-Max Size": 0.028,
            "T-Rot": 2.921546611572628,
            "T-RotSpd": 0.084,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "waves",
            "T-Freq": 0.25,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0.54,
            "T-Blur": 2,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 1,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 5,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Swarm_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 3.1,
            "FadInSpd": 0.1,
            "FadOutSpd": 0.05,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.008,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.8,
            "B-Bounce": 1
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 0.19,
            "T-Scale": 3,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "waves",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.8,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "Swarm",
            "O-Force": 3.505,
            "O-Radius": 66.405,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 2,
            "S-Align": 2,
            "S-Separation": 1.48,
            "S-MaxSpeed": 0.763,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "AutomataRing": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 3.1,
            "FadInSpd": 0.1,
            "FadOutSpd": 0.05,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.008,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.11,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2.2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.8,
            "B-Bounce": 1
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": true,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 0,
            "T-Scale": 3,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0.35,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "ripples",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0.45,
            "T-Blur": 0.8,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "Automata",
            "O-Force": 3.505,
            "O-Radius": 11.97,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 2,
            "S-Align": 2,
            "S-Separation": 1.48,
            "S-MaxSpeed": 0.763,
            "A-Repulse": 0,
            "A-Attract": 7.71,
            "A-Threshold": 0.135,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Automata_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 3.1,
            "FadInSpd": 0.1,
            "FadOutSpd": 0.05,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.008,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.11,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2.2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.8,
            "B-Bounce": 1
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": true,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 0,
            "T-Scale": 3,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "voronoi",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.8,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "Automata",
            "O-Force": 3.505,
            "O-Radius": 11.97,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 2,
            "S-Align": 2,
            "S-Separation": 1.48,
            "S-MaxSpeed": 0.763,
            "A-Repulse": 0,
            "A-Attract": 7.71,
            "A-Threshold": 0.135,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "FluxCapacitor_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 4.5,
            "FadInSpd": 0.1,
            "FadOutSpd": 0.05,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.01,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.8,
            "B-Bounce": 1
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": true,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 2.36,
            "T-Scale": 0.67,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0.092,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": -1,
            "T-PatternStyle": "checkerboard",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0.5,
            "T-Blur": 2,
            "T-OffsetX": 0.5,
            "T-OffsetY": -0.5,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 0.1,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Ring_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Proximity",
            "Density": 2.1,
            "FadInSpd": 0.1,
            "FadOutSpd": 0.05,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 0
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 500,
            "P-Size": 0.01,
            "P-VeloMax": 1,
            "P-VeloDamp": 1,
            "P-Opacity": 0.1,
            "P-Color": "FFFFFF"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 0.5,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 2
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "BOUNCE",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.8,
            "B-Bounce": 1
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": true,
            "T-Strength": 4,
            "T-Scale": 3,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 1,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "ripples",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.8,
            "T-OffsetX": 0,
            "T-OffsetY": 0,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "None",
            "O-Force": 0.1,
            "O-Radius": 30,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false
          }
        }
      },
      "Chain_01": {
        "paramUi": {
          "controllers": {
            "Mode": "Velocity",
            "Density": 0.4,
            "FadInSpd": 0.1,
            "FadOutSpd": 0.05,
            "Time Step": 0.016666666666666666,
            "SimSpeed": 1,
            "PicFlipRatio": 1
          }
        },
        "particleUi": {
          "controllers": {
            "P-Count": 146,
            "P-Size": 0.013,
            "P-VeloMax": 1,
            "P-VeloDamp": 0.912,
            "P-Opacity": 0.71,
            "P-Color": "#000000"
          }
        },
        "gravityUi": {
          "controllers": {
            "G-X": 0,
            "G-Y": 0
          }
        },
        "collisionUi": {
          "controllers": {
            "C-Repulse": 1.25,
            "C-GridRez": 10,
            "C-Bounce": 0.8,
            "C-RestDens": 14.1
          }
        },
        "boundaryUi": {
          "controllers": {
            "B-Mode": "WARP",
            "B-Scale": 1,
            "B-Repulse": 0,
            "B-Friction": 0.8,
            "B-Bounce": 1
          }
        },
        "pulseModUi": {
          "modulators": []
        },
        "inputModUi": {
          "enabled": true,
          "sensitivity": 5,
          "modulators": []
        },
        "turbulenceUi": {
          "controllers": {
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": 4,
            "T-Scale": 3,
            "T-Speed": 1,
            "T-Min Size": 0.008,
            "T-Max Size": 0.03,
            "T-Rot": 0,
            "T-RotSpd": 0,
            "T-Decay": 0.99,
            "T-DirX": 0,
            "T-DirY": 0,
            "T-DomWarp": 0,
            "T-DomWarpSp": 0,
            "T-Pull Mode": 1,
            "T-PatternStyle": "checkerboard",
            "T-Freq": 2,
            "T-PhaseSp": -1,
            "T-Phase": 0,
            "T-Symmetry": 0,
            "T-Blur": 0.8,
            "T-OffsetX": 0.5,
            "T-OffsetY": -0.5,
            "T-BiasX Spd": 0,
            "T-BiasY Spd": 0,
            "T-Bias Amt": 0.3,
            "T-Contrast": 0.5,
            "T-Quantize": 0
          }
        },
        "voronoiUi": {
          "controllers": {
            "V-Strength": 0,
            "V-CellSpeed": 0.2,
            "V-EdgeWidth": 0.3,
            "V-Attract": 1,
            "V-CellCount": 10,
            "V-Decay": 0.99,
            "V-Pull Mode": false
          }
        },
        "organicUi": {
          "controllers": {
            "O-Behavior": "Chain",
            "O-Force": 3.66,
            "O-Radius": 48.07,
            "F-SurfaceT": 0.5,
            "F-Visco": 0.2,
            "F-Damp": 0.98,
            "S-Cohesion": 1,
            "S-Align": 0.7,
            "S-Separation": 1.2,
            "S-MaxSpeed": 0.5,
            "A-Repulse": 0.8,
            "A-Attract": 0.5,
            "A-Threshold": 0.2,
            "Ch-LinkDist": 0,
            "Ch-LinkStr": 10,
            "Ch-Align": 0.5,
            "Ch-Branch": 2,
            "Ch-MaxLinks": 10
          }
        },
        "randomizerUi": {
          "controllers": {
            "Mode": false,
            "Density": false,
            "FadInSpd": false,
            "FadOutSpd": false,
            "SimSpeed": false,
            "PicFlipRatio": false,
            "P-Count": false,
            "P-Size": false,
            "P-VeloMax": false,
            "P-VeloDamp": false,
            "P-Opacity": false,
            "P-Color": false,
            "G-X": false,
            "G-Y": false,
            "C-Repulse": false,
            "C-GridRez": false,
            "C-Bounce": false,
            "C-RestDens": false,
            "B-Mode": false,
            "B-Scale": false,
            "B-Repulse": false,
            "B-Friction": false,
            "B-Bounce": false,
            "T-AfPosition": false,
            "T-AfScaleF": false,
            "T-AfScale": false,
            "T-Strength": false,
            "T-Scale": false,
            "T-Speed": false,
            "T-Min Size": false,
            "T-Max Size": false,
            "T-Rot": false,
            "T-RotSpd": false,
            "T-Decay": false,
            "T-DirX": false,
            "T-DirY": false,
            "T-DomWarp": false,
            "T-DomWarpSp": false,
            "T-Pull Mode": false,
            "T-PatternStyle": false,
            "T-Freq": false,
            "T-PhaseSp": false,
            "T-Phase": false,
            "T-Symmetry": false,
            "T-Blur": false,
            "T-OffsetX": false,
            "T-OffsetY": false,
            "T-BiasX Spd": false,
            "T-BiasY Spd": false,
            "T-Bias Amt": false,
            "T-Contrast": false,
            "T-Quantize": false,
            "V-Strength": false,
            "V-CellSpeed": false,
            "V-EdgeWidth": false,
            "V-Attract": false,
            "V-CellCount": false,
            "V-Decay": false,
            "V-Pull Mode": false,
            "O-Behavior": false,
            "O-Force": false,
            "O-Radius": false,
            "F-SurfaceT": false,
            "F-Visco": false,
            "F-Damp": false,
            "S-Cohesion": false,
            "S-Align": false,
            "S-Separation": false,
            "S-MaxSpeed": false,
            "A-Repulse": false,
            "A-Attract": false,
            "A-Threshold": false,
            "Ch-LinkDist": false,
            "Ch-LinkStr": false,
            "Ch-Align": false,
            "Ch-Branch": false,
            "Ch-MaxLinks": false,
            "J-X": false,
            "J-Y": false,
            "J-G-Strength": false,
            "J-T-BiasStrength": false,
            "Enable External": false,
            "Enable EMU": false
          }
        },
        "gridUi": {
          "screen": {
            "width": 240,
            "height": 240,
            "shape": "circular"
          },
          "gridSpecs": {
            "targetCellCount": 341,
            "gap": 1,
            "aspectRatio": 1,
            "scale": 1,
            "allowCut": 3,
            "centerOffsetX": 0,
            "centerOffsetY": 0
          },
          "shadow": {
            "shadowIntensity": 0.17,
            "shadowThreshold": 0,
            "blurAmount": 0.23
          },
          "flags": {
            "showGridCells": true,
            "showIndices": false,
            "showCellCenters": false,
            "showBoundary": false
          },
          "colors": {
            "gradientPreset": "c0"
          }
        }
      }

    },
  }
};