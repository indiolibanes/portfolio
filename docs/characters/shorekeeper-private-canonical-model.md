# Shorekeeper — GLB privado canônico e carregamento local persistente

## Arquivo recomendado

- **Nome:** `PRIVATE_shorekeeper_f20a_original_idles.glb`
- **Tamanho:** 39.487.548 bytes
- **SHA-256:** `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`
- **glTF:** versão 2.0; 1 skin; 11 animações
- **Idles originais:** `SK_IDLE_01_ORIGINAL`, `SK_IDLE_02_ORIGINAL`, `SK_IDLE_03_ORIGINAL`
- **Variantes presentes:** `_BODY` e `_RIB` para cada idle, além de 2 clipes F1.6.
- **Base facial:** as fases B.5/B.5.1 modificam controles e morph weights **no runtime**, não os bytes do GLB. O nome F2.0-A permanece correto.

O modelo permanece **privado**. Não acrescentar seu binário nem arquivos PSA, texturas ou animações extraídas em `public/` de um repositório ou deploy público sem uma autorização apropriada de distribuição.

## Uso após esta branch

1. Obter o GLB do pacote privado aprovado.
2. Abrir `/experimentos/sk/` no mesmo navegador/dispositivo.
3. Selecionar o GLB na entrada **Modelo privado**.
4. Verificar se o status informa **GLB canônico F2.0-A verificado**.
5. Acionar **Guardar neste navegador** — a aplicação grava o arquivo no IndexedDB do mesmo origin, somente com consentimento explícito.
6. Nas próximas visitas nesse navegador e origin, o GLB é recarregado automaticamente da cópia local. Não há chamada a fetch, upload ou CDN.
7. **Esquecer cópia local** apaga a entrada persistida sem interromper o modelo em execução.

O IndexedDB depende de armazenamento disponível, controles de privacidade e persistência do navegador; não é armazenamento garantido. Esvaziar dados do site ou trocar de dispositivo/origin/preview exige nova seleção. Se houver bloqueio de IndexedDB, a seleção manual continua funcional.

**Atenção:** o preview temporário do Cloudflare e a URL definitiva têm *origins* diferentes; o armazenamento de um não é partilhado com o outro. Para conservar a cópia, prefira a URL de branch estável ou o domínio final.

## Contrato de integridade

`SHOREKEEPER_CANONICAL` declara a identidade canônica conhecida, incluindo hash/tamanho/clips. O carregador local permanece responsável por calcular SHA-256 e verificar que o glTF é autossuficiente. O sistema não cria dados de movimento novos, não altera o esqueleto, não inclui novo render loop e não altera os três idles aprovados.

**Validação pendente:** QA WebGL no Samsung Internet, persistência em armazenamento real, quota de 40 MB e estabilidade a 60 FPS. Build e testes de Node **não** substituem o teste do navegador.

## Créditos

Shorekeeper, seus materiais e animações são parte de **Wuthering Waves**, da **KURO GAMES**. Este laboratório de pesquisa de animação é independente e não oficialmente afiliado.
