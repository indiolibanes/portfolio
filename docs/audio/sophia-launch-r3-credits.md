# Sophia launch R3 — fontes de áudio

Verificação: 2026-11-13. Todos os arquivos entregues são locais, em `public/audio/sophia/launch-r3/`; nenhum visitante depende de Freesound, cookies ou login. Não há música comercial, NASA/SLS, microfone ou transmissão de lançamento real.

| Material efetivamente obtido | Autoria e página | Licença declarada na página | Edição usada |
| --- | --- | --- | --- |
| Voice Male Radio Countdown 5 to 0 | [qubodup / 67628](https://freesound.org/people/qubodup/sounds/67628/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Preview público HQ MP3, seis trechos mono a 80 kb/s com fades curtos. O original FLAC não foi baixado |
| Large Rocket Engine | [Zovex / 237974](https://freesound.org/people/Zovex/sounds/237974/) | CC0 1.0 | Preview público HQ MP3; trecho 2–8 s, mono 96 kb/s, high-pass 35 Hz, low-pass 5500 Hz, fades 120/200 ms. Original AIFF não baixado |
| Whoosh, ventilação e estalo da trava | Síntese original em `sophia-launch-audio.ts` | Código autoral desta implementação; sem sample externo | Ruído determinístico filtrado e envelopes WebAudio |

URLs dos previews efetivamente baixados: `https://cdn.freesound.org/previews/67/67628_71257-hq.mp3` e `https://cdn.freesound.org/previews/237/237974_1087398-hq.mp3`. SHA-256 dos downloads de referência:

- countdown: `f5e3114241124e5a4a0e544f644e68fe1e6a9f7a7bc9413dfc99c307ad2de508` (100907 bytes).
- engine: `6597826aad22d00d7c3281f89d021569270a7374b66e07e56663c40717cf4f5f` (255936 bytes).

O texto genérico do perfil de qubodup menciona CC BY, mas a licença específica exibida no rodapé deste som é Creative Commons 0; a atribuição foi mantida de qualquer modo. As outras fontes sugeridas no prompt não foram embarcadas. Não alegar que os seis samples externos foram usados.

## Marcas e sincronização

`ffmpeg silencedetect` (-30 dB, duração mínima 80 ms) identificou seis ilhas na contagem de 5.198 s. Trechos adotados na ordem anunciada pela fonte: 5=`0.000–0.490`, 4=`1.060–1.490`, 3=`2.020–2.430`, 2=`2.850–3.260`, 1=`3.705–4.120`, 0=`4.580–5.020` s do preview decodificado. São cortes de arquivo, não markers do jogo. O runtime agenda cada trecho na fronteira de seu dígito com AudioContext.currentTime + (tempo do evento − tempo ativo). Lookahead de 150 ms; eventos atrasados mais de 100 ms não são repetidos. Pausa suspende o contexto junto do relógio; replay cancela os sources antigos. Mute inicial é respeitado antes de criar o contexto. Ducking do engine .28→.12 (~7.36 dB) durante cada voz.

Os limites foram examinados por silêncio e decodificados com ffmpeg; a inteligibilidade, timbre, início perceptual e mix final em alto-falante/celular ainda precisam de escuta humana em navegador. Testes com AudioContext simulado certificam agendamento, não audibilidade. MP3 pode ter diferenças de padding entre decoders: incluir teste Samsung antes de aceite audiovisual.

| Arquivo entregue | Bytes | SHA-256 |
| --- | ---: | --- |
| `0.mp3` | 5007 | `edf1fb5f549b44325f0c23ed5890c2ad26b9aa071633a1875c81ac4a80fd9b64` |
| `1.mp3` | 4746 | `21216fea76d2308b581e2d0676be4f18b2d555f8d15364b85c8af138d2bde0a5` |
| `2.mp3` | 4746 | `8b7f8f45979c24dcacfb5c528f4a1458a1bfe0a09b6b87b00bf7b30dff579e75` |
| `3.mp3` | 4746 | `ff092a5d98d2ecb505cb9da9a4a26c74bc14ec220233087786d17e34810c4b65` |
| `4.mp3` | 5007 | `7b1645e856889edf71aca68278d14054cdbc83818783e487f75c0b844ce52c15` |
| `5.mp3` | 5530 | `b4678a916b05fe716d69bfe2496138ac8cb974ead9293417eb2299d91b44f641` |
| `engine.mp3` | 72620 | `4c3f494da4f494dbbe2965b08c09d0353458d4bb128d3c1b32653f7b624dc018` |

Total: **102,402 bytes** (aprox. 100 KiB), sete arquivos. Nenhum GLB duplicado.
