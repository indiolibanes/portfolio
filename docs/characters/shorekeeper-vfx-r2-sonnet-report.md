# Shorekeeper F2.1 C · Rodada 2 · VFX artístico — relatório

Estado: **`C_VFX_IMPLEMENTATION_PASS`** (estrutural, testes Node) · **`C_VFX_VISUAL_QA_PENDING`** (sem aprovação humana) · desempenho `PERFORMANCE_VISUAL_QA_PENDING`.
PR empilhado sobre #227 (`c6986ee`). `main` intocada. Nenhum asset privado foi adicionado ao repositório. `CI_PASS` não implica `VISUAL_PASS`.

## 1. O que mudou desde a Rodada 1

A R1 entregou um diretor de VFX procedural com partículas genéricas. A R2 troca a **linguagem visual**, não o contrato: mesmos nomes de estado, mesma regra de propriedade (subárvore própria, sem escrever em ossos/morphs/mixer, âncoras só leitura, um único RAF). O R1 permanece intacto e é o padrão; o R2 é opt-in por `?vfx=r2` no laboratório `/experimentos/sk/`.

Arquivos: `src/scripts/shorekeeper/vfx-r2.mjs`, `tests/shorekeeper-vfx-r2.test.mjs` (14 testes), ligação em `shorekeeper-sk-lab.mjs` e `index.astro` (seletores de modo e estágio só aparecem com `?vfx=r2`).

## 2. Leitura de referência (GIFs originais, não recriação 1:1)

| Janela | O que a referência mostra | O que o R2 faz |
|---|---|---|
| `butterfly.gif` 2,2–4,6 s | borboleta cristalina azul-elétrico, asa larga de membrana com borda irregular, nervuras em leque, núcleo branco-ciano, asa inferior em lascas pontudas | atlas de asa procedural (membrana, nervuras, núcleo, antenas, corpo), asa espelhada por instância |
| `resonance liberation` cutscene 4,2–5,5 s | cobertura enorme de anéis finos luminosos em elipses concêntricas sobre o cenário | `CINEMATIC_CANOPY`: disco luminoso horizontal acima da cena (borda brilhante + névoa interna), 6 elipses quase paralelas + 4 arcos cruzados mais baixos, estrelas |
| `resonance liberation` in-game 0–2,9 s | anéis brancos finos no chão, arcos tipo cometa, pontilhado, núcleo em estrela | `FIELD_GAMEPLAY`: campo radial ancorado ao piso (anéis, tracejados giratórios, caudas), partículas ascendentes |

## 3. Sistemas

**Borboleta canônica (Gate C1).** Uma borboleta com atlas próprio, orientada pela tangente da trajetória, batida de asa assimétrica com planeio, rolagem lateral, trajetórias independentes (Lissajous com fases/velocidades próprias), paralaxe por tamanho e **zona de exclusão** do rosto (0,4 altura do personagem) e da coluna do corpo, para não cortar o vestido nem tapar o olhar. Enxame: 18 (desktop) / 8 (mobile). Uma `InstancedBufferGeometry` (2 instâncias por borboleta, asa direita/esquerda).
Gate C1: quadros fixos em 3 ângulos (0°, 45°, 90° de azimute) × 3 aberturas (aberta, meia, fechada), mais 1 quadro e 3 s de voo — API de QA `qaButterfly({pos,fwd,flap,bank,scale})`.

**Collapsed Core em fases.** `SPAWN → GATHER → HOLD → CONVERT → DISSOLVE` (0–0,22–0,56–0,78–0,9–1 de um ciclo de 6 s). Partículas em esferas que se contraem, flare em estrela no HOLD, pico de flare na conversão, dissolução ascendente. Posicionado à frente do **peito** (osso `Bip001Spine2` só para leitura), porque o idle mantém as mãos baixas e a referência mostra a luz condensando à frente do corpo. Só avança de `PREPARATION` em diante; `seek({corePhase})` congela a fase para QA.

