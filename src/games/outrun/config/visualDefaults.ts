import type { OutrunVisualConfig } from "../types/OutrunVisualTypes";

/**
 * Visual defaults from src/games/outrun/OUTRUN_ARTWORK.md.
 * The cloud drift and speed-line activation threshold are provisional tuning values;
 * the art bible specifies the intent but not a numeric value for either.
 */
export const DEFAULT_OUTRUN_VISUAL_CONFIG: OutrunVisualConfig = {
  "stages": [
    {
      "hour": "dawn",
      "decor": "sierra"
    },
    {
      "hour": "noon",
      "decor": "coast"
    },
    {
      "hour": "afternoon",
      "decor": "desert"
    },
    {
      "hour": "twilight",
      "decor": "sierra"
    },
    {
      "hour": "night",
      "decor": "coast"
    }
  ],
  "transitionFraction": 0.15,
  "palette": {
    "shared": {
      "car": "#FF5A4F",
      "carShade": "#E8443C",
      "carRoof": "#FF7D70",
      "carGlass": "#162B3F",
      "carLightBar": "#FFE9E4",
      "carLightEnd": "#FF2D46",
      "cream": "#FFF1D6",
      "trafficA": "#D9B45A",
      "trafficB": "#A58BD1",
      "trafficC": "#6E8CB8",
      "shadow": "#0F1F2E",
      "trafficLightBar": "#FFE0D8",
      "treeTrunk": "#4A3A2A",
      "hudMutedText": "#BFD3E6",
      "branchPanel": "#142B40",
      "branchName": "#C9D6E6",
      "branchAccentCoast": "#2FB8B0",
      "branchAccentSierra": "#FF8A5B",
      "branchAccentDesert": "#E8B04A"
    },
    "dawn": {
      "skyHigh": "#3A4A8C",
      "skyMid": "#8A88BE",
      "skyLow": "#D9A9B8",
      "horizon": "#FFD2AC",
      "sun": "#FFF1D0",
      "mtnFar": "#B493B8",
      "mtnMid": "#8B76A6",
      "mtnNear": "#5E5688",
      "groundFar": "#8E86B2",
      "groundNear": "#6A6598",
      "roadFar": "#6F6A93",
      "roadNear": "#34325A",
      "foliage": "#3F6F86",
      "foliageLight": "#6FA3B5",
      "kerbB": "#2FB8B0"
    },
    "noon": {
      "skyHigh": "#2A7DE1",
      "skyMid": "#6FB0EE",
      "skyLow": "#A9D4F5",
      "horizon": "#D9EEF7",
      "sun": "#FFE98A",
      "mtnFar": "#7FA6C9",
      "mtnMid": "#5D8DB8",
      "mtnNear": "#3F6F9C",
      "groundFar": "#78CBA3",
      "groundNear": "#3E9C74",
      "roadFar": "#6A7585",
      "roadNear": "#2F3644",
      "foliage": "#1F6F6A",
      "foliageLight": "#3FA39A",
      "kerbB": "#24408E"
    },
    "afternoon": {
      "skyHigh": "#1B3F6B",
      "skyMid": "#4F7EA0",
      "skyLow": "#C7C09A",
      "horizon": "#FFCB7E",
      "sun": "#FFE7A8",
      "mtnFar": "#7B9BA2",
      "mtnMid": "#4C7480",
      "mtnNear": "#2F5560",
      "groundFar": "#C2A765",
      "groundNear": "#7F6C3A",
      "roadFar": "#7C8A8C",
      "roadNear": "#34444F",
      "foliage": "#1F6F6A",
      "foliageLight": "#3FA39A",
      "kerbB": "#2FB8B0"
    },
    "night": {
      "skyHigh": "#0B1030",
      "skyMid": "#22246A",
      "skyLow": "#4A2F8A",
      "horizon": "#8C3FA0",
      "sun": "#DDE6FF",
      "mtnFar": "#2A2F6E",
      "mtnMid": "#1E2358",
      "mtnNear": "#141846",
      "groundFar": "#26306A",
      "groundNear": "#121842",
      "roadFar": "#232759",
      "roadNear": "#0A0D26",
      "foliage": "#17405E",
      "foliageLight": "#2F7F8F",
      "kerbB": "#1E8F8A"
    }
  },
  "paletteColorblind": {
    "dawn": {
      "skyHigh": "#26345F",
      "skyMid": "#6577A3",
      "skyLow": "#B4BDCC",
      "horizon": "#E5D5C5",
      "sun": "#FFF2D0",
      "mtnFar": "#C6B9D1",
      "mtnMid": "#8F8FAF",
      "mtnNear": "#5E648D",
      "groundFar": "#C1C4B5",
      "groundNear": "#868B84",
      "roadFar": "#666E79",
      "roadNear": "#252B38",
      "foliage": "#46565C",
      "foliageLight": "#82949B",
      "kerbB": "#282F48"
    },
    "noon": {
      "skyHigh": "#276BC2",
      "skyMid": "#7FB6E8",
      "skyLow": "#C6E1F3",
      "horizon": "#E9F4FA",
      "sun": "#FFF3AC",
      "mtnFar": "#AFC8DB",
      "mtnMid": "#7F9FBA",
      "mtnNear": "#4F6F8B",
      "groundFar": "#CDD7C6",
      "groundNear": "#A0AF9A",
      "roadFar": "#666F7A",
      "roadNear": "#272E3A",
      "foliage": "#53675D",
      "foliageLight": "#91A69A",
      "kerbB": "#19213D"
    },
    "afternoon": {
      "skyHigh": "#1F3A5E",
      "skyMid": "#6588A4",
      "skyLow": "#BDC7C5",
      "horizon": "#FFE0A8",
      "sun": "#FFF0C2",
      "mtnFar": "#B3C8C6",
      "mtnMid": "#839DA0",
      "mtnNear": "#536F73",
      "groundFar": "#D5BE87",
      "groundNear": "#96845A",
      "roadFar": "#65717A",
      "roadNear": "#27343C",
      "foliage": "#4F685E",
      "foliageLight": "#8FA89B",
      "kerbB": "#303A45"
    },
    "night": {
      "skyHigh": "#0B1030",
      "skyMid": "#262F68",
      "skyLow": "#5A4C87",
      "horizon": "#9A65AC",
      "sun": "#DDE6FF",
      "mtnFar": "#515A98",
      "mtnMid": "#343D7B",
      "mtnNear": "#1C2357",
      "groundFar": "#59649A",
      "groundNear": "#262D5F",
      "roadFar": "#232C52",
      "roadNear": "#080B20",
      "foliage": "#1E4763",
      "foliageLight": "#417D8E",
      "kerbB": "#1E8F8A"
    }
  },
  "paletteMode": "default",
  "quality": "high",
  "tuning": {
    "referenceWidthPx": 300,
    "skyBandHeights": [
      0.231,
      0.192,
      0.154,
      0.135,
      0.115,
      0.096,
      0.077
    ],
    "clouds": {
      "highCountMin": 4,
      "highCountMax": 5,
      "lowCount": 2,
      "widthMinPx": 48,
      "widthMaxPx": 76,
      "heightMinPx": 6,
      "heightMaxPx": 8,
      "alpha": 0.22,
      "driftPxPerSecond": 1.5
    },
    "astro": {
      "radiusToFrameWidth": 0.127,
      "haloRadiusMultiplier": 1.37,
      "haloAlpha": 0.22,
      "centerAboveHorizonPx": 18,
      "horizontalPositionFraction": 0.7
    },
    "stars": {
      "highCountMin": 10,
      "highCountMax": 20,
      "lowCount": 5,
      "diameterPx": 1,
      "alphaMin": 0.5,
      "alphaMax": 0.9
    },
    "mountains": {
      "parallax": {
        "far": 0.2,
        "mid": 0.4,
        "near": 0.7,
        "baseDriftPxPerSecond": 8,
        "speedDriftPxPerSecond": 42,
        "curvatureScale": 0.02
      },
      "sierraProfile": {
        "far": [
          {
            "x": 0,
            "height": 28
          },
          {
            "x": 38,
            "height": 42
          },
          {
            "x": 80,
            "height": 24
          },
          {
            "x": 125,
            "height": 50
          },
          {
            "x": 175,
            "height": 28
          },
          {
            "x": 218,
            "height": 45
          },
          {
            "x": 260,
            "height": 30
          },
          {
            "x": 300,
            "height": 38
          }
        ],
        "mid": [
          {
            "x": 0,
            "height": 14
          },
          {
            "x": 30,
            "height": 24
          },
          {
            "x": 65,
            "height": 10
          },
          {
            "x": 110,
            "height": 28
          },
          {
            "x": 155,
            "height": 8
          },
          {
            "x": 200,
            "height": 20
          },
          {
            "x": 250,
            "height": 6
          },
          {
            "x": 300,
            "height": 16
          }
        ],
        "near": [
          {
            "x": 0,
            "height": 7
          },
          {
            "x": 50,
            "height": 11
          },
          {
            "x": 100,
            "height": 4
          },
          {
            "x": 160,
            "height": 9
          },
          {
            "x": 220,
            "height": 3
          },
          {
            "x": 300,
            "height": 8
          }
        ]
      },
      "snowPeakAlpha": 0.8,
      "snowPeakHalfWidthPx": 4.5,
      "snowPeakMinimumHeightPx": 25
    },
    "road": {
      "stripeWhiteMix": 0.05,
      "kerbWidthToRoadHalfWidth": 0.12,
      "laneMarkWidthToRoadHalfWidth": 0.08,
      "speedLineWidthPx": 2,
      "speedLineAlpha": 0.28,
      "speedLineStartSpeedRatio": 0.7
    },
    "decor": {
      "coastLayerHeightMinRatio": 0.3,
      "coastLayerHeightMaxRatio": 0.6,
      "desertGroundMix": 0.6,
      "desertSandColor": "#E0B870",
      "distantObjectHazeMix": 0.4,
      "waterNearToken": "skyMid",
      "waterFarToken": "skyLow",
      "desertLayerHeightRatios": {
        "far": 0.32,
        "mid": 0.4,
        "near": 0.48
      }
    },
    "tree": {
      "heightToRoadHalfWidth": 0.57,
      "trunkWidthToHeight": 0.1,
      "trunkHeightToHeight": 0.355,
      "canopyRadiusXToHeight": 0.32,
      "canopyRadiusYToHeight": 0.355,
      "highlightScale": 0.4,
      "highlightOffsetX": 0.35,
      "highlightOffsetY": 0.32,
      "highlightAlpha": 0.85,
      "trunkColor": "#4A3A2A"
    },
    "playerCar": {
      "widthToRoadHalfWidth": 0.47,
      "referenceWidthPx": 64,
      "shadow": {
        "rx": 42,
        "ry": 4.5,
        "alpha": 0.55
      },
      "wheelLeft": {
        "x": -33,
        "y": -9,
        "width": 10,
        "height": 9,
        "cornerRadius": 2
      },
      "wheelRight": {
        "x": 23,
        "y": -9,
        "width": 10,
        "height": 9,
        "cornerRadius": 2
      },
      "body": {
        "x": -32,
        "y": -20,
        "width": 64,
        "height": 17,
        "cornerRadius": 7
      },
      "lowerShade": {
        "x": -32,
        "y": -11,
        "width": 64,
        "height": 8,
        "cornerRadius": 4.5
      },
      "cabin": [
        {
          "x": -20,
          "y": -20
        },
        {
          "x": 20,
          "y": -20
        },
        {
          "x": 14,
          "y": -33
        },
        {
          "x": -14,
          "y": -33
        }
      ],
      "roof": [
        {
          "x": -14,
          "y": -33
        },
        {
          "x": 14,
          "y": -33
        },
        {
          "x": 12,
          "y": -36
        },
        {
          "x": -12,
          "y": -36
        }
      ],
      "rearWindow": [
        {
          "x": -17,
          "y": -21
        },
        {
          "x": 17,
          "y": -21
        },
        {
          "x": 12,
          "y": -31
        },
        {
          "x": -12,
          "y": -31
        }
      ],
      "reflection": [
        {
          "x": -12,
          "y": -21
        },
        {
          "x": -4,
          "y": -21
        },
        {
          "x": 4,
          "y": -31
        },
        {
          "x": -4,
          "y": -31
        }
      ],
      "lightBar": {
        "x": -28,
        "y": -17,
        "width": 56,
        "height": 4,
        "cornerRadius": 2
      },
      "lightEndLeft": {
        "x": -28,
        "y": -17,
        "width": 10,
        "height": 4,
        "cornerRadius": 2
      },
      "lightEndRight": {
        "x": 18,
        "y": -17,
        "width": 10,
        "height": 4,
        "cornerRadius": 2
      },
      "licensePlate": {
        "x": -9,
        "y": -11,
        "width": 18,
        "height": 5,
        "cornerRadius": 1.2
      },
      "curveTiltDegrees": 4,
      "offRoadVibrationPx": 2,
      "brakeEndScale": 1.2
    },
    "traffic": {
      "widthToRoadHalfWidth": 0.47,
      "shadowRadiusXToWidth": 0.55,
      "shadowRadiusYToWidth": 0.07,
      "shadowAlpha": 0.4,
      "bodyHeightToWidth": 0.27,
      "bodyCornerRadiusToWidth": 0.07,
      "cabinBaseToBodyWidth": 0.74,
      "cabinRoofToBodyWidth": 0.56,
      "cabinHeightToBodyWidth": 0.16,
      "lightBarWidthToBodyWidth": 0.89,
      "lightBarHeightToBodyWidth": 0.074,
      "lightBarTopOffsetToBodyWidth": 0.15,
      "cabinDarkenFraction": 0.12
    },
    "hud": {
      "topMarginPx": 16,
      "horizontalMarginPx": 16,
      "timeLabelFontPx": 12,
      "timeDigitsFontPx": 26,
      "stageLabelFontPx": 12,
      "hourFontPx": 14,
      "progressHeightPx": 3,
      "progressTrackAlpha": 0.25,
      "carMarkerRadiusPx": 5,
      "branchMarkerRadiusPx": 4,
      "speedPill": {
        "marginPx": 12,
        "widthPx": 92,
        "heightPx": 36,
        "cornerRadiusPx": 12,
        "shadowAlpha": 0.6,
        "digitsFontPx": 24,
        "unitFontPx": 12
      },
      "radioPill": {
        "marginPx": 12,
        "widthPx": 80,
        "heightPx": 36,
        "cornerRadiusPx": 12,
        "labelFontPx": 12,
        "barWidthPx": 2,
        "barHeightMinPx": 8,
        "barHeightMaxPx": 10,
        "activeBarHeightPx": 14,
        "activeBarWidthPx": 3
      }
    },
    "branchGate": {
      "panelBackground": "#142B40",
      "borderWidthPx": 1.5,
      "arrowAngleDegrees": 35,
      "distanceFontPx": 12,
      "decorNameFontPx": 12,
      "referenceDistanceMeters": 300,
      "nameColor": "#C9D6E6",
      "coastAccent": "#2FB8B0",
      "sierraAccent": "#FF8A5B",
      "desertAccent": "#E8B04A"
    },
    "horizonFraction": 0.46
  }
};
