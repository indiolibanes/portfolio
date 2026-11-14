# Contrato dos clipes opcionais do caderno (Sophia Lab)

Fonte única: `public/experimental/sophia-clip-contract.js` (`BOOK_CONTRACT_VERSION = 1`). Os nomes abaixo são **expectativas combinadas, não evidência** de que existam no GLB; o runtime só usa o que o modelo realmente contém.

| Clipe | Tipo | Obrigatório | Adereços |
|---|---|---|---|
| `Lab_Book_Equip_P1` | uma execução | sim | `book` |
| `Lab_HoldBook_P1` | laço (1,5–2,5 s) | sim | `book` |
| `Lab_Write_P1` | laço (5–8 s) | sim | `book`, `pen` |
| `Lab_PauseRead_P1` | laço (2–3,5 s) | **não** | `book`, `pen` |
| `Lab_Book_Unequip_P1` | uma execução | sim | `book` (oculto ao concluir) |

Sequência: Equip → Hold → Write → [Pause → Write] → Unequip → repouso (`Lab_Idle_Breath_R1`).
Regras: a cena só entra no sorteio se **todos** os clipes obrigatórios existirem **e** o modelo tiver `bookScene: true` (hoje `false` em `lab-r2`); ausente algum, o diretor se comporta como antes e a ilustração de reserva segue valendo. Adereços (`Actor.setProps`) só ficam ativos durante a cena e são limpos ao terminar/parar. Biblioteca de 6 animações, GLB, caderno e caneta: não tocados. Para ativar no futuro: publicar o GLB com os clipes + `bookScene: true` + conferir `tests/sophia-pre-r2-runtime.test.mjs`.

---

## Ciclo do laboratório R2 (GLB v1.2) — `CYCLE_CONTRACT_VERSION = 1`

Reproduz a coreografia de 12 s da ilustração 2D (`lab-search-walk`, `lab-write-notes`, `lab-step-bob`) com um corpo 3D que anda, vira e pula de verdade. Fonte: `sophia-clip-contract.js` (`CYCLE_*`) e `createCycleDirector` em `sophia-lab-director.js`. Só liga com **todos** os clipes no GLB e `cycle: true` em `MODELS['lab-r2']`; sem eles o diretor é o de gestos R1 e o 2D segue como reserva.

| Fase (2D) | Tempo | Clipe | Movimento da raiz / olhar |
|---|---|---|---|
| 0–8 % escreve | 0,96 s | `Lab_Write_Notes_R2` (laço 1,92 s) | parada, à direita, 3/4 para a esquerda (−0,5 rad) |
| 8–40 % anda p/ esquerda | 3,84 s | `Lab_Walk_Book_R2` (laço, 4 ciclos de 0,96 s) | x decrescente à velocidade de `extras.rootMotion`, de perfil (−1,45 rad) |
| 40–52 % pensa | 1,44 s | `Lab_Think_Chin_R2` | parada; poses 1-2-3-4-3-2-1 (pose 4 = caneta ao queixo) |
| 52–54 % vira | 0,24 s | `Lab_Turn_R2` | `yawTarget` suave −0,5 → +0,5 (o 2D inverte com `scaleX(-1)`) |
| 54–86 % anda p/ direita | 3,84 s | `Lab_Walk_Book_R2` | x crescente, +1,45 rad |
| 86–98 % pensa/escreve | 1,44 s | `Lab_Think_Chin_R2` | parada à direita |
| 98–100 % vira | 0,24 s | `Lab_Turn_R2` | volta a −0,5 |

- **Ao perceber o visitante** (`pointerenter`/`focusin` em `.lab-sophia-guide`): `director.notice()` pausa o ciclo, toca `Lab_Notice_R2` no lugar (0,92 s; o 2D usa 720 ms) e retoma a mesma fase (cooldown 2,5 s).
- **Raiz**: o clipe de andar é *no lugar*; o diretor move `actor.root.x` à velocidade `extras.rootMotion.speedModelUnitsPerSecond` (0,0903 un/s ⇒ pés plantados sem deslizar, 0,00 mm medido na criação). Rampa de 0,3 s nas pontas; o percurso (±0,16 un) já desconta a rampa. O resto de quadro passa à fase seguinte: o ciclo mantém 12 s exatos (teste de 200 ciclos).
- **CSS**: com `data-sophia3d='on'` o contêiner deixa de andar/virar/pular; `data-sophia-cycle='on'` alarga o quadro de desenho (190 %, centrado, `pointer-events: none`) para o percurso e a cauda caberem; a sombra acompanha por `--sophia-root-pct`.
- **Adereços**: `extras.hidden` + `extras.prop` ('book' | 'pen') nos nós do GLB; ligados por `Actor.setProps` (o ciclo liga `book`,`pen`).
- **Morphs**: `Blink_L`, `Blink_R`, `Eyes_Happy`, `Smile_Soft`, `Brow_Curious` (índices do `extras.targetNames`), animados por canal `weights` em cada clipe R2.
- **Rig R2**: 65 Mixamo + `Tail01–04`, `EarL01/02`, `EarR01/02` (73 juntas). Cauda e saia deixam de seguir as pernas.
- **Não publicado**: `published: false` e `bookScene: false` continuam; nada novo é baixado nem exibido no site até o proprietário autorizar.
