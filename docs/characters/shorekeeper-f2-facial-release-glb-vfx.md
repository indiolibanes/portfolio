# Shorekeeper F.2 — Expressões de Claude, reconhecimento F2.0-A, VFX

**Base:** CL.1 #215 com CL.1.1 #217 integrado. PR draft independente, sem merge automático em main.

## Correção do aviso "versão diferente"

O módulo `local-model.mjs` comparava apenas `F16_HASH=39a45609…` e identificava todo arquivo diferente como "Versão diferente · inspeção permitida". Isso rotulava erroneamente a versão canônica F2.0-A.

O hash canônico verificado permanece `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`, com 39.487.548 bytes, nome `PRIVATE_shorekeeper_f20a_original_idles.glb` e os três idles originais. O carregador agora diferencia F2.0-A canônico, F1.6 legado e outro GLB não reconhecido. Nenhum novo GLB foi produzido; os arquivos de combate continuam bibliotecas privadas separadas, carregadas localmente.

## Expressões recuperadas (Claude, PR #216)

Transplantamos o código facial **já mesclado** do PR #216 para a cadeia C/CL, preservando o design de escritor facial único e idles/bilateral blink intocados. O controlador atua só em `Shorekeeper_Face` e `Shorekeeper_Eye`; `E_Close` permanece do proprietário ocular. O scheduler NÃO usa as receitas experimentais.

Em `/experimentos/sk/` → aba **Expressões** → **Expressões recuperadas pelo Claude**, ficam disponíveis os testes manuais:

| Preset | Situação |
|---|---|
| MY_STAR | Experimental · sem aprovação visual |
| LITTLE_SMILE | Experimental · sem aprovação visual |
| LOVE | Experimental · sem aprovação visual |
| HELLO | Experimental · sem aprovação visual |
| HOPE | Experimental · solicita fechamento ocular no escritor aprovado; sem aprovação estética |
| SURPRISE_SOFT | Geometria somente; teste adicional |
| WORRIED | Geometria somente; teste adicional |
| GLANCE | Geometria somente; teste adicional |

A ação `NEUTRAL` recupera gradualmente os pesos. Testar frontal, ¾ e rosto sem alterar iluminação; PNG local opcional. As outras duas câmeras propostas em #216 (`eyes` e `mouth`) não foram disponibilizadas aqui, porque o estágio atual não tem esses presets específicos.

Na passagem ao modo Combate, os testes faciais são bloqueados e a expressão é resetada; eventos de `SK_ATTACK_`, `SK_SKILL_`, `SK_AIR_SKILL_` e `SK_BURST_` interrompem atuação facial. `face.advance` executa uma vez por quadro no loop existente, e o scheduler recebe `advanceFace:false`. Preservam-se curvas de piscada: 0,13 s fechar, 0,08 s sustentar, 0,20 s abrir. O patch não modifica dados de idles ou GLBs.

**Atenção:** `RUNTIME_INTEGRATION_PASS` não é `VISUAL_APPROVED`. As cinco receitas já haviam passado em validação privada do Claude, com decodificação de texturas simulada; a confirmação WebGL real continua pendente. A presença dos botões não significa que um sorriso convincente foi recuperado.

## Borboletas e Stellarealm — estado de pesquisa

Existe uma trilha paralela, PR **#219 — Shorekeeper VFX R1**, baseada em `main`, com implementação procedural original de três sistemas: borboletas, domínio estelar e Collapsed Core. Inclui orçamento móvel (8 borboletas, 110 estrelas, 12 partículas) e desktop (18, 320, 40), usando o loop existente; ainda sem WebGL visual QA. **Não está incorporada à cadeia CL** deste PR.

O pacote ActorX privado disponível contém `T_StarrySkyNoise_D.png` como possível máscara; sua função no sistema real não é identificada. Os PNG e PSA não fornecem o material/shader, emissores, curvas de opacidade, sprite atlas ou a câmera cinematográfica necessários para reconstrução literal.

Para correspondência visual alta (não alegar cópia 1:1 sem os dados do jogo), coletar: gravações nítidas da habilidade `End Loop` em enquadramentos estáveis e com timestamps; estados Outer (azul), Inner (roxo), Supernal (dourado); vídeos de `Dim Star` e `Flare Star` para distinguir borboletas de habilidade; frames dos anéis, faixas de luz, núcleo e dissolução. Se houver origem licenciada de malhas, texturas, máscaras e configuração de partículas, comparar separadamente. Não subir assets privados a `public/`.

**Não** juntar #219 a esta branch sem rebase, revisão de conflitos de palco/loop e QA de desempenho. O presente PR libera os controles faciais e corrige a identificação do modelo, não implementa novos VFX.

## Validação

- Testar loader com SHA-256 F2.0-A, legado F1.6 e outro arquivo.
- Executar suíte facial F2.1-F.1 transplantada + testes C/CL.
- Confirmar três idles e piscar como antes, sem novos timers, writers, mixers ou autoativação de presets.
- Avaliar botão por botão no Samsung Internet, capturando neutro/pico/recuperação.

Nenhum merge automático. Nenhuma alteração em main.
