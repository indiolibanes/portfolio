# Contrato dos clipes opcionais do caderno (Sophia Lab)

Fonte única: `public/experimental/sophia-clip-contract.js` (`BOOK_CONTRACT_VERSION = 1`). Os nomes abaixo são **expectativas combinadas, não evidência** de que existam no GLB; o runtime só usa o que o modelo realmente contém.

| Clipe | Tipo | Obrigatório | Adereços |
|---|---|---|---|
| `Lab_Book_Equip_P1` | uma execução | sim | `book` |
| `Lab_HoldBook_P1` | laço (1,5–2,5 s) | sim | `book` |
| `Lab_Write_P1` | laço (5–8 s) | sim | `book`, `pen` |
| `Lab_PauseRead_P1` | laço (2–3,5 s) | **não** | `book` |
| `Lab_Book_Unequip_P1` | uma execução | sim | — |

Sequência: Equip → Hold → Write → [Pause → Write] → Unequip → repouso (`Lab_Idle_Breath_R1`).
Regras: a cena só entra no sorteio se **todos** os clipes obrigatórios existirem **e** o modelo tiver `bookScene: true` (hoje `false` em `lab-r2`); ausente algum, o diretor se comporta como antes e a ilustração de reserva segue valendo. Adereços (`Actor.setProps`) só ficam ativos durante a cena e são limpos ao terminar/parar. Biblioteca de 6 animações, GLB, caderno e caneta: não tocados. Para ativar no futuro: publicar o GLB com os clipes + `bookScene: true` + conferir `tests/sophia-pre-r2-runtime.test.mjs`.
