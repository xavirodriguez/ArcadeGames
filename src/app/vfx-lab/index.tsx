import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Link } from "expo-router";
import { Canvas as SkiaCanvas, Picture as SkiaPicture } from "@shopify/react-native-skia";
import type { CoreComponentRegistry, World } from "@tiny-aster/core";
import { CanvasDrawAdapter, SkiaDrawAdapter } from "../../games/shared/rendering/DrawAdapter";
import { Skia } from "../../games/shared/rendering/SkiaContext";
import {
  createVFXLabDescriptor,
  createVFXLabPreset,
  getVFXLabEffect,
  getVFXLabPreviewPalette,
  parseVFXLabPreset,
  resolveVFXLabColor,
  resolveVFXLabSemanticRole,
  serializeVFXLabPreset,
  VFX_LAB_EFFECTS,
  VFX_LAB_PRESETS,
  type VFXLabEffectId,
  type VFXLabPreset
} from "../../games/shared/rendering/VFXVisualLabModel";
import { resolveVFXPlacement, VFX_VISUAL_PROFILES, type VFXVisualProfileId } from "../../games/shared/rendering/VFXEffectIR";

const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 240;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createPreviewWorld(size: number, color: string, progress: number, rotation: number): World<CoreComponentRegistry> {
  const render = { size, color, opacity: 1 };
  const ttl = { remaining: Math.max(0.001, 1 - progress), timeLeft: 1 };
  const transform = { rotation, scaleX: 1 };
  return {
    getComponent: (_entity: number, component: string) => {
      if (component === "Render") return render;
      if (component === "TTL") return ttl;
      if (component === "Transform") return transform;
      return undefined;
    }
  } as never as World<CoreComponentRegistry>;
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(3);
  return String(value);
}

