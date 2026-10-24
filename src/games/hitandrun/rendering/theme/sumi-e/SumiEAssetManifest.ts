/**
 * Typed asset manifest and placeholders for Sumi-e visual theme.
 */

export interface SumiEFrameSpec {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface SumiEAnimationSpec {
  readonly frames: ReadonlyArray<SumiEFrameSpec>;
  readonly fps: number;
  readonly loop: boolean;
}

export interface SumiEVisualAssetSpec {
  readonly visualId: string;
  readonly atlasPath: string;
  readonly anchorX: number; // 0.5 = center, 1.0 = feet bottom
  readonly anchorY: number; // 1.0 = feet bottom
  readonly baseScale: number;
  readonly animations: Record<string, SumiEAnimationSpec>;
}

export const SUMI_E_ASSET_MANIFEST: Record<string, SumiEVisualAssetSpec> = {
  player: {
    visualId: "player",
    atlasPath: "assets/themes/sumi-e/characters/ronin.png",
    anchorX: 0.5,
    anchorY: 1.0,
    baseScale: 1.0,
    animations: {
      idle: { frames: [{ x: 0, y: 0, w: 64, h: 64 }], fps: 6, loop: true },
      walk: { frames: [{ x: 64, y: 0, w: 64, h: 64 }], fps: 8, loop: true },
      attack: { frames: [{ x: 128, y: 0, w: 64, h: 64 }], fps: 12, loop: false },
      hurt: { frames: [{ x: 192, y: 0, w: 64, h: 64 }], fps: 10, loop: false },
      death: { frames: [{ x: 256, y: 0, w: 64, h: 64 }], fps: 6, loop: false }
    }
  },
  blue_oni: {
    visualId: "blue_oni",
    atlasPath: "assets/themes/sumi-e/enemies/blue_oni.png",
    anchorX: 0.5,
    anchorY: 1.0,
    baseScale: 1.2,
    animations: {
      idle: { frames: [{ x: 0, y: 0, w: 80, h: 80 }], fps: 6, loop: true },
      walk: { frames: [{ x: 80, y: 0, w: 80, h: 80 }], fps: 8, loop: true },
      attack: { frames: [{ x: 160, y: 0, w: 80, h: 80 }], fps: 10, loop: false },
      hurt: { frames: [{ x: 240, y: 0, w: 80, h: 80 }], fps: 10, loop: false },
      death: { frames: [{ x: 320, y: 0, w: 80, h: 80 }], fps: 6, loop: false }
    }
  },
  red_oni: {
    visualId: "red_oni",
    atlasPath: "assets/themes/sumi-e/enemies/red_oni.png",
    anchorX: 0.5,
    anchorY: 1.0,
    baseScale: 1.1,
    animations: {
      idle: { frames: [{ x: 0, y: 0, w: 72, h: 72 }], fps: 6, loop: true },
      walk: { frames: [{ x: 72, y: 0, w: 72, h: 72 }], fps: 10, loop: true },
      attack: { frames: [{ x: 144, y: 0, w: 72, h: 72 }], fps: 12, loop: false },
      hurt: { frames: [{ x: 216, y: 0, w: 72, h: 72 }], fps: 10, loop: false },
      death: { frames: [{ x: 288, y: 0, w: 72, h: 72 }], fps: 6, loop: false }
    }
  },
  skeleton_warrior: {
    visualId: "skeleton_warrior",
    atlasPath: "assets/themes/sumi-e/enemies/skeleton_warrior.png",
    anchorX: 0.5,
    anchorY: 1.0,
    baseScale: 1.0,
    animations: {
      idle: { frames: [{ x: 0, y: 0, w: 60, h: 60 }], fps: 6, loop: true },
      walk: { frames: [{ x: 60, y: 0, w: 60, h: 60 }], fps: 6, loop: true },
      attack: { frames: [{ x: 120, y: 0, w: 60, h: 60 }], fps: 10, loop: false },
      hurt: { frames: [{ x: 180, y: 0, w: 60, h: 60 }], fps: 10, loop: false },
      death: { frames: [{ x: 240, y: 0, w: 60, h: 60 }], fps: 6, loop: false }
    }
  },
  tengu_bird: {
    visualId: "tengu_bird",
    atlasPath: "assets/themes/sumi-e/enemies/tengu_bird.png",
    anchorX: 0.5,
    anchorY: 1.0,
    baseScale: 1.05,
    animations: {
      idle: { frames: [{ x: 0, y: 0, w: 64, h: 64 }], fps: 8, loop: true },
      walk: { frames: [{ x: 64, y: 0, w: 64, h: 64 }], fps: 12, loop: true },
      attack: { frames: [{ x: 128, y: 0, w: 64, h: 64 }], fps: 12, loop: false },
      hurt: { frames: [{ x: 192, y: 0, w: 64, h: 64 }], fps: 10, loop: false },
      death: { frames: [{ x: 256, y: 0, w: 64, h: 64 }], fps: 6, loop: false }
    }
  }
};

/** AI Image Generation Prompts for Sumi-e Assets */
export const SUMI_E_ASSET_PROMPTS = [
  {
    assetId: "ronin",
    description: "Ronin warrior wearing kasa straw hat, traditional garb, holding vintage rifle",
    dimensions: "1024x1024",
    view: "side-view facing right",
    prompt: "Modern ukiyo-e sumi-e ink illustration of a Japanese ronin warrior wearing a woven kasa straw hat, holding a long matchlock rifle, ink wash texture, vermilion red accents, parchment background, side profile facing right, transparent background --v 6.0"
  },
  {
    assetId: "blue_oni",
    description: "Giant blue oni demon with horns, claws, traditional tattoos and loincloth",
    dimensions: "1024x1024",
    view: "side-view crouched facing right",
    prompt: "Japanese sumi-e ink painting of a fierce giant blue oni demon with horns, sharp claws, body tattoos, crouching pose facing right, expressive brushstrokes, parchment texture background, transparent background --v 6.0"
  },
  {
    assetId: "red_oni",
    description: "Armored red oni samurai demon charging with katana",
    dimensions: "1024x1024",
    view: "side-view facing right",
    prompt: "Sumi-e ink brush painting of a red-skinned oni demon warrior in dark samurai armor charging forward with a katana, rich vermilion ink accents, parchment texture, transparent background --v 6.0"
  },
  {
    assetId: "skeleton_warrior",
    description: "Skeletal warrior in tattered robes holding a spear",
    dimensions: "1024x1024",
    view: "side-view facing right",
    prompt: "Traditional Japanese ink sumi-e illustration of a skeleton warrior in ancient robes, holding a spear, dark ink wash, gold powder specks, side profile facing right, transparent background --v 6.0"
  },
  {
    assetId: "tengu_bird",
    description: "Avian tengu creature with crow wings and martial robes flying forward",
    dimensions: "1024x1024",
    view: "side-view facing right",
    prompt: "Sumi-e ink artwork of a crow tengu bird creature with feathered wings, martial artist robes, airborne pose facing right, dynamic brush splatters, transparent background --v 6.0"
  },
  {
    assetId: "torii_gate",
    description: "Ancient wooden torii gate props in sumi-e style",
    dimensions: "1024x1024",
    view: "front/side 3/4 view",
    prompt: "Japanese sumi-e ink painting of an ancient weathered wooden torii gate with vermilion red top beam, ink wash, misty atmosphere, parchment background, transparent background --v 6.0"
  },
  {
    assetId: "ghost_dragon",
    description: "Ethereal oriental dragon floating in clouds",
    dimensions: "2048x1024",
    view: "panoramic horizontal side view",
    prompt: "Monochrome sumi-e ink painting of a long serpentine Chinese/Japanese dragon weaving through clouds, translucent faded ink style, ghost dragon, gold accents, transparent background --v 6.0"
  },
  {
    assetId: "ofuda_talisman",
    description: "Glowing paper spell talisman ofuda projectile",
    dimensions: "512x512",
    view: "side floating",
    prompt: "Sumi-e ink rendered paper talisman ofuda spell seal, black calligraphy on yellow paper with glowing golden/orange halo, game projectile sprite, transparent background --v 6.0"
  }
];
