# Shorekeeper F2.0-B — Gentle Acting

Base: `683a907572fa0e7c2c8042078d0365ac433faf59` (PR #182). O usuário informou que aprovou visualmente os três idles F2.0-A como fiéis ao jogo. Esta etapa não modifica clipes, conversão ou assets; a aprovação da nova atuação facial é separada e permanece **VISUAL_QA_PENDING**.

## Contrato de execução

O diretor original continua dono de todos os TRS nos seus clipes, inclusive `Bip001Head` e `Bip001Neck`. `gentle-acting.mjs` é dono exclusivo dos morphs E_Close (bilateral), E_Smile_L/R, M_Smile_L/R, B_Happy, E_Focus e Pupil_L/R/Up/Down; ignora nomes ausentes. Nenhum bone ou AnimationMixer é escrito pela camada facial. A inspeção aplica os pesos simultaneamente às malhas que contêm cada nome. Os controles manuais gerais são bloqueados nos idles para impedir dupla escrita. Os morphs não listados não são animados por este controlador.

Sorriso: boca 0,22, olhos 0,12 e sobrancelha 0,08; olhar: Pupil_L 0,16 e E_Focus 0,08. Piscada: fechamento bilateral 0,13 s, retenção 0,08 s, abertura 0,20 s. São valores iniciais experimentais, não aprovação artística. As transições usam interpolação suave a partir dos pesos atuais; o retorno ao neutro é gradual. Os pesos de pupila da camada são inferiores a 0,3. Não existe piscada independente ou reconhecimento de visitante com rotação de cabeça.

Reference QA mantém as expressões adicionais desativadas; ao iniciar sua reprodução zera os morphs. Expressive Acting oferece botões manuais e alternância opcional, inicialmente ativa quando permitido. A troca de modo é disponível em repouso: interrompa o gesto antes de mudar. O scheduler usa os eventos start/recovery/end do diretor; espera o fim da recuperação, sorteia entre os idles disponíveis evitando repetição consecutiva quando possível e executa um único clipe em 1×, com repouso aleatório. Não altera arquivos de animação ou seu timing. A ação Interromper desliga a alternância e inicia a recuperação facial/corporal. Os controles de pausa também pausam os temporizadores e o rosto. Movimento reduzido desativa toda a automação; ações manuais permanecem disponíveis. Perda de visibilidade e bfcache suspendem o relógio, sem criar outro loop.

## Uso privado

1. Abra `/experimentos/sk/` em navegador com WebGL2 e escolha localmente o GLB F1.6. Importe as três bibliotecas privadas F2.0-A; alternativamente abra a cópia privada que já as contém. Nenhum arquivo é enviado pelo laboratório.
2. Em Atuação → Original Animations, escolha um idle e Expressive Acting; clique Reproduzir. Use os quatro botões para inspecionar sorriso, piscada, olhar e retorno. A alternância automática pode ser desligada. Em Reference QA os novos morphs não são aplicados.
3. Confira cílios, íris e boca em todos os três idles; teste pausa, interrupção, retomada, troca de modo e movimento reduzido. No Android repita no Chromium e Samsung Internet. Exporte diagnóstico e captura apenas localmente.

## Evidências e limitações

- Testes sintéticos: canal facial limitado à lista, piscada e sorriso com cada idle sintético, pausas, recuperação, ausência de dois idles simultâneos e sessão aleatória determinística de 600 segundos. Testes do diretor F2.0-A e laboratório existentes continuam executáveis.
- Os três idles originais foram também carregados em Three.js por teste privado CPU: todos os 11 morphs foram encontrados e 315 amostras exercitaram sorriso, piscada e olhar. Teste reproduzível: `node tests/shorekeeper-gentle-acting-private.mjs /modelo-privado.glb /bibliotecas-privadas`. Sem renderização WebGL ou decodificação real de imagens.
- As rotações elevadas em Idle 02 e diferenças de auxiliares/continuidade em Idle 03 continuam como observações técnicas separadas; não foram alteradas. O usuário relatou aprovação visual das três sequências.
- **VISUAL_QA_PENDING** para a nova camada: expressões e compatibilidade visual em rosto, cílios e olhos não foram aprovadas nesta execução; nenhuma alegação de FPS móvel ou VRAM. Os pesos podem precisar de calibração após inspeção no modelo.