export default function VFXVisualLabScreen() {
  const [effectId, setEffectId] = useState<VFXLabEffectId>("pixelfx_impact");
  const [profile, setProfile] = useState<VFXVisualProfileId>("arcade-neon");
  const [progress, setProgress] = useState(0.28);
  const [size, setSize] = useState(48);
  const [rotation, setRotation] = useState(0);
  const [seed, setSeed] = useState("104729");
  const [filter, setFilter] = useState("");
  const [presetLabel, setPresetLabel] = useState("");
  const [presets, setPresets] = useState<readonly VFXLabPreset[]>(VFX_LAB_PRESETS);
  const [presetJson, setPresetJson] = useState("");
  const [presetError, setPresetError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [skiaPicture, setSkiaPicture] = useState<any>(null);

  const effect = useMemo(() => getVFXLabEffect(effectId), [effectId]);
  const descriptor = useMemo(
    () => createVFXLabDescriptor(effect, profile, rotation),
    [effect, profile, rotation]
  );
  const placement = resolveVFXPlacement(descriptor);
  const semanticRole = resolveVFXLabSemanticRole(effect.family);
  const color = resolveVFXLabColor(effect, profile);
  const semanticTokens = VFX_VISUAL_PROFILES[profile].tokens;
  const previewPalette = useMemo(() => getVFXLabPreviewPalette(profile), [profile]);
  const contextEntries = Object.entries(descriptor.context);
  const visibleEffects = VFX_LAB_EFFECTS.filter((item) =>
    `${item.label} ${item.id} ${item.family}`.toLowerCase().includes(filter.toLowerCase())
  );
  const scenarioSeed = clamp(Number.parseInt(seed, 10) || 0, 0, 0xffffffff);
  const currentSettings = {
    effect: effectId,
    profile,
    progress,
    size,
    rotation,
    seed: scenarioSeed
  } as const;

  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    context.fillStyle = previewPalette.background;
    context.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    context.save();
    context.globalAlpha = previewPalette.gridAlpha;
    context.strokeStyle = previewPalette.grid;
    context.lineWidth = 1;
    for (let x = 0; x < PREVIEW_WIDTH; x += 32) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, PREVIEW_HEIGHT); context.stroke();
    }
    for (let y = 0; y < PREVIEW_HEIGHT; y += 32) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(PREVIEW_WIDTH, y); context.stroke();
    }
    context.restore();
    context.save();
    context.translate(PREVIEW_WIDTH / 2, PREVIEW_HEIGHT / 2);
    effect.draw(
      new CanvasDrawAdapter(context),
      createPreviewWorld(size, color, progress, rotation),
      scenarioSeed
    );
    context.restore();
  }, [color, effect, previewPalette, progress, rotation, scenarioSeed, size]);

  useEffect(() => {
    if (!Skia) {
      setSkiaPicture(null);
      return;
    }
    const recorder = Skia.PictureRecorder();
    const skiaCanvas = recorder.beginRecording(Skia.XYWHRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT));
    const adapter = new SkiaDrawAdapter(skiaCanvas);
    adapter.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT, previewPalette.background);
    for (let x = 0; x < PREVIEW_WIDTH; x += 32) adapter.drawLine(x, 0, x, PREVIEW_HEIGHT, previewPalette.grid, 1, previewPalette.gridAlpha);
    for (let y = 0; y < PREVIEW_HEIGHT; y += 32) adapter.drawLine(0, y, PREVIEW_WIDTH, y, previewPalette.grid, 1, previewPalette.gridAlpha);
    skiaCanvas.save();
    skiaCanvas.translate(PREVIEW_WIDTH / 2, PREVIEW_HEIGHT / 2);
    effect.draw(adapter, createPreviewWorld(size, color, progress, rotation), scenarioSeed);
    skiaCanvas.restore();
    setSkiaPicture(recorder.finishRecordingAsPicture());
  }, [color, effect, previewPalette, progress, rotation, scenarioSeed, size]);

  const applyPreset = (preset: VFXLabPreset) => {
    setEffectId(preset.effect);
    setProfile(preset.profile);
    setProgress(preset.progress);
    setSize(preset.size);
    setRotation(preset.rotation);
    setSeed(String(preset.seed));
    setPresetJson(serializeVFXLabPreset(preset));
    setPresetError("");
  };

  const savePreset = () => {
    try {
      const preset = createVFXLabPreset(presetLabel, currentSettings);
      setPresets((current) => [...current.filter((item) => item.id !== preset.id), preset]);
      setPresetJson(serializeVFXLabPreset(preset));
      setPresetLabel("");
      setPresetError("");
    } catch (error) {
      setPresetError(error instanceof Error ? error.message : "Could not create preset");
    }
  };

  const importPreset = () => {
    try {
      const preset = parseVFXLabPreset(presetJson);
      applyPreset(preset);
      setPresets((current) => [...current.filter((item) => item.id !== preset.id), preset]);
    } catch (error) {
      setPresetError(error instanceof Error ? error.message : "Invalid preset");
    }
  };

  const exportPreset = () => {
    try {
      const preset = createVFXLabPreset(presetLabel || effect.label, currentSettings);
      setPresetJson(serializeVFXLabPreset(preset));
      setPresetError("");
    } catch (error) {
      setPresetError(error instanceof Error ? error.message : "Could not export preset");
    }
  };

  const changeProgress = (delta: number) => setProgress((value) => clamp(value + delta, 0, 0.99));
  const changeSize = (delta: number) => setSize((value) => clamp(value + delta, 12, 100));
  const changeRotation = (delta: number) => setRotation((value) => value + delta);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <TouchableOpacity style={styles.backButton}><Text style={styles.backText}>← Arcade</Text></TouchableOpacity>
        </Link>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>VFX VISUAL LAB</Text>
          <Text style={styles.subtitle}>PRODUCTION DRAWERS · SEMANTIC INSPECTOR · CANVAS / SKIA</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.panel}>
          <View style={styles.panelHeading}>
            <Text style={styles.panelTitle}>Renderer comparison</Text>
            <Text style={styles.meta}>Same drawer · state · profile · dimensions</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={styles.previewRow}>
              <View style={styles.previewColumn}>
                <Text style={styles.rendererTitle}>CANVAS 2D</Text>
                {Platform.OS === "web" ? (
                  <View style={styles.canvasFrame}>
                    <canvas ref={canvasRef} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT}
                      style={{ width: "100%", height: 240, display: "block" }} />
                  </View>
                ) : (
                  <View style={styles.nativeNotice}><Text style={styles.noticeText}>Canvas 2D preview is available in the web Visual Lab.</Text></View>
                )}
              </View>
              <View style={styles.previewColumn}>
                <Text style={styles.rendererTitle}>REACT NATIVE SKIA</Text>
                <View style={styles.canvasFrame}>
                  {skiaPicture ? (
                    <SkiaCanvas style={{ width: "100%", height: 240 }}>
                      <SkiaPicture picture={skiaPicture} />
                    </SkiaCanvas>
                  ) : (
                    <View style={styles.nativeNotice}><Text style={styles.noticeText}>Skia picture is unavailable in this runtime.</Text></View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
          <Text style={styles.helper}>Both previews call the exact same production drawer through their respective adapters. This is a side-by-side visual inspection, not a pixel-diff or proof of pixel parity.</Text>
          <View style={styles.previewMeta}>
            <Text style={styles.effectName}>{effect.label}</Text>
            <Text style={styles.meta}>{effect.id} · {PREVIEW_WIDTH} × {PREVIEW_HEIGHT}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Effect browser · {visibleEffects.length} / {VFX_LAB_EFFECTS.length}</Text>
          <TextInput value={filter} onChangeText={setFilter} placeholder="Filter by name, id or family…" placeholderTextColor="#778399" style={styles.textInput} />
          <View style={styles.effectGrid}>
            {visibleEffects.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => setEffectId(item.id)}
                style={[styles.effectChip, effectId === item.id && styles.effectChipActive]}
                accessibilityRole="button" accessibilityState={{ selected: effectId === item.id }}>
                <Text style={[styles.effectChipText, effectId === item.id && styles.effectChipTextActive]}>{item.label}</Text>
                <Text style={styles.chipFamily}>{item.family}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Semantic profile & resolved token</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setProfile("arcade-neon")} style={[styles.profileButton, profile === "arcade-neon" && styles.profileNeonActive]}>
              <Text style={styles.profileTitle}>ARCADE NEON</Text><Text style={styles.profileDescription}>Arcade semantic palette</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProfile("sumi-e")} style={[styles.profileButton, profile === "sumi-e" && styles.profileSumiActive]}>
              <Text style={[styles.profileTitle, styles.sumiText]}>SUMI-E</Text><Text style={[styles.profileDescription, styles.sumiText]}>Ink-wash semantic palette</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.semanticResolved}>
            <View style={[styles.colorSwatch, { backgroundColor: color }]} />
            <View style={styles.semanticCopy}>
              <Text style={styles.semanticName}>{semanticRole.toUpperCase()} → {color}</Text>
              <Text style={styles.meta}>{effect.family} maps to semantic token “{semanticRole}”</Text>
            </View>
          </View>
          <View style={styles.tokenGrid}>
            {(Object.entries(semanticTokens) as [string, string][]).map(([key, value]) => (
              <View key={key} style={styles.tokenItem}>
                <View style={[styles.tokenSwatch, { backgroundColor: value }]} />
                <Text style={styles.tokenName}>{key}</Text><Text style={styles.tokenValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Effect parameters</Text>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Progress / TTL</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepButton} onPress={() => changeProgress(-0.1)}><Text style={styles.stepText}>−</Text></TouchableOpacity>
              <Text style={styles.controlValue}>{Math.round(progress * 100)}%</Text>
              <TouchableOpacity style={styles.stepButton} onPress={() => changeProgress(0.1)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.track}><View style={[styles.trackFill, { width: `${progress * 100}%` }]} /></View>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Size</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepButton} onPress={() => changeSize(-4)}><Text style={styles.stepText}>−</Text></TouchableOpacity>
              <Text style={styles.controlValue}>{size}px</Text>
              <TouchableOpacity style={styles.stepButton} onPress={() => changeSize(4)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Rotation</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepButton} onPress={() => changeRotation(-Math.PI / 8)}><Text style={styles.stepText}>−</Text></TouchableOpacity>
              <Text style={styles.controlValue}>{rotation.toFixed(2)} rad</Text>
              <TouchableOpacity style={styles.stepButton} onPress={() => changeRotation(Math.PI / 8)}><Text style={styles.stepText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Scenario seed</Text>
            <TextInput value={seed} onChangeText={setSeed} keyboardType="numeric" style={[styles.textInput, styles.seedInput]} />
          </View>
          <Text style={styles.helper}>The seed is passed as a stable entity identity to both renderers. Effects with entity-seeded variation (such as Explosion) respond to it; effects without seeded variation remain unchanged.</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Semantic context inspector</Text>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Effect / family</Text><Text style={styles.inspectorValue}>{effect.id} · {descriptor.family}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Primitive</Text><Text style={styles.inspectorValue}>{descriptor.primitive}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Profile / role</Text><Text style={styles.inspectorValue}>{descriptor.profile} · {semanticRole}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Resolved token</Text><Text style={styles.inspectorValue}>{semanticRole}: {color}</Text></View>
          {contextEntries.map(([key, value]) => (
            <View key={key} style={styles.inspectorRow}><Text style={styles.inspectorKey}>Context · {key}</Text><Text style={styles.inspectorValue}>{formatValue(value)}</Text></View>
          ))}
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Placement x / y</Text><Text style={styles.inspectorValue}>{formatValue(placement.x ?? 0)} / {formatValue(placement.y ?? 0)}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Placement rotation</Text><Text style={styles.inspectorValue}>{formatValue(placement.rotation ?? rotation)} rad</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Presentation size</Text><Text style={styles.inspectorValue}>{size}px</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>TTL / progress</Text><Text style={styles.inspectorValue}>{(1 - progress).toFixed(2)}s / {(progress * 100).toFixed(0)}%</Text></View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Reproducible presets · schema v1</Text>
          <View style={styles.effectGrid}>
            {presets.map((preset) => (
              <TouchableOpacity key={preset.id} style={styles.presetButton} onPress={() => applyPreset(preset)}>
                <Text style={styles.presetText}>{preset.label}</Text>
                <Text style={styles.chipFamily}>{preset.id} · seed {preset.seed}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.controlRow}>
            <TextInput value={presetLabel} onChangeText={setPresetLabel} placeholder="New preset name" placeholderTextColor="#778399" style={[styles.textInput, styles.presetNameInput]} />
            <TouchableOpacity style={styles.actionButton} onPress={savePreset}><Text style={styles.actionText}>Save current</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={exportPreset}><Text style={styles.actionText}>Export</Text></TouchableOpacity>
          </View>
          <TextInput value={presetJson} onChangeText={setPresetJson} multiline textAlignVertical="top"
            placeholder="Preset JSON · paste to import or export a reproducible scenario" placeholderTextColor="#778399"
            style={[styles.textInput, styles.jsonInput]} />
          <TouchableOpacity style={[styles.actionButton, styles.importButton]} onPress={importPreset}><Text style={styles.actionText}>Import JSON preset</Text></TouchableOpacity>
          {presetError ? <Text style={styles.errorText}>{presetError}</Text> : null}
          <Text style={styles.helper}>A preset stores effect, semantic profile, progress, size, rotation and scenario seed. Exported JSON is portable and validated on import; saved presets remain in this screen session.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#06080C" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: "#0D111A", borderBottomWidth: 1, borderBottomColor: "#1A2233" },
  backButton: { padding: 8, minWidth: 76 },
  backText: { color: "#00F0FF", fontFamily: "monospace", fontWeight: "bold" },
  headerTitle: { flex: 1, alignItems: "center" },
  title: { color: "#FFF", fontSize: 19, fontFamily: "monospace", fontWeight: "bold", letterSpacing: 2 },
  subtitle: { color: "#78869B", fontSize: 8, fontFamily: "monospace", marginTop: 5, textAlign: "center" },
  headerSpacer: { minWidth: 76 },
  content: { padding: 16, width: "100%", maxWidth: 1120, alignSelf: "center" },
  panel: { backgroundColor: "#0D111A", borderRadius: 8, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#1A2233" },
  panelHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  panelTitle: { color: "#00F0FF", fontSize: 13, fontFamily: "monospace", fontWeight: "bold", marginBottom: 12 },
  meta: { color: "#778399", fontSize: 10, fontFamily: "monospace" },
  previewRow: { flexDirection: "row", gap: 12 },
  previewColumn: { width: 460 },
  rendererTitle: { color: "#DCE5F2", fontSize: 10, fontFamily: "monospace", fontWeight: "bold", marginBottom: 8 },
  canvasFrame: { overflow: "hidden", borderRadius: 6, borderWidth: 1, borderColor: "#26364D", width: "100%", height: 240, backgroundColor: "#070B13" },
  nativeNotice: { minHeight: 160, justifyContent: "center", padding: 20, backgroundColor: "#141A26", borderRadius: 6 },
  noticeText: { color: "#AAB4C4", fontSize: 11, lineHeight: 18 },
  previewMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap" },
  effectName: { color: "#FFF", fontSize: 13, fontFamily: "monospace", fontWeight: "bold" },
  effectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  effectChip: { minWidth: 116, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#141A26", borderWidth: 1, borderColor: "#263247", borderRadius: 5 },
  effectChipActive: { borderColor: "#00F0FF", backgroundColor: "#142B38" },
  effectChipText: { color: "#C7D0DF", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" },
  effectChipTextActive: { color: "#00F0FF" },
  chipFamily: { color: "#74839A", fontSize: 9, fontFamily: "monospace", marginTop: 4 },
  row: { flexDirection: "row", gap: 10 },
  profileButton: { flex: 1, minHeight: 72, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: "#263247", backgroundColor: "#141A26" },
  profileNeonActive: { borderColor: "#00F0FF", backgroundColor: "#142B38" },
  profileSumiActive: { borderColor: "#B3261E", backgroundColor: "#E7DFCB" },
  profileTitle: { color: "#00F0FF", fontSize: 12, fontFamily: "monospace", fontWeight: "bold" },
  profileDescription: { color: "#AAB4C4", fontSize: 10, marginTop: 6 },
  sumiText: { color: "#151515" },
  semanticResolved: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 12 },
  semanticCopy: { flex: 1, gap: 4 },
  semanticName: { color: "#FFF", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" },
  colorSwatch: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: "#718096" },
  tokenGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tokenItem: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 130 },
  tokenSwatch: { width: 12, height: 12, borderRadius: 2 },
  tokenName: { color: "#AAB4C4", fontSize: 10, fontFamily: "monospace" },
  tokenValue: { color: "#DCE5F2", fontSize: 9, fontFamily: "monospace" },
  controlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, flexWrap: "wrap", gap: 8 },
  controlLabel: { color: "#AAB4C4", fontSize: 11, fontFamily: "monospace" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepButton: { width: 30, height: 30, borderRadius: 4, backgroundColor: "#1A2233", alignItems: "center", justifyContent: "center" },
  stepText: { color: "#00F0FF", fontSize: 18, fontWeight: "bold" },
  controlValue: { color: "#FFF", fontSize: 11, fontFamily: "monospace", minWidth: 74, textAlign: "center" },
  track: { height: 5, backgroundColor: "#1A2233", borderRadius: 4, overflow: "hidden", marginVertical: 4 },
  trackFill: { height: 5, backgroundColor: "#00F0FF" },
  helper: { color: "#778399", fontSize: 10, lineHeight: 16, marginTop: 10 },
  textInput: { backgroundColor: "#141A26", borderWidth: 1, borderColor: "#263247", color: "#DCE5F2", borderRadius: 5, paddingHorizontal: 10, paddingVertical: 9, fontSize: 11, fontFamily: "monospace", marginBottom: 10 },
  seedInput: { minWidth: 150, textAlign: "right" },
  presetNameInput: { flex: 1, minWidth: 160, marginBottom: 0 },
  jsonInput: { minHeight: 150, marginTop: 10 },
  actionButton: { backgroundColor: "#142B38", borderWidth: 1, borderColor: "#00AFC0", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 10 },
  actionText: { color: "#00F0FF", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" },
  importButton: { alignSelf: "flex-start" },
  errorText: { color: "#FF7373", fontSize: 10, marginTop: 8 },
  presetButton: { backgroundColor: "#141A26", borderWidth: 1, borderColor: "#394B63", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 5 },
  presetText: { color: "#DCE5F2", fontSize: 10, fontFamily: "monospace" },
  inspectorRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#1A2233", gap: 12 },
  inspectorKey: { color: "#778399", fontSize: 10, fontFamily: "monospace" },
  inspectorValue: { color: "#DCE5F2", fontSize: 10, fontFamily: "monospace", flexShrink: 1, textAlign: "right" }
});
