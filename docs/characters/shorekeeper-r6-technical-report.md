# R6 — parecer técnico de implementação

A plataforma facial R6 está implementada em candidatos manuais, com baselines preservados e material real de WebGL disponível para a próxima revisão. O estado permanece **VISUAL_QA_PENDING**, com **APPEARANCE_PROFILE_UNVERIFIED**. O código congelado para handoff é `aa4da15f73bd06d790a606ec5701a8046ebded15`; os commits seguintes registram o dossiê.

## Resultado verificável

| Tipo de prova | Resultado | Alcance |
|---|---|---|
| Regressões Node | 103 PASS, 0 falhas | Inclui cinco testes R6, 70 streams de baseline e sessão simulada 600s |
| Baseline WebGL | 1.050 pares PNG idênticos byte a byte | Cinco geometrias, três câmeras, dois viewports, sete receitas, cinco intensidades; tolerância zero |
| Atlas | 83 nomes / 97 instâncias / 1.455 PNG | Geometria, deltas/sinais/áreas, pixels, 97 contact sheets; 249 ossos |
| Vídeo real-material | 28 vídeos ativos | Oito famílias × três ângulos, três idles, um gesto; stepping offline 10fps |
| Correspondência com código final | 3.976 vetores de frame iguais | Pesos e SHA dos PNG/MP4 ativos conferidos; versões antigas de dois candidatos são superseded |
| WORRIED | 180 provas de isolamento | M_Ennui causa bordas desconectadas; candidato mantém boca neutra e B_Sad1/E_Sad.7 |
| Asset privado CPU | 9 ciclos de idles completos | Buffers/materiais/clipes intactos; transformações dos 249 ossos e 69 canais restaurados |
| Navegador manual | 123,724s de parede, nove comandos | Separado dos 600s simulados; baixa velocidade de SwiftShader não equivale a timeline em tempo real |
| Lifecycle no navegador | PASS no replay corrigido | 3 recargas, restauração WebGL, offscreen com RAF pending=false, retomada e reduced motion |
| Build | PASS em cópia isolada idêntica | Sete rotas, OG e higiene estrita. CI do head anterior também verde; conferir último head na PR |
| GPU física / Samsung | Não executado | Exige hardware e sessão externa |
| Aceite humano / Sonnet / Astra | Não executado | Nenhum candidato promovido ou aprovado antecipadamente |

## Artefatos e privacidade

O pacote privado de revisão tem 28 MP4, sessões reais de UI, 97 contact sheets, picos selecionados, timelines, hashes e matriz. Sua retenção foi confirmada. O atlas integral lossless separado tem 3.737 caminhos PNG (3.735 capturas e dois gráficos), deduplicados em 1.961 objetos. Sua tentativa de retenção expirou sem confirmação; a cópia integral local permanece disponível. Nenhuma repetição automática da gravação ambígua foi feita. O resumo JSON registra tamanhos e SHA dos dois arquivos.

Nenhum GLB, PSA, GIF de origem ou screenshot novo está no diff público. Não houve mudança nas políticas de autenticação/R2, Hsin, clipes de combate, variantes Root ou GLB. Os candidatos não registram RAF/mixer nem consultam vértices no frame. A rota normal conserva o sistema anterior; `facialR6=1` ativa a bancada manual.

## Limites e falhas documentadas

A aprovação humana histórica confirma nomes de aparências, mas não identifica a geometria/câmera/material/idle da sessão. As cinco geometrias e as receitas antigas ficam selecionáveis; não é autorizado promover R3/R5 ou fundir variantes.

O capuz canônico cobre os olhos em +90°. O perfil comprova oclusão da cena, não exposição da íris. A inspeção bilateral é sustentada pelo frontal, três-quartos e deltas. Não removemos o capuz nem alteramos materiais para fabricar visibilidade.

A primeira sessão longa de UI completou o tempo manual e recargas, mas o driver tentou clicar num disclosure fechado antes de executar o teste de contexto. O replay corrigido abriu o disclosure e passou contexto, offscreen e reduced motion. A falha original é conservada no pacote. Algumas reconstruções locais detectaram arquivos temporários de prerender/cópia durante a sincronização do workspace; nenhuma exceção foi acrescentada ao verificador. O build final em cópia isolada passou.

O método angleTo sobre quaternions de origem levemente não unitários produziu um falso erro no teste privado. A comparação foi corrigida para componentes, preservando a precisão de 1e-6 e sem alteração do runtime corporal.

O teste manual apresentou amostras de ~0,7–1,8 FPS em software, com dt limitado a .1s. Esses números não validam a meta de desempenho desktop/Android. As amostras de CPU da UI incluem render/diagnóstico e não medem isoladamente o diretor facial. Pós-combo completo ainda depende das bibliotecas privadas que não vieram no pacote.

## Próxima etapa e rollback

A matriz contém **19 PASS técnicos, seis PENDING_EVIDENCE e dez NOT_APPLICABLE/R7**. Sonnet deve revisar candidatos e confirmar o perfil com o autor; Astra fará auditoria independente depois. R7 e a direção emocional não escrevem no runtime nesta etapa.

Para rollback de inspeção: usar Restaurar sessão QA (face/câmera/órbita/geometria/controles) ou remover `facialR6=1` e recarregar, retornando ao sistema legado. Não mesclar nem promover os presets. Wuthering Waves e Shorekeeper © KURO GAMES; experiência independente e não oficial.
