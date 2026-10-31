# Open Graph — revisão autoral (31/10/2026)

## Objetivo

A miniatura do portfólio deixa de se apoiar em uma piada circunstancial e passa a comunicar a evolução do projeto: escrita, documentação, interfaces e experimentação visual. A Sophia permanece como personagem do site, agora com a expressão da ilustração original, sem acessórios e gestos acrescentados artificialmente para a versão anterior.

## Identidade editorial

- **Título:** Kauê Alencar
- **Assinatura:** Escrita, interfaces & mundos possíveis.
- **Selo:** Portfólio · Laboratório autoral
- **Disciplinas:** Documentação · Design · Experimentos 3D
- **Paleta:** azul-noturno, creme, detalhes dourados e constelações
- **Composição:** tipografia hierarquizada à esquerda, Sophia à direita, vinheta gradual para legibilidade e margem segura para cortes de miniatura

A assinatura não afirma que todos os experimentos 3D estão publicados ou concluídos. Ela expressa uma direção criativa.

## Fonte e pipeline

A arte agora é gerada no próprio `scripts/generate-og.mjs`, durante `dev` e `build`, a partir da ilustração já presente em `public/images/sophia/lab-single-tail.webp`. O Sharp desenha o fundo e a tipografia SVG e converte o resultado diretamente em `public/og-portfolio.jpg` (1200×630).

Foram retirados o PNG antigo, o GIF opcional obsoleto e o gerador Python que reproduzia a composição anterior. Não há dependência de geradores externos nem alterações no modelo 3D da Sophia.

Os metadados OG/Twitter seguem centralizados em `src/config.ts` e `src/components/BaseHead.astro`. O parâmetro de versão é `?v=20261031a`, para reduzir persistência de cache nas plataformas de compartilhamento.

## Verificações

```bash
npm install
npm run check:og
npm run build
```

O verificador `scripts/verify-og.mjs` passa a validar a nova origem e a ausência da frase antiga nas fontes ativas, além dos metadados, dimensões, formato JPEG e páginas geradas. A inspeção visual final deve conferir rosto, corte, contraste e legibilidade em miniaturas de 300–400 px. O build local/preview hospedado não é considerado aprovado sem execução registrada.

Não alterar `main` sem aprovação. Esta revisão é preparada em branch própria.
