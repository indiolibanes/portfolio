# Hsin — Autonomous Presentation (candidata)

PR draft empilhado [#155](https://github.com/indiolibanes/portfolio/pull/155), branch `experiment/hsin-autonomous-presentation`. Base efetiva: head do PR #154, `35d466fda082e1bdb0e9f707c6c447985510f423`, conferido aberto/draft/sem merge. Main e branches A/B não foram modificadas. O link imutável do deploy final está registrado no corpo do PR, após confirmação do bot Cloudflare.

## O que mudou

A experiência começa em **Apresentação**, com arquivo local, câmera e entrada discreta para o laboratório. Após carregar o GLB, a atuação inicia sozinha, o enquadramento aproxima rosto/mão e o cabeçalho cede espaço à personagem. **Abrir laboratório** revela os instrumentos anteriores; **Apresentação**, Esc ou Voltar retornam à experiência limpa. O painel não é apenas ocultado visualmente: usa `hidden`, retirando os controles técnicos da navegação por teclado/leitor de tela.

| Comportamento | Referência Pass B | Perfil Apresentação |
|---|---|---|
| Expressão de repouso | Intervalos sem novos overlays | Sorriso de canto e sobrancelha sustentados sobre a expressão capturada, com variação lenta |
| Piscada bilateral | Espera 3,4–7,8 s após abertura | Espera 5–10 s após abertura; fechamento/hold/reabertura anteriores |
| Piscadela automática | Direita, associada ao sorriso | Direita ou esquerda; calendário ocasional independente, no mínimo 22 s entre inícios após a primeira |
| Aquisição do olhar | 140–220 ms | 75–120 ms de transição configurada, sem alegar latência medida no aparelho |
| Fixação | 0,55–1,05 s | 2,6–4,1 s, com micro-sacadas e eventual nova aquisição de um deslocamento grande |
| Toque | Estímulo de 1,3 s | Estímulo de 4,2 s de tempo ativo, seguido de desvio/retorno suaves |
| Saída do cursor | Retorno imediato do diretor | Retém brevemente o ponto; depois retorna em 0,65–0,95 s |
| Mão esquerda | Sem intervenção | Pose estática candidata sob o queixo, condicionada à auditoria do rig |

O árbitro único continua impedindo eventos simultâneos de pálpebras. `wink` mantém a direita para compatibilidade; `wink-left` fecha só a esquerda. Piscadelas são menos frequentes que piscadas, podem ocorrer sem um beat de sorriso e coexistem com o sorriso-base. A chance de beat não ultrapassa o intervalo mínimo do novo calendário. Uma piscadela reinicia a espera da próxima piscada bilateral para evitar uma sequência apertada.

A intensidade inicial de apresentação é 75%; os perfis A/B continuam selecionáveis. Os limites geométricos existentes **não foram aumentados**: o ganho vem principalmente de presença sustentada, não de ligar todos os controles no máximo. Os overlays de sorriso ocular/squint continuam atenuados pelo fechamento; sacadas pausam durante fechamento. Nariz continua exclusivo de testes, sem novos overlays automáticos. Materiais, texturas, UVs, CSP e arquivos do modelo foram preservados.

## Assinatura da mão esquerda

`hsin-left-signature.mjs` resolve a cadeia **esquerda real**, sem copiar a solução direita. Confere nomes únicos, hierarquia ORG contígua e referências skinned nos ramos ORG/DEF. Um solucionador analítico de dois segmentos calcula o cotovelo com um plano de dobra explícito, a partir da escala facial e dos comprimentos atuais; alinha braço/antebraço/punho e transfere a mudança mundial aos DEF preservando seus espaços de repouso. Os dedos conservam suas rotações locais. Não há CCD novo, remodelagem ou IK a cada frame.

O GLB privado de referência passou: erro do alvo do punho ≈ 3,91e−8 unidades do modelo; flexão do cotovelo ≈ 142,47°, ajuste local do punho ≈ 29,72° e do braço ≈ 18,61°. Pontas dos quatro dedos ficam pelo menos 1,72 distâncias interoculares abaixo dos olhos. Somente seis quaternions ORG/DEF de braço/antebraço/mão esquerdos mudam; posições, escalas, dedos e lado direito ficam intactos. Restauração exata foi testada.

Limites candidatos: alcance válido, cotovelo até 148°, punho até 65°, braço até 105°, dedos abaixo da região ocular e escala uniforme. Falta/ambiguidade de ossos, referências inadequadas ou limite excedido mantém a pose capturada. A opção **Mão esquerda sob o queixo · candidata** permite aplicar/restaurar na bancada. **Isso não é um sistema de colisão nem uma aprovação anatômica**: palma, mangas, cabelo, rosto e silhueta precisam de inspeção frontal e lateral. A pose é aplicada automaticamente apenas quando passa nesses critérios geométricos.

## Arquitetura e preservação

`hsin-presentation-mode.mjs` separa experiência/diagnóstico sem conhecer rig ou renderer. O diretor de atenção recebe eixos e parâmetros; a sessão continua convertendo câmera/cursor para o espaço medido da cabeça. `hsin-face-presentation.mjs` acrescenta a política expressiva e `hsin-left-signature.mjs` contém o adaptador específico da personagem. Outras personagens precisam de seus próprios mapas/limites; não se pressupõe rig equivalente.

Os testes dos Passes A/B continuam passando. Perfil B em intensidade zero mantém o comportamento A; o perfil Apresentação tem calendário próprio. A/B facial congela a mesma referência/candidata e restaura todos os pesos; a pose esquerda tem comparação/restauração separada para manter o corpo constante durante A/B facial. Reduced motion suspende o relógio facial; a pose estática não cria transições. Pausa, ocultação, context loss e descarte preservam o ciclo de vida anterior. O solver e a atuação do braço direito não foram modificados.

## Verificação

```sh
node tests/hsin-face-acting.test.mjs
node tests/hsin-face-pass-b.test.mjs
node tests/hsin-presentation.test.mjs
node tests/hsin-gesture-ik.test.mjs
node tests/hsin-acting-director.test.mjs
npm run build
npm run check:ux
git diff --check
# Opcional, nunca distribuído nem exigido pelo CI:
node tests/hsin-face-private.test.mjs /caminho/privado/hsin-v.1.0.5.glb
```

PASS: build, testes acima (incluindo simulações de dez minutos), auditoria CPU do GLB, restauração de todos os morphs e transforms ósseos. UX: 97/100, mesmas falhas anteriores (`nav: lab label aligned`, `nav: music static link`, `curiosidades: header link`). Modelo privado validado: 69.407.460 bytes, SHA-256 `938a86162d5b431638ff46f2d30c78ecea74c95587835e1a8883e2b7f6c740fe`; 9 partes skinned, 823 joints, 8 controles de pupila e 12 controles faciais auditados. O teste Node usa imagens placeholder, não renderização.

**Status artístico: VISUAL_QA_PENDING.** Evidências e limitações do navegador desta entrega ficam no PR. Sem comparação real da personagem, não se aprovam naturalidade, lateralidade aparente, pose sob o queixo, FPS ou memória GPU. O resultado geométrico não substitui essa comparação.

## Teste objetivo no Android

1. Abrir a prévia imutável do PR e selecionar `hsin-v.1.0.5.glb`. Não é necessário iniciar animação: a apresentação deve começar sozinha, com mão esquerda candidata e sorriso-base. Orbitar para ver frente, 3/4 e lateral; conferir punho/cotovelo, cabelo, mangas e distância do queixo.
2. Observar por 60–90 s: piscadas espaçadas e eventuais piscadelas dos dois lados. Tocar fora dos controles, manter a câmera e observar atenção perceptível por alguns segundos, seguida de retorno. Arrastar deve continuar orbitando a câmera.
3. Abrir laboratório: testar cada piscadela, alternar perfis A/B/Apresentação com câmera/luz iguais, congelar A/B facial e restaurar expressão. Desmarcar a pose esquerda deve devolver exatamente o braço capturado; conferir dedos e braço direito.
4. Ocultar/retornar, pausar/retomar, ativar redução de movimento e trocar o arquivo. Guardar vídeos/capturas apenas no aparelho, com URL/commit e navegador. Se houver artefatos na mão, desativar a candidata e registrar a vista; não aprovar a pose por números.

Somente código, testes e documentação no PR. Nenhum GLB, textura ou render protegido foi publicado. Créditos preservados: Kuro Games, Lvoxx, imblue__ e LSCherry. Sem merge automático.
