# Sophia R1.C — Contrato QA

> **CORREÇÃO AUTORAL PRIORITÁRIA (2026-11-13):** o alvo desta recuperação é a **Sophia RAPOSINHA / mascote celestial**, **não** a Sophia anime antropomórfica C1. O gate `IDENTITY_BLOCKED` por divergência com rosto/franja/proporções anime utilizou a referência errada e está **SUPERSEDED_WRONG_TARGET**. Consulte obrigatoriamente [`OWNER-CORRECTION-FOX-SOPHIA.md`](OWNER-CORRECTION-FOX-SOPHIA.md) antes das instruções históricas abaixo. As fontes 6H/7B/R5/R6 são candidatas da **raposinha**, e a falta de R2/WebView bloqueia somente a verificação REMOTA, não impede estudo não destrutivo sobre a 6H verificável. Não solicitar `Sophia_v1.1.glb` anime nem master anime como pré-requisito da R1.C.1. Reavaliar a identidade com a **arte 2D da raposinha**, sem aprovação artística automática.


## Verificações obrigatórias
- **G0 Proveniência:** SHA dos GLBs fonte/piloto, nó, primitiva, UV e material dos objetos que sofrerem alterações. Fonte e BIN 6H originais imutáveis; modificações como derivado com novos hashes.
- **G1 Identidade:** comparar C1 2D/ortos reais. Marca dourada única plana no tecido cutâneo sob franja. Se 6H continuar divergente de rosto, cabelo ou proporção, marcar `C1_IDENTITY_PARTIAL`, sem promover a personagem.
- **G2 Originais:** Idle/Write/Point/Wave/Walk preservados em canais, tempos, interpolação e rig; 4 morphs existentes não removidos.
- **G3 Colisão:** antes/depois nas mesmas 61 poses + amostragem densa em picos Write/Wave/Walk, ombro com seleção não vazia, classificação intencional/visível/indeterminada para cada cruzamento; não comparar contagens com métodos diferentes como se fossem melhorias.
- **G4 Vestuário:** ombro e cotovelo bem deformados, gola não atravessando o queixo, manga não atravessando punho, barra não atravessando visivelmente a cauda. Não parentear jaleco inteiro ao quadril.
- **G5 Evidência visual:** fonte × candidato em frente/¾/perfil/costas, closes Write/gola/manga/cauda, e GIFs 3s Write/Wave/Walk/Idle. GLB skinnado real; capturas Blender e Three.js identificadas separadamente.
- **G6 Runtime:** WebGL Three.js com skin/morphs reais, pause/seek/dispose, 10 montagens e desmontagens; informações reais de draw calls, geometrias, materiais, texturas. Teste Samsung Internet 16:9/9:16 pendente se não disponível.
- **G7 Preservação:** nenhum arquivo original de 6H, 7B, astronauta R3, `/api/sophia/rocket`, 47 clips, /404, Tetris, /curiosidades, Hsin, Shorekeeper, main ou políticas Cloudflare alterado.
- **G8 Segurança:** GLB derivado, BLEND, renders, vídeos e texturas privadas fora de PR e CI públicos.

## Pacote de revisão privada
- `C1_face_mark.mp4` — marca plana, rosto e franja 0°/45°/90°, com frames de oclusão;
- `Write_pen_book_contact.mp4` — 3 segundos, vista da mão, pena, caderno, punho, manga, gola;
- `Coat_Wave_Walk.mp4` — mangas/ombros/cauda, mesmo enquadramento antes/depois;
- `r1c-comparison.png` — ortos C1 arte × 6H fonte × candidata, sem falsa equivalência.

Documentos no PR: `r1c-identity.md`, `r1c-contact-matrix.csv`, `r1c-coat-go-no-go.md`, `r1c-source-diff.json`, `r1c-qa.json`. Status separados PASS/PARTIAL/FAIL/BLOCKED.

**Nenhum PASS artístico sem inspeção real.** Se não houver corpo 3D C1 aprovado, o limite formal é `R1C_6H_VISUAL_CANDIDATE`. Não produzir nova Sophia por Tripo ou refazer inteiramente o jaleco nesta fase.