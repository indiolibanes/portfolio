# Sophia Laboratório R3 — integração pública WebP

## Separação de ativos

- **GLB e `.blend` canônicos/derivados:** estritamente privados. A página inicial não os solicita.
- **Publicados:** 18 WebPs transparentes — nove movimentos em 256 e 384 de altura — e um PNG estático.
- **Origens:** renders reais do personagem rigado em Blender 4.3.2; as duas viradas são volumétricas, sem espelhamento CSS.
- **Companheiro textual:** o link `/sophia/` continua sendo a área clicável; a animação não intercepta eventos.

## Ciclo (16,11 s)

Escrever (duas repetições) → pensar → ponte frontal/perfil → caminhar à esquerda → giro de 180° em 875 ms → caminhar à direita → giro inverso de 180° → ponte perfil/frontal. Ao receber foco/hover, Notice aguarda o final do ciclo, para não interromper uma virada.

## Performance

- PNG 352×384 carregado pela tag `<img>` desde o HTML; evita layout shift.
- `IntersectionObserver` com margem de 200 px; o navegador busca somente uma WebP por fase.
- ≤640 px: WebP 256 de altura; acima: 384 de altura; exibição pública limitada a 180–280 CSS px.
- Pausar/voltar ao PNG em reduced-motion, Save-Data, viewport ausente, aba oculta, falha de rede e `pagehide`.
- Apenas **uma** imagem visível; sem canvas, WebGL, GPU 3D, GLB remoto ou bibliotecas de animação pesadas neste componente.

## O GLB mestre privado

Auditoria de uma exportação independente da cena privada `Sophia_R3_private.blend`: **73 juntas, 5 morph targets, 17 clipes originais**. Os dois giros de 180° R3 estão nos renders WebP; não declarar que foram incorporados como clipes adicionais no GLB de exportação. A publicação do GLB continua **proibida** até autorização expressa.

## Gates de QA

Usar `node --test tests/sophia-lab-webp-r3-standalone.test.mjs`, `npm run check:ux`, `npm run build` e inspeção visual real. Validar 390 px, 768 px e 1280 px, Samsung Internet/Android físico, transparência, temporização WebP e transições. Se navegador real indisponível, relatar `VISUAL_QA_PENDING` sem inventar resultados.

**Integração:** PR draft independente a partir de `main`, sem mesclar automaticamente a pilha #312/#318/#321 ou incorporar arquivos-fonte privados.
