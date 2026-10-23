import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform } from "react-native";
import { Link } from "expo-router";
import {
  arcadePack,
  examplesPack,
  randomRecipe,
  mutate,
  renderFinal,
  encodeWav,
  analyzeAudioBuffer,
  type SoundRecipe,
  type LayerSpec,
  type SoundArchetype,
  type AudioAnalysisResult,
} from "../../../packages/arcade-sound-kit/src/core_entry";

let sharedAudioContext: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

export default function SoundLabScreen() {
  const [recipes] = useState<SoundRecipe[]>(() => [...arcadePack(), ...examplesPack()]);
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<SoundRecipe>(() => arcadePack()[0]);

  const [history, setHistory] = useState<SoundRecipe[]>([]);
  const [future, setFuture] = useState<SoundRecipe[]>([]);

  const [seed, setSeed] = useState(42);
  const [variantIndex, setVariantIndex] = useState(0);

  const [renderedAudio, setRenderedAudio] = useState<{
    samples: Float32Array;
    sampleRate: number;
    analysis: AudioAnalysisResult;
  } | null>(null);

  const [activeArchetype] = useState<SoundArchetype>("laser");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const updateCurrentRecipe = (newRecipe: SoundRecipe) => {
    setHistory((prev) => [...prev, selectedRecipe]);
    setFuture([]);
    setSelectedRecipe(newRecipe);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((prev) => [selectedRecipe, ...prev]);
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setSelectedRecipe(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((prev) => [...prev, selectedRecipe]);
    setFuture((prev) => prev.slice(1));
    setSelectedRecipe(next);
  };

  // Debounced rendering
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { samples, sampleRate } = await renderFinal(selectedRecipe, { sampleRate: 22050, seed }, variantIndex);
        if (cancelled) return;
        const analysis = analyzeAudioBuffer(
          selectedRecipe.name,
          selectedRecipe.category,
          samples,
          sampleRate,
          selectedRecipe.duration,
          selectedRecipe.loop
        );
        setRenderedAudio({ samples, sampleRate, analysis });
      } catch (err) {
        console.error("Render failed in SoundLab:", err);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedRecipe, seed, variantIndex]);

  // Canvas visualizer
  useEffect(() => {
    if (Platform.OS !== "web" || !renderedAudio || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#0A0D14";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#00F0FF";
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const samples = renderedAudio.samples;
    const step = Math.max(1, Math.floor(samples.length / width));
    const halfH = height / 4;

    for (let x = 0; x < width; x++) {
      const idx = x * step;
      const s = samples[Math.min(idx, samples.length - 1)];
      const y = halfH - s * (halfH - 4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 0, 128, 0.3)";
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let x = 0; x < width; x++) {
      const idx = x * step;
      const s = Math.abs(samples[Math.min(idx, samples.length - 1)]);
      const y = height - s * (height / 2 - 4);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }, [renderedAudio]);

  const handlePlayAudio = () => {
    if (!renderedAudio) return;
    try {
      const audioCtx = getOrCreateAudioContext();
      if (!audioCtx) return;

      const buffer = audioCtx.createBuffer(1, renderedAudio.samples.length, renderedAudio.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < renderedAudio.samples.length; i++) {
        channel[i] = renderedAudio.samples[i];
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      console.warn("AudioContext playback error:", e);
    }
  };

  const handleDownloadWav = () => {
    if (!renderedAudio || typeof window === "undefined") return;
    try {
      const wavBytes = encodeWav(renderedAudio.samples, { sampleRate: renderedAudio.sampleRate, seed });
      const blob = new Blob([wavBytes.buffer as ArrayBuffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedRecipe.name}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("WAV download error:", e);
    }
  };

  const handleRandomize = () => {
    const randomSeed = Math.floor(Math.random() * 10000) + 1;
    const generated = randomRecipe({ archetype: activeArchetype }, randomSeed);
    updateCurrentRecipe(generated);
  };

  const handleMutate = () => {
    const mutSeed = Math.floor(Math.random() * 10000) + 1;
    const mutated = mutate(selectedRecipe, 0.2, mutSeed);
    updateCurrentRecipe(mutated);
  };

  const recipeToCode = (r: SoundRecipe): string => {
    return `import type { SoundRecipe } from '@tiny-aster/arcade-sound-kit';\n\nexport const ${r.name.replace(/[^a-zA-Z0-9_]/g, "_")}: SoundRecipe = ${JSON.stringify(r, null, 2)};`;
  };

  const filteredRecipes = recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <TouchableOpacity style={styles.backButton}>
            <Text style={styles.backText}>← Arcade</Text>
          </TouchableOpacity>
        </Link>
        <Text style={styles.title}>SOUND LAB</Text>
        <View style={styles.historyButtons}>
          <TouchableOpacity style={styles.btnSmall} onPress={handleUndo} disabled={history.length === 0}>
            <Text style={styles.btnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSmall} onPress={handleRedo} disabled={future.length === 0}>
            <Text style={styles.btnText}>Redo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.mainScroll}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Procedural Generator & Seed Controls</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleRandomize}>
              <Text style={styles.btnPrimaryText}>🎲 Randomize ({activeArchetype})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleMutate}>
              <Text style={styles.btnSecondaryText}>⚡ Mutate (20%)</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.row, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Seed: {seed}</Text>
              <TextInput
                style={styles.input}
                value={String(seed)}
                keyboardType="numeric"
                onChangeText={(v) => setSeed(parseInt(v) || 42)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Variant: #{variantIndex + 1}</Text>
              <TextInput
                style={styles.input}
                value={String(variantIndex)}
                keyboardType="numeric"
                onChangeText={(v) => setVariantIndex(Math.max(0, parseInt(v) || 0))}
              />
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Visualizer & Audio Quality Metrics</Text>
          {Platform.OS === "web" ? (
            <canvas ref={canvasRef} width={600} height={140} style={{ width: "100%", height: 140, borderRadius: 6, marginBottom: 12 }} />
          ) : null}

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btnPlay, { flex: 2 }]} onPress={handlePlayAudio}>
              <Text style={styles.btnPlayText}>▶ PLAY SOUND</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1, height: 48, justifyContent: "center" }]} onPress={handleDownloadWav}>
              <Text style={styles.btnSecondaryText}>💾 Download WAV</Text>
            </TouchableOpacity>
          </View>

          {renderedAudio ? (
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Peak Level</Text>
                <Text style={styles.metricValue}>{renderedAudio.analysis.peak.toFixed(3)}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Active RMS</Text>
                <Text style={styles.metricValue}>{renderedAudio.analysis.rmsDb.toFixed(1)} dBFS</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>LUFS</Text>
                <Text style={styles.metricValue}>{renderedAudio.analysis.lufs.toFixed(1)}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>DC Offset</Text>
                <Text style={styles.metricValue}>{renderedAudio.analysis.dcOffset.toFixed(4)}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Centroid</Text>
                <Text style={styles.metricValue}>{Math.round(renderedAudio.analysis.spectralCentroidHz)} Hz</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.splitRow}>
          <View style={[styles.panel, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.panelTitle}>Recipe Gallery ({filteredRecipes.length})</Text>
            <TextInput
              style={styles.input}
              placeholder="Filter by name or category..."
              placeholderTextColor="#666"
              value={search}
              onChangeText={setSearch}
            />
            <ScrollView style={{ maxHeight: 300 }}>
              {filteredRecipes.map((r) => (
                <TouchableOpacity
                  key={r.name}
                  style={[styles.galleryItem, selectedRecipe.name === r.name && styles.galleryItemActive]}
                  onPress={() => updateCurrentRecipe(r)}
                >
                  <Text style={styles.galleryName}>{r.name}</Text>
                  <Text style={styles.galleryCat}>{r.category} • {(r.duration * 1000).toFixed(0)}ms</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.panel, { flex: 1.5 }]}>
            <Text style={styles.panelTitle}>Recipe Spec Editor</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={selectedRecipe.name}
                onChangeText={(val) => updateCurrentRecipe({ ...selectedRecipe, name: val })}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Duration (seconds)</Text>
              <TextInput
                style={styles.input}
                value={String(selectedRecipe.duration)}
                keyboardType="numeric"
                onChangeText={(val) => {
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > 0 && num <= 10.0) updateCurrentRecipe({ ...selectedRecipe, duration: num });
                }}
              />
            </View>

            <Text style={[styles.panelTitle, { marginTop: 12 }]}>Layers ({selectedRecipe.layers.length})</Text>
            {selectedRecipe.layers.map((layer: LayerSpec, idx: number) => (
              <View key={idx} style={styles.layerBox}>
                <Text style={styles.layerTitle}>Layer #{idx + 1}: {layer.kind}</Text>
                {layer.frequency !== undefined ? (
                  <Text style={styles.layerInfo}>Freq: {layer.frequency} Hz</Text>
                ) : null}
                {layer.pitch ? (
                  <Text style={styles.layerInfo}>Sweep: {layer.pitch.startHz} → {layer.pitch.endHz} Hz</Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Code Export</Text>
          <TextInput
            style={[styles.input, { fontFamily: "monospace", height: 120 }]}
            multiline
            editable={false}
            value={recipeToCode(selectedRecipe)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#06080C" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#0D111A",
    borderBottomWidth: 1,
    borderBottomColor: "#1A2233",
  },
  backButton: { padding: 8 },
  backText: { color: "#00F0FF", fontFamily: "monospace", fontWeight: "bold" },
  title: { color: "#FFF", fontSize: 20, fontFamily: "monospace", fontWeight: "bold", letterSpacing: 2 },
  historyButtons: { flexDirection: "row", gap: 8 },
  btnSmall: { backgroundColor: "#1A2233", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  btnText: { color: "#FFF", fontSize: 12, fontFamily: "monospace" },
  mainScroll: { padding: 16 },
  panel: {
    backgroundColor: "#0D111A",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1A2233",
  },
  panelTitle: { color: "#00F0FF", fontSize: 14, fontFamily: "monospace", fontWeight: "bold", marginBottom: 12 },
  row: { flexDirection: "row", gap: 12 },
  splitRow: { flexDirection: "row", marginBottom: 16 },
  btnPrimary: { backgroundColor: "#00F0FF", padding: 12, borderRadius: 6, flex: 1, alignItems: "center" },
  btnPrimaryText: { color: "#000", fontWeight: "bold", fontFamily: "monospace" },
  btnSecondary: { backgroundColor: "#FF0080", padding: 12, borderRadius: 6, flex: 1, alignItems: "center" },
  btnSecondaryText: { color: "#FFF", fontWeight: "bold", fontFamily: "monospace" },
  btnPlay: { backgroundColor: "#00FF66", padding: 12, borderRadius: 6, alignItems: "center", marginBottom: 12 },
  btnPlayText: { color: "#000", fontWeight: "bold", fontFamily: "monospace", fontSize: 16 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: { backgroundColor: "#141A26", padding: 8, borderRadius: 4, flex: 1, minWidth: 90, alignItems: "center" },
  metricLabel: { color: "#888", fontSize: 10, fontFamily: "monospace" },
  metricValue: { color: "#FFF", fontSize: 12, fontFamily: "monospace", fontWeight: "bold", marginTop: 2 },
  galleryItem: { padding: 8, borderRadius: 4, marginBottom: 4, backgroundColor: "#141A26" },
  galleryItemActive: { backgroundColor: "#1A2A40", borderWidth: 1, borderColor: "#00F0FF" },
  galleryName: { color: "#FFF", fontSize: 12, fontFamily: "monospace", fontWeight: "bold" },
  galleryCat: { color: "#888", fontSize: 10, fontFamily: "monospace" },
  formGroup: { marginBottom: 8 },
  label: { color: "#AAA", fontSize: 11, fontFamily: "monospace", marginBottom: 4 },
  input: { backgroundColor: "#141A26", color: "#FFF", padding: 8, borderRadius: 4, fontFamily: "monospace", fontSize: 12 },
  layerBox: { backgroundColor: "#141A26", padding: 8, borderRadius: 4, marginBottom: 8 },
  layerTitle: { color: "#FF0080", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" },
  layerInfo: { color: "#AAA", fontSize: 10, fontFamily: "monospace" },
});
