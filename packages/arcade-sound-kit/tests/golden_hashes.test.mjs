import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { arcadePack } from '../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE, RENDER_VERSION } from '../dist/core/render.js';

function computeBufferHash(samples) {
  const buf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

test('RENDER_VERSION is bumped to 0.3.0', () => {
  assert.equal(RENDER_VERSION, '0.3.0');
});

test('Golden regression hashes for all arcadePack recipes', async () => {
  const pack = arcadePack();
  const sampleRate = DEFAULT_SAMPLE_RATE;
  const seed = 42;

  const GOLDEN_HASHES = {
    shoot: '7f3f47020723240a3592d505b9e1d312e4046ff7a98d7059d3132ea2d787fce1',
    shoot_enemy: '23c60570780ad918879f4c94aeb10758a3c8d00f57c988afc2f46015b3109679',
    hit: 'ab810e34c392f5b42de9b3e54cdf8ce21ba8e23b07693a314b52013958a74dcf',
    hit_critical: '805a2d823354f5003b4de7a6caccfd6497297320e5ee665e9932052c9c3448da',
    explosion_small: '7783fb50d7d9edfa5cde8b3f32aed0d1ddce021b0b8b44a28f4485bfa0dacda6',
    explosion_large: 'cbd4bf9b4c2bedfafb681d9a60055f6c1e68ecdaccdce337a09446cf3ea25667',
    shield_hit: '2e87b2bcbb38aae65b42c0ae6358130ac334bdd4084df6c890f3137d26fae240',
    shield_break: '1c20454c954b0defbaa411a0309bc20d3c9935a4b927779edd264c8497e41585',
    reload: 'd70da1f6e2ecb2e642bf096a99d6e525881bc074d7999e7babdcff5a396f8623',
    cooldown_ready: '3349a5efe90a04946b7372d9730e713a1dde1945fb9bdcc2f05580d52f5f5c17',
    parry: '34d89dad44555db7857dbebd8b1e39e4f3c04bde1edabae14d3a5a2a54b59557',
    jump: '857c80dfeeeee8460a45067544fca781c47b906d160d0081edd1298cf2c2f8a9',
    land: 'c763743b8012c87633948741038c23287804fd02053fa45f54db48f6d8d2ece2',
    land_heavy: '0e1db8977bd6a2daa8ba468c48bc3bf24b1f488ca508f61692f14fff9ae23601',
    dash: 'a14fe7aea4f9cd4754c4cfcf06235deac4305b19d146439d60dffbaf60c57a35',
    wall_slide: '2d20919a9735ac43e6e0815cd997ead3e46a01c4430da75c64460fe87d92f74a',
    bounce: '5deac347e30931bbf4bb69f8915fcfbf16d5018b1f9640a3481943f6b6d56ec0',
    spin_charge: '2883a69aa0935ba58a55dcdb38ddd7dcc9cdb9733381f45444ba849719aa3181',
    flap: '497012768b49252a4f4f5bd0af62c665b9c13abd4f1f1babfc778fbe74a383bf',
    glide_loop: '04c790e6480b0549a5f00f2a45bf639bc25aebe98d25c43f7bb19dcaf0c58d2a',
    wrap: 'b3c9845ba37f54b057689ca20656d906de492e2521b08a38290e9ebbbffebee3',
    thrust_loop: '82b238196a8eaad38d147358e141649159e8dd3765af5e7fc891377929c8d946',
    score: '07ca9e0dadd58a4434b396168d7415dd84fd320784cb5c395cc927be0d717b8e',
    combo_up: 'd30151372c6af5f285e52b978a2c8f63368c1385d8957f2ed94d51eaf74a8796',
    combo_break: '3e18adb850af9ceaad906fce9a4ff19c16688ac0f0d27c162a0545c4973570b5',
    powerup_pickup: 'b323b5f14d6add0208f5e75ed825fa03760d19b2301ccd6099c578b70294148f',
    powerup_expire: '132113564eb2820f5d1fb2ff8af59466cc1b6aedd29a67e4811d85103c0a3f9d',
    collectible_pickup: '396a3c18882ee91305aa07e0be39eb887378952049ec784fe0c08264b29a21b5',
    achievement_unlock: '9f656f4910e3cd2d3faaa073c6937b77455a98756a2137d510fc2d1967fc1e1b',
    level_up_jingle: '6f5e5084820d69f2cd48d6a36645df62f63923eb6a715641a52fb77ba623de29',
    game_over: '4f0081135173d14292856babbf99026447e62460de1061218939bd8f81193853',
    wave_start: '352edf1577186b1a219bac628e334773580c71dba48fd3ce650202058eb00b39',
    boss_incoming: '5ea9f992eb9757cf780dc850573645f9fccfb4cdec64f33ccf3a5095a4158f1b',
    menu_select: 'e4fe28392cf5f889febc237e4d1455ae2b424cf57461d531da186a0d85b6fa4c',
    menu_confirm: '6f2769dda16596c9cfb9fb3247aaeaf450d1f2bb8d36bc7a21d54e72ac4c9674',
    game_over_jingle: '733613fcb3f75ab902eeb489e6912280ed5933c9fe473cfcaef9d4a6108b6582',
  };

  for (const recipe of pack) {
    const buf = await render(recipe, { sampleRate, seed });
    const actual = computeBufferHash(buf);
    assert.equal(
      actual,
      GOLDEN_HASHES[recipe.name],
      `Regression failure: Golden audio hash mismatch for recipe "${recipe.name}"`
    );
  }
});
