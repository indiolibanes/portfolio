# QA — candidata R3, 16/11/2026

- Blender 4.3.2 / Cycles CPU / 24 amostras / saída RGBA transparente 352×384. Câmera ortográfica e luzes fixas.
- GLB canônico de 10.784.668 bytes: SHA-256 `b27b660a2d6f212a293a72ae0f4b95fefc584ecc7783fea569d314e967800dc1`, conferido antes/depois. Nenhuma edição no arquivo original.
- Dois giros de 875 ms, 21 quadros em 875 ms, exibição média de 24 fps, com extremos incluídos. Ângulos intermediários vêm da geometria, não reflexos.
- Quatro junções PNG com erro médio máximo por canal < 0,023/255; alfa médio < 0,0018/255. Resíduo de rasterização/ruído; enquadramento e pose coincidem visualmente nas folhas de comparação. Não se confunde erro médio baixo com prova de ausência de colisão em todos os vértices.
- Contatos claro/escuro e comparação contra perfis R2 inspecionados. Sem corte de cabeça/cauda nos PNGs; extensão horizontal web limitada a ±8% (mínimo 5 px de margem no master durante giros). A nova iluminação é comum às caminhadas e giros; não se conecta a câmera nova às caminhadas antigas.
- Giros 256: 294.704 / 296.534 bytes; 384: 403.990 / 405.662 bytes. Abaixo dos alvos. Memória RGBA máxima teórica por giro: ~4,82 MiB móvel e ~10,83 MiB desktop (21 quadros). Caminhada 58 quadros: ~13,31 / 29,91 MiB. Cache/heap real em telefone: NOT RUN.
- `npm run build`: PASS (Astro, OG, SEO, build hygiene).
- `npm run check:ux`: PASS, contrato UX e 15 testes (inclui cinco novos testes comportamentais do diretor: gates, cancelamento de carga pendente, sequência, falha de rede).
- Regressões R2/pre-R2: 23 PASS, 2 SKIP (modelo R2 legado não fornecido; o canônico v1.2.1 foi usado no baking).
- Chromium desktop em 390/768/1280: BLOCKED. Chromium local abortou antes de abrir página: `socket() failed: Operation not permitted`. Browser remoto não alcançou o servidor local (`ERR_CONNECTION_REFUSED`). Nenhum resultado de viewport real, rede, background ou layout shift é inferido dos testes simulados.
- Android físico / Samsung Internet: NOT RUN. Claro/escuro verificados nos renders, não no navegador.
- Prévia HTML local e vídeo comparativo entregues no pacote privado. A prévia usa os mesmos renders e o mesmo diretor; não equivale a QA da home em dispositivo real.
- Aprovação visual do proprietário, sincronismo nativo das WebPs em navegador e contato dinâmico das patas: PENDENTES. Sem merge automático; sem declaração de correção em produção.
