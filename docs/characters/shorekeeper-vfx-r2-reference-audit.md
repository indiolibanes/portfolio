# Shorekeeper C/CL — referência, matriz Burst e lacunas R2

**C_ROTATION_QA_PENDING / C_VFX_VISUAL_QA_PENDING. Rodada 1; sem refino artístico ou integração aprovados.**
Este ramo é empilhado exclusivamente sobre #219 (`c454fc9a40fba5fc5c6ad1680a286fe0e4059198`). O ramo B parte de #223. O código R1 permanece idêntico ao #219: não foi integrado à CL, não foi adicionado controle de câmera automático e nenhum Root padrão mudou.

## Fontes e método

Foram decodificados os quinze GIFs privados, e quadros reais dos quatro GIFs VFX e das expressões foram examinados. As imagens, os JSONs de inventário e as amostras privadas de clipes ficam no pacote de evidências, fora do GitHub. Os nomes dos GIFs não comprovam identificação de habilidade, espécie de borboleta, clipe ou relógio.

O relatório CL.1.1, sua matriz e os dois utilitários foram lidos. As métricas 16→2 e 13→0 inversões de yaw e o giro ~571° são evidência histórica fornecida, não nova medição visual nesta rodada. A hipótese Root/Rib continua sujeita a comparação real; não foi promovida a fidelidade aprovada.

O preflight C.4 privado foi recuperado e seu manifesto, hashes, hierarquia e bind validados pelo conversor já existente na CL. As duas bibliotecas foram regeneradas **fora do repositório**, sem substituir o GLB nem alterar fontes. Uma ferramenta somente de auditoria, `scripts/qa/audit-shorekeeper-burst-variants.mjs`, aplica as três variantes em CPU e registra as mesmas juntas/instantes. Duração e 728 canais fora de Root.quaternion permanecem iguais. O arquivo original é conferido antes/depois.

| Clipe | Frames fonte | FPS declarado | Duração | Amostras futuras de A/B |
| --- | ---: | ---: | ---: | --- |
| Burst01 | 181 | 30,1666660309 | ~6 s | 0 / 105 / 135 = 0 / 3,480663 / 4,475138 s |
| Burst02 | 164 | 30,1840496063 | ~5,433333 s | 0 / 54 / 107 / 163 = 0 / 1,789024 / 3,544919 / 5,400203 s |

As amostras intermediárias de Burst02 são marcadores de comparação, **não eventos canônicos de preparação, ápice ou recuperação**. É necessário localizar esses eventos visualmente. O FPS do PSA não é exatamente 30; não deslocar o frame 105 por usar 3,5 s como equivalência exata. A amostragem CPU não produz aprovação de orientação ou de pirueta.

## Storyboard de referência — relógios locais dos GIFs

| Arquivo | Janela observada | Conteúdo examinado | Limite de uso |
| --- | --- | --- | --- |
| butterfly.gif, 5,87 s | 0…~2,2 s | mãos/rosto sob luz quente | gesto e câmera; não apenas efeito |
| butterfly.gif | ~2,2…~4,6 s | borboleta individual sobre fundo escuro; pares de asas pontiagudas, núcleo branco/ciano e extensões inferiores | referência de silhueta/orientação; espécie Dim/Flare não estabelecida |
| butterfly.gif | ~4,6…5,87 s | close de olhos | outro plano; não interpolar como trajetória da borboleta |
| resonance liberation cutscene.gif, 5,51 s | 0…~3,8 s | perfil, olhar, gesto manual e borboletas próximas | encenação cinematográfica, relógio não associado a Burst |
| mesmo | ~3,8…~4,2 s | abertura luminosa/expansão | transição; conferir frames por corte |
| mesmo | ~4,2…5,51 s | grande cobertura estelar acima da cena, anéis claros e profundidade | não é um pequeno plano horizontal em torno dos pés |
| resonance liberation ingame.gif, 2,86 s | 0…~0,7 s | campo e borboleta/energia antes do close | plano estabelecedor |
| mesmo | ~0,7…~1,73 s | mãos concentrando luz, boca/rosto visíveis | inclui câmera cinematográfica; título “ingame” não prova gameplay contínuo |
| mesmo | ~1,73…2,86 s | expansão de energia e grandes formas de asas/campo | composição e contraste, não timing de PSA |
| cutscene moves.gif, 4,41 s | 0…1,37 / 1,37…2,67 / 2,67…4,41 s | arcos em torno de figura em movimento, giros, aproximação final | cortes/reenquadramentos; não alinhar pela duração total |

