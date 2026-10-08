// Static source-contract checks for the portfolio GUI/UX audit.
// These checks are intentionally narrow and cannot replace browser,
 // assistive-technology, visual-regression or Cloudflare runtime tests.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');
const home = read('src/pages/index.astro');
const music = read('src/components/MusicShelf.astro');
const header = read('src/components/PortfolioHeader.astro');
const footer = read('src/components/PortfolioFooter.astro');
const modes = read('src/components/SeriousModeToggle.astro');
const sophia = read('src/pages/sophia.astro');
const motion = read('src/components/DecorativeMotion.astro');
const image = read('src/components/MotionImage.astro');
const config = read('src/config.ts');

let failures = 0;
let checks = 0;
function check(label, condition) {
  checks += 1;
  if (condition) {
    console.log('PASS ' + label);
  } else {
    failures += 1;
    console.error('FAIL ' + label);
  }
}
const hasId = (source, tag, id) =>
  new RegExp('<' + tag + '\\b[^>]*\\bid="' + id + '"').test(source);

for (const [section, title] of [
  ['traducao', 'translation-title'],
  ['reflexao', 'essay-title'],
  ['arquitetura', 'architecture-title'],
  ['curadoria', 'knowledge-title'],
  ['documentacao', 'documentation-title'],
]) {
  check(section + ': section exists', hasId(home, section === 'traducao' || section === 'curadoria' ? 'article' : 'a', section));
  check(section + ': H3 heading exists', hasId(home, 'h3', title));
}
for (const [id, title] of [
  ['reflexao', 'essay-title'],
  ['arquitetura', 'architecture-title'],
  ['documentacao', 'documentation-title'],
]) {
  const tag = home.match(new RegExp('<a\\s+id="' + id + '"[\\s\\S]*?>'));
  check(id + ': short accessible name + new tab notice',
    Boolean(tag?.[0]?.includes('aria-labelledby="' + title + ' ' + title + '-new-tab"')) &&
    home.includes('id="' + title + '-new-tab"'));
}
check('lab cards: 5 standardized statuses',
  (home.match(/data-status="(?:progress|published)"/g) || []).length === 5);
check('music: static section anchor', hasId(music, 'section', 'musica'));
check('music: no-JS fallback', music.includes('<noscript>') && music.includes('SOCIALS.lastfm'));
check('music: error/fallback containers', music.includes('data-music-loading') && music.includes('data-music-profile'));
check('music: playback state available', music.includes('track.nowPlaying'));
check('music: polling and visibility pause', music.includes('setInterval(') && music.includes('visibilitychange') && music.includes('document.hidden'));
check('music: only announce track change', music.includes('trackKey !== lastTrackKey') && music.includes("aria-live', 'polite'"));
check('nav: lab label aligned', header.includes('data-nav-section="lab">Laboratório</a>'));
check('nav: music static link', header.includes('href="/#musica"'));
check('nav: scrollspy state', header.includes("setAttribute('aria-current', 'true')"));
check('hero: actions follow manifesto', home.indexOf('class="hero-actions"') > home.indexOf('class="hero-statement"'));
check('hero: download action', home.includes('class="cv-download-button"') && home.includes('download="Kaue-Alencar-Curriculo.pdf"'));
check('contact: LinkedIn action', home.includes('class="button closing-linkedin-button"'));
check('contact: decorative glyph hidden', home.includes('<span aria-hidden="true">✦</span>'));
check('footer: Last.fm uses configured handle', footer.includes('SOCIALS.lastfmHandle') && config.includes("lastfmHandle: '@kauealencar123'"));
check('sophia: named sigil control', sophia.includes('aria-describedby="sophia-orbit-help"'));
check('sophia: accessible numbered controls', sophia.includes('aria-label={\x60Exibir fragmento'));
check('modes: preserve three-state control',
  modes.includes("['authorial', 'editorial', 'legacy']") && modes.includes('Modo atual: ') && modes.includes('Mudar para '));
check('motion: viewport and reduced preference', motion.includes('IntersectionObserver') && motion.includes('prefers-reduced-motion: reduce'));
check('motion: two simultaneous loops', motion.includes('.slice(0, 2)'));
check('motion: static image fallback', image.includes('prefers-reduced-motion: reduce') && image.includes('data-motion-still'));
console.log('Static UX contract: ' + (checks - failures) + '/' + checks + ' passed.');
if (failures) process.exitCode = 1;
