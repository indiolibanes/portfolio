# Hsin V2.0 — terraço, lago e lua cheia

## Estado inicial e entrega

- Repositório: `indiolibanes/portfolio`.
- Base: `main` em `725ed9067ba74cf7748fee5eaa1fcf306b264b8b`, após os merges dos PRs #166 e #167 feitos antes desta etapa.
- Implementação V2 aprovada por regressões/build: `09068ccb4bbaa1e4942420126fb3f20a018d0847` (PR #167). A inspeção WebGL da personagem continuava pendente; sucesso de build não comprova renderização.
- Branch: `experiment/hsin-v2-moonlit-2026-11-01`. Entrega em PR draft contra `main`, sem merge automático. O head e a URL imutável ficam registrados no PR.
- Rota principal: `/experimentos/hsin/`. Laboratório preservado em `/experimentos/hsin-lab/`.

## Reinterpretação da imagem

Referência inspecionada: `public/assets/music-moonlit-terrace-v4.webp`, usada na seção Música. A composição original reúne lua dourada sobre a Hsin, céu azul estrelado, lago, serras e terraço de pedra. Esta versão preserva essa relação entre lua, silhueta e água, com poucos elementos reais em profundidade. Não reproduz as demais personagens, lanternas, flores, arquitetura ou a pintura como um fundo plano.

A lua é um plano com textura RGBA de 512×512: disco cheio em marfim/dourado suave, regiões lunares estilizadas, crateras discretas e halo incorporado. A textura é criada por código SVG e rasterizada offline; não é uma fotografia astronômica. Não há bloom nem passe extra de glow. O céu tem um gradiente azul e estrelas imóveis incorporadas a uma textura de 512×512.

Duas serras poligonais em profundidades diferentes, um plano de água e um terraço circular constituem a parte espacial. O reflexo é uma composição estática de faixas trianguladas, agrupadas numa única geometria; não é um espelho físico e não segue a lua durante a órbita. O aro discreto da base recebe o tom dourado da imagem original. A lua acompanha a direção da câmera como uma camada celeste distante; o lago, o terraço e as serras permanecem fixos no mundo e fornecem paralaxe. Essa decisão mantém a lua no enquadramento sem adicionar atualizações ao loop de atuação.

Uma luz principal fria, preenchimento ambiente e recorte levemente dourado preservam a leitura da personagem. Materiais originais do GLB são mantidos, incluindo aqueles sem iluminação (`KHR_materials_unlit`); esses materiais não passam a reagir às luzes. Não se promete equivalência ao shader do jogo.

## Asset e preservação

GLB servido diretamente do projeto: `public/assets/models/hsin/hsin-v2.0.glb`.

- 9.873.744 bytes; SHA-256 `63506b0b7a2369722e6429c3b16c5f48764ee01706d1272b4ffd69a45c5e0d2c`.
- O GLB otimizado, perfil, rig, atuação facial e poses não foram modificados nesta etapa.
- O original privado de 69.407.460 bytes continua preservado fora do repositório. A otimização anterior e seus limites estão em `hsin-v2-stage.md` e `hsin-v2-asset-report.json`.
- Nenhum seletor de arquivo ou painel técnico foi adicionado à apresentação.

## Câmera e interação

Roda do mouse, pinch e botões aproximam/afastam. Arrastar permite órbita de cerca de ±40°; a inclinação foi restringida a aproximadamente 1°–18° acima do plano, evitando vistas aéreas exageradas e sob o chão. Pan continua desativado e Hsin permanece no centro. A distância mínima é 1,05 m; a máxima e o enquadramento inicial continuam adaptados ao aspecto. Aproximar eleva o foco ao rosto. O botão de retorno restaura o enquadramento, e a atuação pode ser pausada. Os controles de câmera permanecem disponíveis com movimento reduzido.

Testes de projeção cobrem o disco completo da lua nas vistas iniciais em 393×852, 320×740 e 16:9, incluindo ambos os limites de azimute. Zoom fechado pode recortar a lua para priorizar o rosto. Esses testes não verificam a naturalidade dos gestos de toque em um aparelho real.

## Orçamento de execução

| Item | Resultado |
| --- | --- |
| Geometria deste módulo | 6 meshes, 298 triângulos, 6 draw calls sem contar culled objects |
| Acréscimo em relação ao palco azul | 5 draw calls: o terraço substitui o chão anterior |
| Cena completa esperada | 18 draws com as 9 primitivas de Hsin, base, aro e contato; não medido na GPU |
| Texturas do cenário | 54.752 bytes somadas; duas imagens de 512×512 |
| Memória das novas imagens | Aproximadamente 2,33 MiB RGBA com mipmaps apenas na lua; exclui overhead do driver |
| Pós-processamento, HDR, partículas e sombras reais | Nenhum |
| Reflexo e estrelas | Estáticos; nenhum cálculo temporal ou render target |
| Loop e resolução | 30 FPS de teto; DPR até 1 no toque/1,25 no desktop e teto de 1.152.000 pixels |
| Pausa e descarte | Mesma política de visibilidade, render sob demanda e liberação do player V2 |

O teto de 30 FPS não é uma medição de FPS. A grande redução de peso e morphs pertence à V2 anterior; esta etapa acrescenta o cenário dentro de um orçamento pequeno e explícito. Recursos celestes são atualizados apenas quando a câmera muda, inclusive no damping. As texturas usam o registro de descarte do player; resultados de carregamento que chegam após sair da página são liberados. O modelo é adotado pela cena antes da espera pelas texturas para que uma falha nessa espera também o descarte.

## Arquivos

- `src/scripts/hsin-moonlit-environment.mjs`: geometria, materiais simples, lua/halo e enquadramento celeste.
- `src/scripts/hsin-stage.ts`: integração, iluminação, carregamento e ciclo de vida.
- `src/scripts/hsin-stage-config.mjs`: limites de órbita e cores da base.
- `scripts/generate-hsin-moonlit.mjs`: fonte reproduzível das texturas.
- `public/assets/scenes/hsin/{night-sky-v1,full-moon-v1}.webp`: duas texturas estáticas.
- `scripts/render-hsin-poster.mjs`: rasterização CPU de geometria para posters; aproximação de materiais, sem WebGL, normal maps ou avaliação de desempenho.
- `public/assets/models/hsin/hsin-v2.0-poster{,-landscape}.webp`: alternativas de fallback para retrato e paisagem.
- `src/pages/experimentos/hsin/index.astro`, `src/styles/hsin-stage.css`: poster responsivo, descrição acessível, créditos e detalhes em dourado.
- `tests/hsin-moonlit-environment.test.mjs` e workflow Hsin: orçamento de geometria/texturas e enquadramento da lua, junto das regressões existentes.

## Validação e limites

- `node --test tests/hsin-*.test.mjs`: 29 arquivos aprovados, incluindo o GLB público e 600 segundos de atuação simulada com restauração exata. Auditorias privadas que exigem argumento informam skip interno quando não recebem arquivo; não foram contadas como auditoria privada real.
- `npm run build`: aprovado, incluindo verificação OG.
- `npm run check:ux`: 97/100, com as mesmas três falhas anteriores: `nav: lab label aligned`, `nav: music static link`, `curiosidades: header link`.
- Projeções da lua e dois posters de geometria real inspecionados em retrato/paisagem. A rasterização CPU aproxima transparência, cor, fog e iluminação; não reproduz PBR, normal maps, antialiasing e shaders do navegador.
- WebGL, movimento contínuo, FPS, memória sustentada, perda de contexto e pinch no Samsung Internet exigem verificação em hardware real. Não transformar a inspeção dos posters em aprovação da cena animada.

Reprodução offline:

```sh
node scripts/generate-hsin-moonlit.mjs
node scripts/render-hsin-poster.mjs public/assets/models/hsin/hsin-v2.0.glb public/assets/models/hsin/hsin-v2.0-poster.webp
node scripts/render-hsin-poster.mjs public/assets/models/hsin/hsin-v2.0.glb public/assets/models/hsin/hsin-v2.0-poster-landscape.webp 1280 720
node --test tests/hsin-*.test.mjs
npm run build
npm run check:ux
```

Aceite manual: abrir a prévia no desktop e Samsung Internet, conferir lua e rosto sem estouro de brilho, órbita nos dois sentidos, zoom/pinch, retorno de câmera, pausa/retomada, troca de aba e uso por alguns minutos. Conferir transparência do halo e da roupa e a separação dos planos do lago. Manter draft sem merge automático até o aceite.
