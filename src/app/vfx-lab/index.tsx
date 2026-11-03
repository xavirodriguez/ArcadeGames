import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Link } from "expo-router";
import type { CoreComponentRegistry, World } from "@tiny-aster/core";
import { CanvasDrawAdapter } from "../../games/shared/rendering/DrawAdapter";
import {
  createVFXLabDescriptor,
  getVFXLabEffect,
  resolveVFXLabColor,
  VFX_LAB_EFFECTS,
  type VFXLabEffectId
} from "../../games/shared/rendering/VFXVisualLabModel";
import { resolveVFXPlacement, type VFXVisualProfileId } from "../../games/shared/rendering/VFXEffectIR";

const PRESETS = [
  { label: "Impact / Neon", effect: "pixelfx_impact", profile: "arcade-neon", progress: 0.28, size: 48, rotation: 0 },
  { label: "Ink Burst / Sumi-e", effect: "pixelfx_ink_burst", profile: "sumi-e", progress: 0.62, size: 60, rotation: 0.35 },
  { label: "Phase Dash", effect: "pixelfx_phase_dash", profile: "arcade-neon", progress: 0.18, size: 42, rotation: -0.45 },
  { label: "Hop / Sumi-e", effect: "pixelfx_hop", profile: "sumi-e", progress: 0.4, size: 38, rotation: -1.2 }
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function VFXVisualLabScreen() {
  const [effectId, setEffectId] = useState<VFXLabEffectId>("pixelfx_impact");
  const [profile, setProfile] = useState<VFXVisualProfileId>("arcade-neon");
  const [progress, setProgress] = useState(0.28);
  const [size, setSize] = useState(48);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effect = useMemo(() => getVFXLabEffect(effectId), [effectId]);
  const descriptor = useMemo(
    () => createVFXLabDescriptor(effect, profile, rotation),
    [effect, profile, rotation]
  );
  const placement = resolveVFXPlacement(descriptor);
  const color = resolveVFXLabColor(effect, profile);

  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = profile === "sumi-e" ? "#E7DFCB" : "#070B13";
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalAlpha = profile === "sumi-e" ? 0.12 : 0.18;
    context.strokeStyle = profile === "sumi-e" ? "#77736B" : "#26364D";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.restore();

    context.save();
    context.translate(width / 2, height / 2);
    const remaining = Math.max(0.001, 1 - progress);
    const render = { size, color, opacity: 1 };
    const ttl = { remaining, timeLeft: 1 };
    const transform = { rotation, scaleX: 1 };
    const world = {
      getComponent: (_entity: number, component: string) => {
        if (component === "Render") return render;
        if (component === "TTL") return ttl;
        if (component === "Transform") return transform;
        return undefined;
      }
    } as unknown as World<CoreComponentRegistry>;

    effect.draw(new CanvasDrawAdapter(context), world, 1);
    context.restore();
  }, [color, effect, profile, progress, rotation, size]);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setEffectId(preset.effect);
    setProfile(preset.profile);
    setProgress(preset.progress);
    setSize(preset.size);
    setRotation(preset.rotation);
  };

  const changeProgress = (delta: number) => setProgress((value) => clamp(value + delta, 0, 0.99));
  const changeSize = (delta: number) => setSize((value) => clamp(value + delta, 12, 100));
  const changeRotation = (delta: number) => setRotation((value) => value + delta);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <TouchableOpacity style={styles.backButton}>
            <Text style={styles.backText}>← Arcade</Text>
          </TouchableOpacity>
        </Link>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>VFX VISUAL LAB</Text>
          <Text style={styles.subtitle}>PRODUCTION DRAWERS · EFFECT IR · SEMANTIC PROFILES</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.panel}>
          <View style={styles.panelHeading}>
            <Text style={styles.panelTitle}>Live Preview</Text>
            <Text style={styles.meta}>Canvas · 640 × 320</Text>
          </View>
          {Platform.OS === "web" ? (
            <View style={styles.canvasFrame}>
              <canvas
                ref={canvasRef}
                width={640}
                height={320}
                style={{ width: "100%", height: 320, display: "block" }}
              />
            </View>
          ) : (
            <View style={styles.nativeNotice}>
              <Text style={styles.noticeTitle}>Canvas preview is web-only in this MVP</Text>
              <Text style={styles.noticeText}>The selected effect still resolves through the production catalog. Canvas and Skia registration parity is covered by the shared registration tests.</Text>
            </View>
          )}
          <View style={styles.previewMeta}>
            <Text style={styles.effectName}>{effect.label}</Text>
            <Text style={styles.meta}>{effect.id}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Effect Browser · {VFX_LAB_EFFECTS.length} drawers</Text>
          <View style={styles.effectGrid}>
            {VFX_LAB_EFFECTS.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setEffectId(item.id)}
                style={[styles.effectChip, effectId === item.id && styles.effectChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: effectId === item.id }}
              >
                <Text style={[styles.effectChipText, effectId === item.id && styles.effectChipTextActive]}>{item.label}</Text>
                <Text style={styles.chipFamily}>{item.family}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Semantic Visual Profile</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setProfile("arcade-neon")} style={[styles.profileButton, profile === "arcade-neon" && styles.profileNeonActive]}>
              <Text style={styles.profileTitle}>ARCADE NEON</Text>
              <Text style={styles.profileDescription}>Existing arcade palette tokens</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProfile("sumi-e")} style={[styles.profileButton, profile === "sumi-e" && styles.profileSumiActive]}>
              <Text style={[styles.profileTitle, styles.sumiText]}>SUMI-E</Text>
              <Text style={[styles.profileDescription, styles.sumiText]}>Validated ink-wash semantic tokens</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: color }]} />
            <Text style={styles.meta}>Resolved family color</Text>
            <Text style={styles.colorValue}>{color}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Timeline & Transform</Text>
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
          <Text style={styles.helper}>Progress drives the existing normalized TTL contract. No independent animation clock or lifetime manager is introduced.</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Reproducible Presets</Text>
          <View style={styles.effectGrid}>
            {PRESETS.map((preset) => (
              <TouchableOpacity key={preset.label} style={styles.presetButton} onPress={() => applyPreset(preset)}>
                <Text style={styles.presetText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Context Inspector</Text>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Family</Text><Text style={styles.inspectorValue}>{descriptor.family}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Primitive</Text><Text style={styles.inspectorValue}>{descriptor.primitive}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Profile</Text><Text style={styles.inspectorValue}>{descriptor.profile}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Placement</Text><Text style={styles.inspectorValue}>{JSON.stringify(placement)}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Context</Text><Text style={styles.inspectorValue}>{JSON.stringify(descriptor.context)}</Text></View>
          <View style={styles.inspectorRow}><Text style={styles.inspectorKey}>Lifetime</Text><Text style={styles.inspectorValue}>{(1 - progress).toFixed(2)} / 1.00 s remaining</Text></View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Renderer Contract</Text>
          <View style={styles.parityRow}>
            <Text style={styles.parityLabel}>Canvas registration</Text>
            <Text style={styles.parityValue}>13 / 13</Text>
          </View>
          <View style={styles.parityRow}>
            <Text style={styles.parityLabel}>Skia registration</Text>
            <Text style={styles.parityValue}>13 / 13</Text>
          </View>
          <Text style={styles.helper}>Both renderer registrations call the same thirteen procedural composition functions through their existing adapters. This MVP previews Canvas on web; it does not claim pixel-diff parity or provide a native Skia preview surface.</Text>
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
  content: { padding: 16, width: "100%", maxWidth: 1040, alignSelf: "center" },
  panel: { backgroundColor: "#0D111A", borderRadius: 8, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#1A2233" },
  panelHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  panelTitle: { color: "#00F0FF", fontSize: 13, fontFamily: "monospace", fontWeight: "bold", marginBottom: 12 },
  meta: { color: "#778399", fontSize: 10, fontFamily: "monospace" },
  canvasFrame: { overflow: "hidden", borderRadius: 6, borderWidth: 1, borderColor: "#26364D" },
  nativeNotice: { minHeight: 160, justifyContent: "center", padding: 20, backgroundColor: "#141A26", borderRadius: 6 },
  noticeTitle: { color: "#FFF", fontSize: 13, fontFamily: "monospace", fontWeight: "bold", marginBottom: 8 },
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
  colorRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 },
  colorSwatch: { width: 16, height: 16, borderRadius: 3, borderWidth: 1, borderColor: "#718096" },
  colorValue: { color: "#FFF", fontSize: 11, fontFamily: "monospace", marginLeft: "auto" },
  controlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  controlLabel: { color: "#AAB4C4", fontSize: 11, fontFamily: "monospace" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepButton: { width: 30, height: 30, borderRadius: 4, backgroundColor: "#1A2233", alignItems: "center", justifyContent: "center" },
  stepText: { color: "#00F0FF", fontSize: 18, fontWeight: "bold" },
  controlValue: { color: "#FFF", fontSize: 11, fontFamily: "monospace", minWidth: 74, textAlign: "center" },
  track: { height: 5, backgroundColor: "#1A2233", borderRadius: 4, overflow: "hidden", marginVertical: 4 },
  trackFill: { height: 5, backgroundColor: "#00F0FF" },
  helper: { color: "#778399", fontSize: 10, lineHeight: 16, marginTop: 10 },
  presetButton: { backgroundColor: "#141A26", borderWidth: 1, borderColor: "#394B63", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 5 },
  presetText: { color: "#DCE5F2", fontSize: 10, fontFamily: "monospace" },
  inspectorRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#1A2233", gap: 12 },
  inspectorKey: { color: "#778399", fontSize: 10, fontFamily: "monospace" },
  inspectorValue: { color: "#DCE5F2", fontSize: 10, fontFamily: "monospace", flexShrink: 1, textAlign: "right" },
  parityRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  parityLabel: { color: "#AAB4C4", fontSize: 11, fontFamily: "monospace" },
  parityValue: { color: "#00F0FF", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }
});
