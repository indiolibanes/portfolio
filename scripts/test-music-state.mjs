// Exercise the actual inline MusicShelf script with minimal browser doubles.
// Run with: node scripts/test-music-state.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/components/MusicShelf.astro', import.meta.url), 'utf8');
const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'MusicShelf inline controller must exist');

function element() {
  const attributes = {};
  const classes = new Set();
  return {
    hidden: true,
    dataset: {},
    textContent: '',
    attributes,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    setAttribute: (name, value) => { attributes[name] = String(value); },
    removeAttribute: (name) => { delete attributes[name]; },
    getAttribute: (name) => attributes[name],
    appendChild: () => {},
    querySelector: () => null,
  };
}

async function scenario({ playlists = false, replies }) {
  const selectors = [
    '[data-music-shelf]', '[data-recent-card]', '[data-track-artwork]',
    '[data-artwork-fallback]', '[data-track-title]', '[data-track-artist]',
    '[data-track-album]', '[data-track-link]', '[data-track-status]',
    '[data-track-age]', '[data-status-dot]', '[data-music-loading]',
    '[data-music-profile]',
  ];
  const nodes = Object.fromEntries(selectors.map((selector) => [selector, element()]));
  const shelf = nodes['[data-music-shelf]'];
  shelf.dataset.hasPlaylists = String(playlists);
  let interval = null;
  let counter = 0;

  const document = {
    hidden: false,
    querySelector: (selector) => nodes[selector] ?? null,
    createElement: () => element(),
    addEventListener: () => {},
  };
  const window = {
    setInterval: (callback, delay) => {
      assert.equal(delay, 90000);
      interval = callback;
    },
  };
  const fetch = async () => {
    const reply = replies[counter++];
    assert.ok(reply, 'No mocked Last.fm response left');
    if (reply.throw) throw Error('Network unavailable');
    return {
      ok: reply.ok !== false,
      json: async () => ({ track: reply.track ?? null }),
    };
  };

  runInNewContext(script, { document, window, fetch, AbortSignal, console: { debug: () => {} } });
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  await flush();
  return { nodes, shelf, refresh: async () => { assert.ok(interval); interval(); await flush(); } };
}

const failure = await scenario({ playlists: true, replies: [{ ok: false }] });
assert.equal(failure.shelf.dataset.musicState, 'error');
assert.equal(failure.nodes['[data-music-profile]'].hidden, false);
assert.equal(failure.nodes['[data-music-loading]'].hidden, false);
assert.equal(failure.shelf.attributes['aria-busy'], 'false');

const empty = await scenario({ playlists: true, replies: [{ track: null }] });
assert.equal(empty.shelf.dataset.musicState, 'empty');
assert.equal(empty.nodes['[data-music-profile]'].hidden, false);
assert.match(empty.nodes['[data-music-loading]'].textContent, /Nenhuma audição/);

const offline = await scenario({ replies: [{ throw: true }] });
assert.equal(offline.shelf.dataset.musicState, 'error');
assert.equal(offline.nodes['[data-music-profile]'].hidden, false);

const track = {
  name: 'Faixa', artist: 'Artista', album: 'Álbum',
  nowPlaying: true, playedAt: Date.now(), artwork: '', url: '',
};
const playing = await scenario({
  replies: [{ track }, { ok: false }],
});
assert.equal(playing.shelf.dataset.musicState, 'playing');
assert.equal(playing.nodes['[data-recent-card]'].hidden, false);
assert.equal(playing.nodes['[data-music-profile]'].hidden, true);
await playing.refresh();
assert.equal(playing.shelf.dataset.musicState, 'error');
assert.equal(playing.nodes['[data-recent-card]'].hidden, true,
  'A stale now-playing card must disappear on API failure');
assert.equal(playing.nodes['[data-music-profile]'].hidden, false);

const recent = await scenario({
  replies: [{ track: { ...track, nowPlaying: false } }],
});
assert.equal(recent.shelf.dataset.musicState, 'recent');
assert.equal(recent.nodes['[data-recent-card]'].hidden, false);

console.log('Music state tests passed: HTTP error, empty, offline, playing, stale refresh, recent.');
