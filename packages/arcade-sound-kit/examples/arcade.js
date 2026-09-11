const {
  defineSound,
  layers,
  tone,
  noiseBurst,
  subBoom,
  zap,
  generateSet,
} = require('../dist');

// Example custom recipe – can be mixed with arcadePack() results.
const customExplosion = defineSound('custom_explosion', {
  category: 'combat',
  duration: 0.55,
  variation: { pitch: 0.04, levelDb: 1, duration: 0.05 },
  tags: ['explosion', 'custom'],
  layers: layers(
    subBoom({ startHz: 140, endHz: 35, duration: 0.45, level: -4 }),
    noiseBurst({ filter: [100, 4500], decay: 0.4, level: -7 }),
    tone({ wave: 'square', startHz: 900, endHz: 160, duration: 0.15, level: -16 })
  ),
});

const customThrust = defineSound('custom_thrust', {
  category: 'movement',
  duration: 0.4,
  loop: true,
  bitcrush: 0.2,
  tags: ['engine', 'loop'],
  layers: layers(
    noiseBurst({ filter: [60, 800], decay: 0.38, level: -10 }),
    zap({ startHz: 90, endHz: 70, duration: 0.35, level: -16 })
  ),
});

module.exports = [customExplosion, customThrust];
