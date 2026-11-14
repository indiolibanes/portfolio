# Sophia — pré-R2 runtime readiness

Data: 2026-11-14. Resultado geral: **PARTIAL**, sem aprovação visual, publicação de GLB ou merge.

## Base efetivamente inspecionada

| PR | Estado | HEAD |
| --- | --- | --- |
| #306 | aberto, não mesclado | `ff1453ed47b4a6bf47177699ae12556f08847b97` |
| #307 | draft, base #306 | `9ed7a65e7e433277db0738e3d6ad9f61cf1f1524` |
| #312 | draft, base #307 | `8109544c06b90e92a5751eaa5dee0249e43ffcaf` |

O #312 já traz `published: false`, validação inicial de GLB, isolamento de falhas por ator, primeiro desenho antes de esconder o 2D e contrato de clipes P1. Esses mecanismos foram preservados. A intervenção não refaz o trabalho anterior nem ativa a cena de escrita.

## Defeitos demonstrados e correções

As reproduções abaixo usam o runtime real, GLB padrão real e fixture de APIs de navegador/GL sem executar shaders. O código do HEAD foi carregado separadamente como baseline; o teste permite repetir com `SOPHIA_ACTOR_BASELINE`.

| Caso | Antes | Depois |
| --- | --- | --- |
| Interseção inicial com `document.hidden=true` | inicia 1 GET; não chega a mostrar o ator | nenhum GET/contexto, retoma quando visível |
| Quatro montagens/remoções do último consumidor | 1 contexto criado, 0 liberados; fonte reutilizada mesmo sem consumidor; 0 diretores parados | 4 criados e 4 liberados, 4 diretores parados; nova carga a cada remontagem |
| Remover um de dois atores do mesmo modelo | palco compartilhado preservado | preservado; esqueletos independentes e ator restante segue desenhando |
| Desmontar durante a carga | contexto criado sem ator permanece retido | contexto liberado ao concluir; elemento deixa de ser observado |
| Carga pendente durante `pagehide` persistido | teste baseline não concluído; sem resultado quantitativo | não publica primeiro quadro no bfcache; retoma em `pageshow` (PASS CPU) |

`releaseUnusedStages` libera o palco e seus bytes somente quando não há mais ator montado daquele modelo, esperando as cargas pendentes. Apenas sair da viewport mantém o palco e a pose para reentrada rápida. Há um custo consciente: remover todos os consumidores e recriá-los depois exige nova leitura/decodificação; o cache HTTP pode ajudar, mas não foi medido aqui. O destructor também para o diretor. A sincronização com bfcache ganhou uma suspensão explícita. Não foram adicionados contextos ou dependências.

## Carregamento inicial e primeiro quadro

Ordem confirmada por código/testes CPU: interseção → política de recursos/modo → seleção de modelo publicado/fallback → um GET compartilhado por modelo → cabeçalho GLB → contexto/decodificação → pose e desenho no canvas 2D → `sophiaReady=true`/evento ready. O 2D não é ocultado ao terminar apenas o download. Sem autorização de publicação do Lab, a chave cai diretamente para o padrão, sem solicitar o modelo privado.

Os módulos `sophia-actor`, diretor e dependências ainda são solicitados pela marcação da página; o lazy loading existente se aplica aos GLBs e à criação do renderer. Não se alterou isso sem medição real do custo de JS. Falhas de rede, arquivo ausente, HTML inválido, GLB truncado, falha de desenho e contexto perdido já têm cobertura CPU. A instrumentação Playwright em `scripts/qa-sophia-pre-r2.mjs` mede a página Astro real, GETs, eventos de primeiro quadro, contextos e desmontagens e pode receber o GLB privado via interceptação local — sem copiá-lo para `public/`.

**Tempo de download, tempo até primeiro quadro útil, custo de frame, uso real de GPU e heap após ciclos: BLOCKED.** Chromium aborta antes de criar janela/contexto por `socket() failed: Operation not permitted`. O script da 404 falha pela mesma restrição. Nenhum valor temporal ou FPS foi inventado. A captura de heap do harness inclui referências retidas pela própria instrumentação, portanto não é isoladamente uma prova de ausência de vazamento.

## Matriz de contextos e memória

| Situação | Contextos esperados/CPU | Decisão |
| --- | --- | --- |
| Corredora + Lab não publicado | 1 palco padrão | compartilham renderer/fonte, poses separadas |
| Dois atores de uma chave publicada | 1 palco por chave | compartilhamento existente preservado |
| Corredora + Lab próprio publicado apenas no teste | 2 palcos | isolamento de perda/restauração coberto pelo teste anterior; QA GL real BLOCKED |
| Um ator sai da viewport | palco mantido, sem step/draw desse ator | favorece reentrada |
| Último ator de uma chave removido | 0 palcos/bytes daquela chave após cargas pendentes | descarte explícito, sem aguardar GC para liberar contexto |
| `pagehide` sem bfcache | todos os palcos descartados | comportamento preservado |
| `pagehide` com bfcache | cargas não publicam; RAF parado | poses montadas preservadas para retorno |