**FIELD_GAMEPLAY** (campo radial no chão, ancorado ao piso do palco) e **CINEMATIC_CANOPY** (estrutura grande acima da cena) são independentes (`BOTH | FIELD_GAMEPLAY | CINEMATIC_CANOPY`). Um erro corrigido durante a verificação em WebGL: a primeira versão da cobertura saiu em planos **verticais** (portal), não sobre a cena; a comparação com o GIF mostrou. Os materiais de VFX também passaram a `toneMapped: false`, porque o tone mapping do palco dessaturava tudo para branco e apagava a diferença entre estágios.

**Estágios Outer (azul), Inner (violeta), Supernal (dourado):** só trocam a cor compartilhada; **`STAGE_REFERENCE_UNVERIFIED`** — não há referência verificada para essas paletas, são propostas.

**Máquina de estados manual:** `OFF → AMBIENT → PREPARATION → STELLAREALM → RESONANCE_PEAK → RECOVERY → OFF`. A R1 fechava `RECOVERY → AMBIENT`; aqui `next()` fecha em `OFF`. Sem acoplamento a ataques, câmera ou eventos de combate.

**Robustez:** movimento reduzido (relógios congelados, núcleo desligado, asas fixas), pausa (`setSuspended`), `dt` inválido ignorado e limitado a 0,1 s, `dispose()` idempotente que libera geometrias/materiais/textura, perda de contexto tratada pelo laboratório (já existente) e retomada em `restored`.

## 4. Evidência (pacote privado, fora do repositório)

Renderizada em **WebGL2 real** (Chromium headless + SwiftShader, `stage.mjs` do repositório, GLB canônico `4f03b6fd…bc30`, idle original tocando). Serve para forma, cor e profundidade; **não** é GPU nem Samsung Internet.

- Gate C1: folha 3×3 (ângulo × abertura), quadro e voo de 3 s (`C1_borboletas_voo_3s.mp4`).
- Núcleo nas 6 fases (folha) e vídeo da sequência completa de 16 s (`C_VFX_R2_sequencia_completa.mp4`).
- Campo, canopy e todos os sistemas juntos, comparados com os quadros dos GIFs.

## 5. Limites conhecidos (não escondidos)

- A asa é **procedural**, não o asset do jogo: lê como borboleta cristalina azul, mas é mais "limpa" que a referência (sem fragmentos/partículas soltas nas bordas, sem as lascas inferiores longas).
- O brilho/bloom do jogo não existe aqui (sem pós-processamento): o núcleo e as bordas dos anéis parecem mais planos.
- A cobertura do Stellarealm é inferida de um quadro curto; não há planta do cenário. Altura, raio e tilt dos anéis são ajuste artístico.
- Estágios Inner/Supernal: `STAGE_REFERENCE_UNVERIFIED`. As cores diferem de forma legível (ciano, violeta, dourado-pálido), mas os anéis aditivos saturam perto do branco; o dourado sai mais pálido que o proposto.
- Em comparação com o GIF, a cobertura agora tem a estrutura certa (disco luminoso com borda e elipses concêntricas, vista de baixo), mas **falta o céu azul saturado, os raios de luz e as ruínas**: no quadro comparativo ela ainda parece um desenho técnico sobre fundo escuro, não uma cena.
- O campo de gameplay reproduz a geometria (anéis brancos finos, tracejados, caudas) mas **não** o brilho violeta-azul do chão nem o clarão em estrela do GIF (sem bloom).
- Sem GPU/Android: nenhuma medição de FPS ou tempo de GPU (`gpuTiming: NOT_MEASURED`); custo de CPU registrado no relatório do diretor. Orçamento declarado: ≤ 8 draw calls adicionais.
- Sem acoplamento ao combate/câmera até existirem marcadores de evento manuais (ver `burst-variants-qa.md`).

## 6. Testes

`tests/shorekeeper-vfx-r2.test.mjs` (14): máquina de estados (sem `RECOVERY → AMBIENT`), visibilidade/modos, 5 fases do núcleo e `seek`, movimento reduzido, pausa e `dt` inválido, trajetórias independentes/tangentes/zonas de exclusão/asa espelhada, continuidade do voo, pose única do Gate C1, atlas determinístico, estágios, orçamento de draw calls, somente leitura de âncoras (modelo não muda), `dispose` idempotente. Incluído no workflow `Shorekeeper VFX R1`. São testes **estruturais**.
