# Crimson Baton — estudo vetorial estático 01

Status: **rascunho para aprovação de geometria; não utilizado no site; sem animação**.

## Fonte e escopo

Lidos antes do traçado: `references.json`, `reference-board.svg` e `WORK-BRIEF.md`. Referência principal: `public/phrolova-baton.webp` (448 × 448), blob Git `fc2218dbd2fc53ec2559b40b8db7da65b8dc788f`. O raster embutido na prancha preparada foi extraído e sua identidade com esse blob foi conferida.

Crimson Baton é o bastonete/item de missão da Phrolova. Nenhuma geometria de violino/Lethean Elegy foi usada. O estudo não altera componentes, CSS, scripts de build, recursos publicados, Shorekeeper ou qualquer seção do portfólio.

Os quatro URLs de fotografias em `references.json` foram tentados, sem pesquisa geral. Não foi possível inspecionar os pixels das fotografias nesta sessão: o serviço de consulta sinalizou três imagens, mas não disponibilizou seu conteúdo visual; a quarta não ficou acessível. O acesso direto não trouxe arquivos de imagem válidos e o navegador exibiu “Site Unavailable” no primeiro URL. **Não se alega conferência geométrica por essas fotos.** Nenhuma fotografia de terceiros foi incorporada ao estudo.

## Como foi desenhado

Traçado manual com curvas Bézier no sistema de coordenadas nativo 448 × 448. Sem image-trace automático, segmentação cromática, imagem raster escondida no SVG, ou geração de fitas.

| Grupo SVG | Conteúdo |
| --- | --- |
| `staff` | Haste carmesim inclinada e afilada, incluindo a ponta |
| `junction` | Pescoço parcialmente encoberto, pequenos brilhos e ferragem da ponta |
| `petals-back` | Coroa traseira e pétalas que ficam ocultas pelas dianteiras |
| `petals-front` | Pétalas recurvadas, dobras, sombras e região central da flor |
| `stamens` | Filamentos prateados/carmesins e anteras, com origens encobertas pelas pétalas |
| `ornaments` | Energia, pauta e notas musicais, independentes do objeto físico |

Os grupos possuem IDs e nomes de camada para edição. As pétalas principais e cada estame têm identificação própria. É possível ocultar `ornaments` em um editor SVG para examinar o objeto sem música. Os ornamentos não são curvas de fita e não fazem parte da haste.

## Revisão visual

Comparação autocontida em `comparison-board.svg` e captura Chromium em `overlay-check.png`:

1. Original a 448 × 448.
2. Vetor na mesma escala e orientação, sem alinhamento automático.
3. Original com vetor sobreposto a 50%.
4. Segunda linha com a mesma ampliação da flor nas três vistas.

Foi examinada também a vista com ornamentos ocultos. O eixo da haste, sua ponta, a distribuição das pétalas e os estames longos foram comparados à fonte. Uma ferragem inicialmente grande demais foi removida/reduzida aos brilhos que a fonte permite ver. Não se completou a junção oculta como uma peça mecânica inventada.

## Limites deste rascunho

- O raster tem somente 448 × 448; os contornos finos, dobras e luminosidade são aproximados e simplificados. A imagem vetorial é mais limpa/gráfica que a pintura original, não uma reprodução pixel a pixel.
- A junção está parcialmente encoberta por pétalas e música. Sua geometria tridimensional continua pendente; os pequenos detalhes visíveis não confirmam todo o encaixe.
- A pauta e os glifos foram redesenhados em camada própria; não são tipografia musical oficial. A aura é discreta, sem reproduzir todas as partículas difusas.
- Não há confirmação fotográfica das superfícies traseiras nem do número exato de inflorescências físicas. As coroas dianteira/traseira descrevem a ordem de sobreposição desta vista.
- Aprovação deste estudo não autoriza automaticamente uma animação. A transformação futura precisa de referência própria e aprovação separada.

## Checks executados

- XML dos dois SVGs analisado sem erro.
- IDs únicos em cada documento; seis grupos obrigatórios presentes.
- `crimson-baton-vector-draft.svg`: 0 imagens raster, 0 scripts, 0 elementos de animação.
- Aberto em Chromium: documento SVG válido, sem `parsererror`, sem erros JavaScript; original, vetor e sobreposição capturados e examinados visualmente.
- Exportação adicional em Inkscape conferida. A compatibilidade da prancha usa referências `xlink:href` e recortes explícitos.
- O commit contém apenas os quatro arquivos de estudo em `assets/phrolova/`. Não é necessário um build do site para este SVG sem integração; nenhum arquivo executado pelo site mudou.

## Aprovação solicitada

Rever o contorno geral da flor, as dobras, a espessura da haste e a separação da música. Para exigir uma reconstrução tridimensional fiel da junção e da face traseira, ainda faltam fotografias acessíveis ou uma imagem oficial maior. O desenho permanece um **draft estático**, e não substitui o bastonete da seção `#sobre`.

Arte do jogo: Kuro Games / Wuthering Waves. O raster da prancha é a mesma referência que já existia no repositório; o SVG do bastonete contém apenas caminhos vetoriais de estudo.
