# Sophia Lab R2.0 — Relatório (candidato, 2026-11-14)

**Status geral: CANDIDATO PARCIAL.** O GLB anima e roda em WebGL2 real (Chromium, GL por software), mas faltam Blender (.blend), build Astro, medição em celular e aprovação visual do proprietário. O critério final da R2.0 ("reconhecer-se como a mascote, sem comprometer o desempenho") **não está comprovado**.

## O que foi entregue
- `Sophia_Lab_v1.1_Animated.glb` (6,0 MB; sha256 `516610da…0ac`): geometria, pesos, IBM e textura **idênticos byte a byte** ao v1.0; 68 nós `matrix` → TRS; 6 animações novas.
- `Sophia_Lab_v1.0_TRS.glb`: intermediário só normalizado (sem animações), para comparação.
- `Sophia_Lab_Animation_Manifest.json`, `metrics.json`, renders (frente/¾/perfil/costas, comparação original×TRS, folhas de contato por clipe, capturas do WebGL real) e GIFs por clipe.
- Código de integração (draft PR, sem GLB): registro de modelos por variante no ator, diretor de gestos, variante `lab`, 6 testes novos.

## Auditoria do arquivo
Confirmados: 65 juntas Mixamo, 24.095 vértices, 10.547 triângulos, 1 malha, 1 material, textura 4096², 0 animações, 0 morphs, 68 nós com `matrix`. Hierarquia, IBM e pesos íntegros (BIN idêntica).

## Clipes (30 fps, 66 canais: rotação das 65 juntas + translação do Hips)
| Clipe | Dur. | Laço | Salto máx. de quat/quadro | Deriva dos pés | Folga mão–corpo mín. |
|---|---|---|---|---|---|
| Lab_Idle_Breath_R1 | 4,0 s | sim | 1,66° | 1,08 mm | 44,8 mm |
| Lab_Observe_R1 | 6,0 s | não | 0,89° | 0,36 mm | 34,9 mm |
| Lab_Think_R1 | 5,0 s | não | 11,3° (dedos, ver nota) | 0,22 mm | 34,6 mm |
| Lab_Point_R1 | 4,0 s | não | 5,9° | 0,22 mm | 46,9 mm |
| Lab_Greet_R1 | 3,2 s | não | 8,8° | 0,22 mm | 23,9 mm |
| Lab_Return_R1 | 1,2 s | não | 5,4° | 0,22 mm | 44,3 mm |

Os gestos começam e terminam na pose neutra (diferença 0,0°); `Lab_Return_R1` parte de uma pose de gesto (78° por projeto) e vai ao repouso. Nota Think: o maior passo por quadro (11,3° ≈ 340°/s) ocorre na mão direita; a variação entre quadros consecutivos é pequena (1,26°), então não é um estalo, mas é o ponto mais rápido da biblioteca e não foi revisado em vídeo.

Correção feita nesta rodada: o Greet tinha um salto de 31° no antebraço (cotovelo quase esticado). O IK de braço agora limita o alcance a 97% do comprimento do braço (pernas mantêm o limite original) e a mão do Greet foi reposicionada; passo máximo caiu a 8,8°, folga 23,9 mm.

## Integração (draft PR, empilhado sobre #307)
- `sophia-actor.js`: `MODELS` (chave → GLB, clipe de repouso, centro, clipes de uma execução, fallback), um palco/GL por modelo. O `MODEL_URL` global e os demais atores não mudam.
- `lab-r2` → `/assets/models/sophia/sophia-lab-v1.1.glb`; se faltar/falhar, cai para o modelo padrão com o clipe anterior e, depois, para a ilustração 2D.
- `sophia-lab-director.js`: respiração em laço; gesto a cada 5–8 s de tempo simulado (não avança fora da viewport/aba oculta), sem repetir o gesto anterior; Cumprimento com peso menor.
- `SophiaAnimation.astro`: só a variante `lab`; `music` intacta.

