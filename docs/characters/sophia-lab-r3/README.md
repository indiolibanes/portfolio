# Sophia Laboratório R3 — candidata visual

Base da PR: `feat/sophia-lab-r2-20261114`, HEAD `7781262da521947d75b9db1c317d8a9b940f4157`.
Em 16/11/2026: #312 aberta/draft; #318 mesclada nessa branch, não na main. Pilha anterior preservada.
Cloudflare Pages `kaue`: produção ligada a `main`, deploy de produção `9e2cf7732b6ac866319c4971de55535e5cdeb741`. Esta PR não corrige produção e não autoriza merge.

## Conteúdo

Somente #lab: pré-renderização do GLB canônico, câmera ortográfica fixa, dois giros de 180 graus em torno de pivô no chão, antecipação de cabeça/pescoço, atuação original de Turn, atraso dos quatro ossos da cauda e orelhas. Caminhadas re-renderizadas na mesma cena; transições adicionais ligam a pose frontal às caminhadas. Malhas, rig, pesos, UV e materiais canônicos preservados. Nenhum espelhamento de imagem. CSS só realiza a translação horizontal das caminhadas.

Novos arquivos em `/assets/characters/sophia/lab/r3/`; exportações R2 permanecem byte a byte preservadas. 256 px em viewport até 640 px; 384 px nos demais. O PNG é a apresentação inicial sem JavaScript. Os giros não repetem; a codificação pode juntar quadros consecutivos idênticos conservando os tempos.

Ciclo de 16,11 s: escreve (duas repetições) → pensa → ponte frontal/perfil → caminha esquerda → giro LTR → caminha direita → giro RTL → ponte perfil/frontal. Apenas uma imagem exibida; a próxima fase é buscada quando necessária, sem baixar toda a coleção antecipadamente. Hover/foco no guia agenda Notice para a próxima pausa segura, sem cortar uma virada nem interceptar a navegação.

## Recursos e limites

Observer a 200 px da viewport; aba oculta, movimento reduzido, Save-Data, falha de rede e pagehide interrompem timer/rAF e restauram PNG. Epoch invalida downloads pendentes. Sem observer, permanece estática. Limpeza na troca de página Astro. Sem carregar modelo ou motor 3D por esta seção. Outras variantes da Sophia continuam independentes.

WebP usa o relógio nativo do navegador; timers coordenam fases e deslocamento. Em conexão fria, a imagem anterior pode segurar enquanto a próxima baixa. Não se declara sincronismo subquadro: cache de animações e temporização nativa variam por navegador. Medidas de memória no manifesto são limites RGBA teóricos por arquivo, não medições de heap ou GPU; cache interno do navegador pode reter mais de uma animação.

O baking e a cena derivada, junto com relatórios detalhados, são entregues no pacote privado. Nenhum GLB, blend, dump de rig ou script privado está nesta PR. Aprovação visual do proprietário continua pendente. Contato de patas e colisões são avaliados visualmente; não se afirma solver físico ou IK de plantio de pés.

## Verificação

Ver `QA.md` e `assets-manifest.json` para resultados, durações, dimensões e hashes. Samsung Internet, Android físico e memória em telefone real: NOT RUN. Não inferir validação móvel física a partir de viewport em Chromium.
