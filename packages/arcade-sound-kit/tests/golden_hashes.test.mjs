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

  // Golden expected hashes (v0.3.0 quality enhancements: PolyBLEP + isolated RNG + crossfade + biquad bandpass)
  const GOLDEN_HASHES = {
    shoot: '03816a635827274f8fcd70cc946de3aad22cac9a040d887bbcab62b26f01ba4f',
    shoot_enemy: '14a67b6094f71775ba9d8a178ebfcfeefcc2e92e7730d7f5228c29d3316247ff',
    hit: '72f7aa05db47db0ab71c5ae10787c7618725b00b332379f8930c68e66e5f0eaa',
    hit_critical: '825dac480f0db1e0edb32fd1567074eb9f13409c0bba729ec792ee116452bd53',
    explosion_small: '088db7397c134fdf132a46792bcabce6442119d8497049c7336058c1df0b6a6b',
    explosion_large: 'e8ea7aafe15d82cf173f7be4ff8cb5d2f66240ca2d4fa77a8cc378a6205d01ea',
    shield_hit: '970dfa685a51a4c97d259db98f2041ba4fab80be6b23a03475812a47332fd942',
    shield_break: 'f90b3fe5f602ecfe5debb35d262bf71da6e6b4b42812c9d5a3c83f304fa1b07b',
    reload: '81d3403754c6f1ece9e192fc82bb6c23a84badee403a921dec4e495b876e3958',
    cooldown_ready: 'c3c06ffe771e03fee66e2e7ed02b3906177a9138d230e5a2712241c2d212629f',
    parry: 'fa2822bdb054957fc1cca77ed44a3063df64b5facc9f255a17ea210b1371148d',
    jump: '7fe577a02ba816acb7aef9d01435c1e7ea79bdf98c27fb7e37379b760102003c',
    land: 'a2629562501de48a36d6db5d2678524d90f4642e4fa8c887ac59fbefbefae640',
    land_heavy: '3254b36d42ae7a33123b4d887090907e2cc265f736c11759e3587e8d6701d198',
    dash: 'b9c2d0dd299eab92a10f045c78cafa2e2908a0e2b92368794f7e4dd3c11a9963',
    wall_slide: '7389cfdac5052baf0e112f85523e5bc05a7f2186fcd1c30155dcd67a9fe88ff6',
    bounce: '661b9e883bf1343c80e5ebe996c20187b7c9d926b6826ce4c4ecdfa7cda633e1',
    spin_charge: 'ea089a0b487eb66120272017259d65a5f59eababed6a5bb6062ec7f8bf131d41',
    flap: '058fe82f3b408f9374505b97adcc730a7db26dc66152ad6a8560eaf2ab5beb5f',
    glide_loop: '4eb18642f2dc044b9bc57f53b54115b52450f44cd19ad2c1160f51faa822fe3b',
    wrap: '3b5a06c1a8b4b046ca9e8e1788564d952903a8b28e9b236d0e0fefa0b1bebd7b',
    thrust_loop: '23c8b6b84e8bbffd1d937e506f8a4bedaf85b7fc8a1858dc8414874a2baa656c',
    score: '70f90b1dbe4975be95e9096a41a90558c1a2a351984159eb5a375724a9f7bde5',
    combo_up: 'ff99a838ef1a555ce9339bd6b5301bc433cb632ce294ab35b28fbd2ff0a720f4',
    combo_break: '583327d4dd537bfd10950478d4e4d31567234d39079f6caeb111d6714ba8854a',
    powerup_pickup: '2eb0c2c3f10ef9c05037884c1576249c077982e71b92b79bfabfb381d463ab38',
    powerup_expire: '8545066cdf5ebd2a737d2d952a0cf9456f58d978d701cb0a33fee03e759a9a03',
    collectible_pickup: '0fc1845eda6f03429d85a20b0dd550c3296ebe230075d91f7c9d1c1cdf654097',
    achievement_unlock: '351ebaea7dfca84dd9e3f807beced360a2e257f6b4ef71bd975aa5865c5693e3',
    level_up_jingle: 'd389caad8f1236db9a48895b39928ba9fea40995d88508684fd7424311bde73b',
    game_over: '51e24b6f0a69108ef112b8e3b7be3c65054689011dc57b5fb523701a66738a3a',
    wave_start: '041190795c58be8db7ad173c49a5d70b8a1c71c372563f6e9eca0d273dd158ff',
    boss_incoming: '6c8ab5317ce92342c67c389fbeaf7c0c10af1fd530b29ed4ebd99d8930f01e8e',
    menu_select: '07b5ba6c913fd1dfda6e985d30e8262b31d7376c10c5e03749b6ca0679d644c8',
    menu_confirm: 'c0f57d434e946f555513e18f8939846f9320eb042b4b0d0a6169910fe518bdfa',
    game_over_jingle: '0e9807d56ad2a8a48c92d83c2a5a0301ecab25364e0e1b153547ceb499ada8d6',
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
