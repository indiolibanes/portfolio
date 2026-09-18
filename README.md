# Kauê Alencar — Portfólio

Portfólio pessoal voltado a **escrita, documentação, organização da informação e publicação digital**.

O projeto também funciona como laboratório de arquitetura de conteúdo, interfaces editoriais e pequenos experimentos de integração.

## Stack

- [Astro](https://astro.build/)
- Cloudflare Pages
- Markdown / Git
- Last.fm API para atividade musical recente

## Estrutura

```text
src/
  components/
  layouts/
  pages/
  styles/

functions/
  api/
```

## Desenvolvimento

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

## Last.fm

A seção musical usa uma Cloudflare Pages Function como intermediária.

Variáveis necessárias no Cloudflare:

```text
LASTFM_USERNAME
LASTFM_API_KEY
```

A chave não deve ser commitada no repositório.

## Princípios

Clareza antes de ornamentação.  
Estrutura antes de ferramenta.  
Documentação deve sobreviver a quem a escreveu.

---

© Kauê Alencar. Código e conteúdo sem licença aberta declarada.
