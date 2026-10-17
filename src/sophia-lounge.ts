/**
 * Sala gamer da Sophia: quarto escuro, vista de perfil. Ela está sentada no
 * tapete, com um sofá vermelho atrás, o controle nas patas e óculos 3D; do
 * outro lado da sala ficam os monitores e um rack cheio de equipamentos.
 * Ilustração vetorial gerada no build; as animações vivem em sophia-illustration.css.
 */
import { foxDefs, foxMarkup } from './sophia-lounge-fox.ts';
import { SCENE_H, SCENE_W, floorDetails, lightSpill, moonWindow, mug, neon, roomDefs, roomShell, rug, sofa } from './sophia-lounge-room.ts';
import { wallDefs, wallMarkup } from './sophia-lounge-wall.ts';

export { SCENE_H, SCENE_W };

export function loungeMarkup(): string {
  return `<svg class="sophia-art sophia-art--lounge" viewBox="0 0 ${SCENE_W} ${SCENE_H}" aria-hidden="true" focusable="false">
<defs>${roomDefs()}${wallDefs()}${foxDefs()}</defs>
${roomShell()}
${moonWindow()}
${neon()}
${wallMarkup()}
${sofa()}
${rug()}
${floorDetails()}
${mug(604, 454)}
<g class="slo-fox" transform="translate(336 444) scale(.8)">${foxMarkup()}</g>
${lightSpill()}
</svg>`;
}
