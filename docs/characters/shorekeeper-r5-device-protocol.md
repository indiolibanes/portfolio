# Protocolo de QA — GPU desktop e Samsung Internet (R5)

## Método

Executar no **preview autorizado** do PR R5, com GLB canônico carregado por fluxo privado/local e bibliotecas de combate reais. A evidência R4 foi WebGL2/SwiftShader; aqui busca-se desempenho real. Registre data/hora local, aparelho, versão Android, Samsung Internet, modelo de GPU/renderer, DPR, resolução, estado de bateria/energia, modo desempenho, rede e condições térmicas. Não incluir identificadores de conta ou endereços de storage nos logs públicos.

## Percurso cronometrado de 600 s reais (não simulação)

- 0–90 s: três idles originais + neutral/sorriso/blink/neutral, câmera frontal/¾; verificar material de rosto.
- 90–180 s: borboleta individual/enxame + Core nas cinco fases, mover câmera lentamente; observar sobreposições em mãos e tecidos.
- 180–300 s: campo e canopy juntos com céu/ruínas; alternar aspectos, zoom, câmera manual e câmera opcional; anotar contagem de draw calls e frame times.
- 300–440 s: combo Basic1–4→Skill→Burst02→Landing→Idle, repetir várias vezes, variantes Root e interrupções; medir latência até início e procurar pausas de preparação.
- 440–520 s: alternar aba, ocultar/mostrar laboratório, reduzir movimento, pausa/playback, carregar/descartar modelo e cancelar combo durante preparação.
- 520–600 s: reabrir, trocar modos, contexto perdido/restaurado quando suportado, navegar e voltar por bfcache **real**, registrar consumo e sinais térmicos observáveis.

Capturar FPS real e frame-time p50/p95 (quando disponível), long tasks, draw calls, triângulos, geometrias/texturas do renderer, erros, quedas de contexto, memória que o ambiente permitir medir. Não inventar métricas de VRAM, bateria ou temperatura.

## Visual humano — matriz de prova

1. Facial canônica/R2/R3/R4/R5 com câmera e peso iguais, frontal, 45° e perfil, crop e visualização no tamanho celular. Repetir com três idles e blink bilateral.
2. Butterflies frente/lateral/atrás, asas abertas/intermediárias/fechadas, voo ≥3 s, enxame enquanto personagem se move.
3. Core 5 fases, leitura da boca e das mãos em plano inteiro; field+canopy+personagem+céu+ruínas na mesma cena, 16:9 e retrato.
4. Burst02 A/B/C: câmera fixa e vista topo, giro preservado e estado final. Combo integral com piso/pés/pelve visíveis; verificar contato depois da Burst e a chegada ao Idle.
5. Acessibilidade: reduced-motion, pausa, controles manuais e feedback de carregamento. Não usar resultados de emulação como prova física.

## Estados de aprovação

- `STRUCTURAL_PASS`: testes/código.
- `WEBGL_RENDER_PASS`: render real (SwiftShader ou GPU, declarado).
- `PERFORMANCE_PASS`: dados reais em dispositivo alvo.
- `HUMAN_APPROVED`: aceite explícito da pessoa proprietária.
- `RELEASE_READY`: soma dos P0 relevantes + proteção de assets/licenças + autorização de implantação.

Quando não houver aparelho, deixar `NOT_TESTED_ON_DEVICE` e uma tabela com os passos para o proprietário executar. NÃO bloquear a correção dos defeitos já reproduzidos.