## Matriz de QA
| # | Verificação | Status | Evidência / lacuna |
|---|---|---|---|
| 1 | Importar/exportar GLB | PARTIAL | Leitor/escritor próprios + releitura independente (erro de ida e volta 4,5e-8 m) e carga no Chromium. Sem Blender nem validador glTF. |
| 2 | Pose original preservada | PASS | Normalização TRS: diferença máx. de pixel 7/255 (render numpy); juntas em mundo idênticas. |
| 3 | 65 ossos | PASS | verify.py + teste de integração. |
| 4 | Pesos/skinning | PARTIAL | BIN idêntica; 5 poses vistas em WebGL real sem esticamento; extremos de torção não medidos. |
| 5 | Animações presentes | PASS | 6 clipes relidos e tocados no ator em Chromium. |
| 6 | Transições suaves | PARTIAL | Gestos começam/terminam no neutro, mistura de 0,25 s, sequência verificada ao vivo; sem vídeo quadro a quadro de cada par. |
| 7 | Jaleco nos movimentos | PARTIAL | Inspeção visual das folhas e do WebGL; sem métrica de manga/saia. |
| 8 | Interpenetrações graves | PARTIAL | Só mão×corpo medido (≥ 23,9 mm); antebraço/manga×corpo e cauda×saia não medidos. |
| 9 | Fallback 2D | PARTIAL | Testes de nó: rede caída → 2D permanece; GLB ausente → modelo padrão. Página Astro real não executada. |
| 10 | Build Astro e testes | BLOCKED / PASS | Build: sem `node_modules` e sem npm. Testes de nó: 6 novos + 28 existentes passam; `sophia-launch-cradle/director` não rodam (pacote `three`; já falhavam em #307). |
| 11 | WebGL real | PARTIAL | Chromium headless, WebGL2 via SwiftShader (software): carrega, renderiza, 60 rAF/s, diretor alterna gestos. Não é GPU nem a página completa. |
| 12 | Móvel | NOT RUN | Sem dispositivo. Nenhum FPS de celular declarado. |
| — | Reduced-motion, Save-Data, retrô, aba oculta, perda de contexto | PARTIAL | Lógica compartilhada e inalterada, coberta pelos testes existentes com o modelo padrão; não repetida com `lab-r2` no navegador. |
| — | Morphs `Blink_*`, `Smile_Soft`, `Brow_Curious` | BLOCKED | Olhos/boca pintados na textura; rosto não reconstruído. Nenhuma expressão facial anunciada. |
| — | `Lab_HoldBook/Write/PageTurn` | BLOCKED | Sem caderno/caneta separáveis (malha única). |
| — | `.blend` | BLOCKED | Blender indisponível; poses autoradas por FK/IK em numpy. |
| — | Textura 2K | NOT RUN | Recomendado (4K RGBA+mips ≈ 85 MiB de GPU). |

## Limitações e riscos
1. Sem Blender: não há .blend e a autoria não passou por revisão visual dentro do DCC.
2. Expressividade só por cabeça/postura; sem piscar, sorriso ou olhar.
3. `Lab_Point_R1` aponta para a direita da personagem (−X): conferir com o conteúdo da seção.
4. Sem ossos de orelha/cauda: não há animação própria desses elementos.
5. Enquadramento: no WebGL a personagem ficou levemente à esquerda do canvas (cauda ocupa a direita); ajustar `center` de `lab-r2` com a seção real.
6. Privacidade: o GLB **não** está no PR. Atenção: todo arquivo em `public/` é baixável por qualquer visitante depois do deploy; "privado" só vale até lá.
7. O custo de desenho medido (0,2 ms) é só submissão de CPU em GL por software; não é tempo de quadro.
8. GIFs vêm do rasterizador numpy (sem iluminação do WebGL); as capturas `webgl_*` são o aspecto real.

## Próximos passos sugeridos
Posicionar o GLB em `public/assets/models/sophia/sophia-lab-v1.1.glb` só com autorização; rodar o build e a página real num celular; gerar a variante 2K; revisar os clipes no Blender se o .blend for exigido.