As fronteiras marcadas “~” são aproximações de inspeção amostrada, não edição/cue sheets definitivos. O detector de diferenças RGB só propõe cortes e perde mudanças graduais. Para sincronizar, confrontar cada quadro da região, inclusive o áudio/evento de gameplay quando disponível. YouTube oficial inacessível: REFERENCE_VIDEO_ACCESS_BLOCKED; não foram vistos frames externos.

## Auditoria do código R1 vs referência

| Sistema | Recurso existente comprovado no código | Lacuna perceptiva/estrutural | Próximo experimento condicionado a capturas |
| --- | --- | --- | --- |
| Borboletas | InstancedMesh com duas instâncias por indivíduo, asas por ShapeGeometry, fase/cor/escala independentes | contorno arredondado de quatro lobos; corpo/antenas/nervuras ausentes; orientação não acompanha tangente da trajetória; sem rastros curtos | silhueta pontiaguda/lobulada reconhecível, núcleo/veios finos, tangente orientando o corpo e cauda curta; comparar indivíduo antes de enxame |
| Dim / Flare | não há identidade separada | não é possível atribuir espécie por cor ou pelo close isolado | manter species=UNRESOLVED até referência inequívoca; cinco Dim de Chaos Theory é texto secundário, não identificação visual dos GIFs |
| Collapsed Core | Points com hélices pré-calculadas, fases e fading; âncora de mão por leitura | motes orbitais sem ciclo separado de condensação/concentração/conversão; não representam automaticamente os núcleos do Forte | separar nascimento, sustentação, concentração e dissolução por fase manual; nenhuma ativação por Burst/Skill ainda |
| Stellarealm | estrelas, LineSegments com três elipses, esfera-gradiente, transição de opacidade | falta superfície/circunferência de campo de gameplay, cobertura superior, paralaxe/composição da cutscene e estágios Outer/Inner/Supernal | distinguir FIELD_GAMEPLAY e CINEMATIC_CANOPY; não substituir ult por esfera e pontos; avaliar máscara/oclusão e espessura variável de arcos |
| Estados | OFF/AMBIENT/PREPARATION/STELLAREALM/RESONANCE_PEAK/RECOVERY manuais | next() retorna AMBIENT após RECOVERY; o novo brief pede OFF | ajustar somente no futuro ramo de refino; nenhum evento musical/combate acoplado |
| Ownership | subárvore própria, leitura de hand/head, mesmo RAF | contrato correto, mas exclusão do rosto em Z fixo não prova oclusão em ¾; fotos não foram renderizadas aqui | A/B frontal/¾ e câmera móvel, rosto/mãos legíveis, sem escrever no rig |
| Desempenho | perfis 8/110/12 e 18/320/40; até cinco draws estimados; sem bloom/render targets extras | 600 s simulados em Node e estimativas não medem GPU, overdraw ou Samsung Internet | sessão real de 600 s, draws/triangles/frame time/DPR e memória quando mensurável; remover emissões invisíveis antes de aumentar densidade |

Os estágios Outer (azul), Inner (violeta) e Supernal (dourado) são alvos nomeados pelo plano. Os GIFs examinados não demonstram isoladamente os três estágios; não marcar os três como visualmente validados nem confundir os brilhos da montagem com cada estágio. A página secundária Prydwen foi consultada para os nomes/mecânicas; a página oficial KURO retornou conteúdo vazio. Código/shaders autorais serão necessários; nenhum recurso extraído foi incorporado.

## Gates de continuidade

1. B1 precisa de dois sorrisos legíveis em WebGL, frontal/¾, crop e escala de celular, com neutro/morph isolado/composição.
2. Round 2 recebe essas capturas e os contatos privados. O refino de VFX trabalha sobre #219, com as lacunas acima e a referência de indivíduo antes de densidade.
3. A/B visual dos três Roots deve confirmar entrada de costas, giro e recuperação; manter originais e todas as variantes até lá. A câmera não deve esconder a dúvida.
4. Cada código/art direction aprovado vira commits selecionáveis. Só então abrir draft de integração sobre a CL verificada. Não mesclar #219 inteiro, pois há conflitos em palco, UI e loop.

O navegador desta sessão informou WebGL2 indisponível. Logo não há gravações equivalentes referência/palco, nem QA de contexto, Android/Samsung, aparência ou desempenho real. O diagnóstico C desta rodada é substantivo, mas **não é C_VFX_IMPLEMENTATION_PASS R2 nem C_VISUAL_PASS**. O que falta é acesso a render WebGL/inspeção humana, não outro RAR completo. Confirmar visualmente ainda qual clip corresponde a qual trecho dos GIFs.

Wuthering Waves e Shorekeeper © KURO GAMES. Experiência independente e não oficial. Assets e evidências privados permanecem fora do repositório. Draft; sem merge ou mudança de main.
