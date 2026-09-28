# Fluxo de publicação do portfólio

Este documento descreve o caminho mínimo entre uma nota de trabalho e a versão publicada do portfólio. O objetivo é tornar o processo reproduzível, auditável e simples de recuperar.

## Escopo

O fluxo deliberadamente mantém quatro peças principais:

1. **Obsidian** — escrita, rascunho e organização do conteúdo;
2. **Git / GitHub** — histórico, revisão de mudanças e fonte versionada do site;
3. **Astro** — transformação do conteúdo e dos componentes em site estático;
4. **Cloudflare Pages** — build e publicação.

Ferramentas editoriais adicionais não fazem parte do fluxo obrigatório.

## Fluxo

```text
Obsidian
   ↓
revisão do conteúdo
   ↓
Git / GitHub
   ↓
Astro
   ↓
Cloudflare Pages
   ↓
portfólio publicado
```

### 1. Escrever e revisar

O conteúdo nasce no Obsidian ou diretamente no repositório quando a alteração é estrutural. Antes da publicação, o texto deve estar suficientemente estável para ser apresentado como trabalho ou documentação.

### 2. Versionar

Mudanças entram no Git com commits pequenos e descritivos. O repositório registra tanto o resultado quanto as decisões que levaram até ele.

Princípios:

- não misturar correções não relacionadas no mesmo commit;
- preservar assets e seções já aprovadas;
- preferir caminhos relativos para recursos do próprio projeto;
- manter credenciais fora do repositório.

### 3. Gerar

O Astro compila a página estática e executa o script que gera a imagem Open Graph.

```bash
npm install
npm run build
```

Falha de build bloqueia a publicação até que a causa seja corrigida.

### 4. Publicar

Cloudflare Pages acompanha o branch `main`. Um commit aprovado inicia um novo deploy e a versão anterior permanece útil como referência no histórico do Git.

## Atualização

Para alterar conteúdo publicado:

1. localizar o componente ou conteúdo responsável;
2. limitar a mudança ao escopo solicitado;
3. executar o build;
4. revisar o diff;
5. commitar;
6. confirmar o deploy.

## Recuperação

Se uma mudança causar regressão:

- identificar o último commit estável;
- comparar somente os arquivos afetados;
- corrigir por novo commit, preservando o histórico;
- evitar reverter assets ou seções não relacionadas.

## Assets

Recursos fundamentais devem, quando possível, ser servidos pelo próprio projeto em `public/`. Dependências externas ficam restritas a integrações que realmente precisam permanecer externas, como Last.fm.

## Critério

O processo é intencionalmente simples: **uma fonte de trabalho, um histórico versionado, um gerador e um destino de publicação**.
