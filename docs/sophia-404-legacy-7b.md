# Sophia 404 — duas gerações (6H e 7B-E1)

## Composição

- **Fliperama:** Alpha 6H já versionada, enquadrada **somente no rosto, ombros e início do tronco**. O osso `tail_1` é recolhido, e acessórios `Book`/`Pen` são ocultados. Legenda: `SOPHIA / LEGACY`.
- **Quarto 2.5D:** E1 Tripo, carregada exclusivamente de `/experimental/sophia-7b-e1.glb`, sem conversão automática da antiga 6H. O cenário Three.js atual é mantido, sem alterar o jogo.
- **Movimento:** a E1 tem **uma única malha, nenhum esqueleto e nenhuma animação**. Admite apenas leve idle da raiz (mudança de peso, inclinação), sem caminhada nem manipulação real dos botões. Para passos e ações independentes será necessário rig com joints/weights e clipes exportados do Blender.
- **Fallback:** sem WebGL, com movimento reduzido/economia de dados ou com GLB indisponível, os SVGs permanecem visíveis.

## Bloqueio binário da versão E1

O modelo original foi fornecido pelo autor nesta conversa, mas **não foi transferido automaticamente ao GitHub** porque a integração GitHub não aceita um arquivo binário local como argumento de criação de arquivo.

É necessário adicionar o arquivo de **17.054.692 bytes** à própria branch:

`public/experimental/sophia-7b-e1.glb`

Nome local preparado: `sophia-7b-e1.glb`.

SHA-256 esperado:

`b0f2c2e9106768b74b0582a703cf5b1c4d4ac2aac57b461ddc22f5696791c53a`

### Upload pela interface do GitHub

1. Selecione a branch `feat/404-sophia-legacy-and-7b-2026-10-30`.
2. Abra a pasta `public/experimental/`.
3. Use **Add file → Upload files** e envie `sophia-7b-e1.glb`, depois faça commit nessa branch.
4. O workflow `Sophia 404 arcade QA` verifica SHA-256, GLB válido, renderização e Tetris em 390/768/1440.

**Não fazer merge** enquanto a etapa `Required 7B-E1 binary` estiver falhando; caso contrário, apenas o fallback vetorial do quarto seria exibido.

## Próxima fase — animação com rig

Exportar uma nova versão da E1 com armature e ao menos clipes `Idle`, `Walk`, `ButtonPress_L`, `ButtonPress_R`, `Celebrate`; manter `7B-E1` estática como base/benchmark. Não movimentar mãos artificialmente por máscaras de vértices ou alterar o modelo original sem aprovação visual.