Um renderer único para vários modelos poderia reduzir contextos, mas não eliminaria texturas/geometria dos dois modelos nem o custo de copiar cada quadro para canvas 2D. Não há medição de navegador que justifique trocar a arquitetura; manteve-se um palco por modelo. A liberação após desmontagem é a mudança controlada demonstrada. As contagens CPU são chamadas observadas em fixture, não memória GPU medida.

## Textura 4K × 2K — avaliação privada

O anexo real tem 10.784.668 bytes, 73 juntas, 17 clipes, uma textura base 4096² e outra 2048². Não corresponde à estimativa de ~6 MB do pedido. Reduziu-se somente a imagem 4096² para 2048² (Lanczos/JPEG qualidade 95, sem subsampling cromático). A imagem já 2K foi preservada byte a byte.

| Métrica | Original | Cópia 2K |
| --- | --- | --- |
| Arquivo | 10.784.668 bytes | 8.973.472 bytes (−16,8%) |
| Texturas | 4096² + 2048² | 2048² + 2048² |
| RGBA8 com mipmaps, estimativa analítica | 106,7 MiB | 42,7 MiB (−60%) |
| Geometria/rig/clipes/UVs/morphs | referência | bufferViews não alterados exatos; JSON semântico exato fora do layout de buffers |

As imagens são JPEG RGB no arquivo, mas o renderer usa RGBA8/SRGB8_ALPHA8 e mipmaps; a conta acima estima esse armazenamento, não a residência efetiva ou overhead do driver. Sem alegação de FPS móvel.

Foram renderizados em Blender CPU os mesmos enquadramentos de corpo, rosto e bordados, usando albedo/emissão para isolar a textura. Olhos, três estrelas e motivos maiores permanecem distinguíveis; a versão 2K suaviza bordas e detalhes finos. Aprovação visual final **PARTIAL**: faltam movimento, luz do renderer do site, DPRs e aparelho real. Os arquivos/renderizações e hashes ficam na entrega privada, não no repositório. A variante não foi publicada nem selecionada no runtime.

## Contrato futuro e segurança relevante

`sophia-clip-contract.js` continua fonte única dos cinco nomes esperados P1, obrigatoriedade e tipos. Sem clipes exigidos ou com `bookScene=false`, o diretor mantém o comportamento anterior. `cycle=true` só usa R2 com a biblioteca real completa; a biblioteca de seis clipes R1 não foi alterada. A tabela de props da documentação foi alinhada ao contrato existente: PauseRead mantém book+pen; Unequip mantém book até a conclusão.

Antes da integração futura: conferir clipes reais, `extras.hidden/prop`, enquadramento, política de publicação e primeiro quadro/fallback em navegador. Não basta mudar um nome/URL. Nenhum controle ou animação fictícia foi criado. `published` e `bookScene` seguem falsos.

Escopo de segurança: diff só em runtime, testes/harness e documentação. URLs do registro continuam locais e fixas; nenhuma dependência nova, CSP/_headers/Workers/R2/Access alterado, nenhum binário/identificador de armazenamento privado incluído no Git. O anexo foi lido e copiado apenas fora do repositório. Home, 404/Tetris, música, modo imersivo, DecorativeMotion e demais personagens não foram redesenhados. Isso não equivale a auditoria geral de segurança.

## QA

| Verificação | Estado |
| --- | --- |
| `npm ci`, lockfile existente | PASS |
| Baseline `npm run check` / `npm run build` | PASS / PASS |
| Baseline Sophia Node | PASS: 82, 2 pulados sem GLB Lab |
| Novas regressões no baseline | FAIL reproduzido: aba oculta, descarte final, remoção pendente; compartilhamento PASS |
| Sophia Node após correções, GLB privado fornecido | PASS: 89/89, nenhum pulado |
| `npm run check` / `npm run build` após | PASS / PASS |
| Cabeçalho/falhas/primeiro draw/context loss/restoration em CPU | PASS nas suítes Sophia |
| Playwright página Astro real / WebGL Chromium | BLOCKED na inicialização do Chromium |
| Regressão visual 404/Tetris Chromium | BLOCKED; testes CPU relevantes PASS |
| Comparação estática Blender CPU 4K/2K e integridade | PASS técnico / PARTIAL visual |
| GPU física, Android/Samsung Internet, desempenho móvel | NOT RUN |
| Aprovação visual pelo proprietário | NOT RUN |

Reprodução: `npm ci`; `SOPHIA_LAB_R2_MODEL=/arquivo/privado.glb node --test tests/sophia-*test.mjs`; `npm run check`; `npm run build`. Para a página real: iniciar `npm run dev -- --host 127.0.0.1`, depois `QA_OUTPUT=/diretorio/local SOPHIA_LAB_R2_MODEL=/arquivo/privado.glb node scripts/qa-sophia-pre-r2.mjs`. O harness escreve JSON com BLOCKED se Chromium não puder iniciar. Os caminhos dos exemplos são placeholders, não endpoints de publicação.

Gate final: **PARTIAL**. Correções CPU e build prontas para revisão; integração/publicação definitiva depende dos gates de navegador, dispositivo e aprovação visual. Sem merge automático.
