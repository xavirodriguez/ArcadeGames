import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { arcadePack } from '../dist/design/pack.js';
import { render, RENDER_VERSION, DEFAULT_SAMPLE_RATE } from '../dist/core/render.js';
import { RNG } from '../dist/core/random.js';

function hashBuffer(buf) {
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const GOLDEN_HASHES = {
  shoot: '9a4e37db348d5267a4c02f03f963c6ebe9007c9b6efcf2137ae2fbfd988f29da',
  shoot_enemy: '3a28876cd0ddbbf22a49c48cc607ee9fe29459f9172319977d2a18b45fbb83d7',
  hit: '70dbbae3f7036c01aeaa84b4cba180132c3adc0f9e15b6c74487987cbbaec5cc',
  hit_critical: '289be890c718663ee7a822cd3cb40035fd6b517508ab7c3dc4b2c82203200e71',
  explosion_small: '5ec6363ba4efac0da0bfda54bc3e8168e4b24418e29400109c1064a6e2535725',
  explosion_large: '9e3e00392d5ea66b14aa4f36a499edc2c56820175ee5acbdbf3797606694d7cc',
  shield_hit: '8a56f00a96084588c163a8bd731b0bf28f552a53c8bc73174faa28af1022b3b4',
  shield_break: 'a760da1fc2afcbccc28de4a0f4011f26d999b718fc2b1a152bf183ee32e622fd',
  reload: 'ffce6567211c5ffe41c115d4b40db4d1b2397ab4e4d62bd23246e271088d93c1',
  cooldown_ready: 'e7345183b650d878fe7e12e3473b5a6605bbf4f9cef9b4a7c95eea59dcfe61df',
  parry: 'db7fa0f1137b42d0c5ed98f1facc3d98944176cf1a0424c3bd50f3c59186a996',
  jump: '911c538fcea04b881d67f94badb27414cc5bc6712c7132dcd4ed39831bd4aa21',
  land: '321e1cfa7f13ba4809f8824a48c44e277a563ef6ea7eea3b9f5d64f4924bc3ae',
  land_heavy: '041b037d13d9d711cdc06ba9ba17de86723c369cb16a960b9a0b386cffc700b2',
  dash: '2fd995b1f523137e72069c08fb8b3aee8d2fc22ecef3ff679329d25c6c45972d',
  wall_slide: '48a5f51b1b8d6f34f2ab3d247d0aac78ac68f3a6e2f0fdb516f36281def8c882',
  bounce: 'e53de60ba9c263c9c75524343b9da9523c80d17c80d28e2404ac7dcf968199fa',
  spin_charge: '76953005fa157a9e7267eb831853e70306397df4bcd3ae20e5f971e11c61d15f',
  flap: '6ad18645ea5b4a9781b2252ecd5bac3f78403207ae3e60f989470ea0919b93f5',
  glide_loop: '396951df2661f36a713d3950df21eb154b301584aea6fbfcc546acf37818e0f1',
  wrap: 'd233e35d46984c54007babc9664b54313c95502640c2f0742c9d2ab0af9b9c13',
  thrust_loop: '87de3ce9f15a427b06acd04993659e7f1a10d587a57f22f0537a9bbae8d92b3c',
  score: 'adc7f5c79fced7a711ce9f61e0745edb79b233ab8d47468768dc983eed511809',
  combo_up: '558a1eecb6472f53a864e3291bead608c42e73f6c9617b4243f7c69aa9d52145',
  combo_break: '1e19dcecbbe471eefae7fce9380f67bf602129ce40cd0f79b19a21096b301f6a',
  powerup_pickup: 'f070d0409de30adc8e688e8447e857d8ce174f67365d29cbd8cb23dd6535cfe4',
  powerup_expire: '2a05ab9b98857f6bf68c9d2bc950396da729c6090116cdafc42a61cc65570418',
  collectible_pickup: '4dc9a0938ab439cc0d6d7ac17626c2a3ab1d0ced7bedde227b5930ae874108f3',
  achievement_unlock: '59af86e6fb9f1561c6b1b0ae1395633c1fd4bad7855a6fe802bf12b892e12d40',
  game_over: '54eb893bcf5e595f0d4a847bfcbdd71eb1724f9691d9f01a96636f112292f133',
  wave_start: '5b22f8d64fc3849a814c6c22821c3eb822489a08799962f4d367bb004aac103e',
  boss_incoming: '34a73f2f285b1496e75edec0bfa262dcc8bcffe763753b422a5de0342e9b9d12',
  menu_select: '539f95120c1a9d04a21af09126f895f1537adcf73c1f567a1d9e8b290ed866f8',
  menu_confirm: '8a952efbb4dbb662cce115a96c56e4f145e6dcce2805e3b087cf6456f92a3663',
};

test('RENDER_VERSION constant is exported as 0.2.0', () => {
  assert.equal(RENDER_VERSION, '0.2.0');
});

test('golden hashes regression test: all 34 recipes match expected SHA256 hashes', async () => {
  const pack = arcadePack();
  assert.equal(pack.length, 34);

  for (const recipe of pack) {
    const samples = await render(recipe, { sampleRate: DEFAULT_SAMPLE_RATE }, new RNG(42));
    const h = hashBuffer(samples);
    const expected = GOLDEN_HASHES[recipe.name];

    assert.ok(expected, `missing golden hash for recipe ${recipe.name}`);
    assert.equal(
      h,
      expected,
      `golden hash mismatch for recipe ${recipe.name}: expected ${expected}, got ${h}`
    );
  }
});
