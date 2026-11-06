# Shorekeeper F2.1-C.3 — biblioteca privada de combate avançado

**Estado:** `STRUCTURAL_PREFLIGHT_PASS / CONVERSION_QA_PENDING / VISUAL_QA_PENDING`.

Continuam aprovados apenas os três idles e a piscada bilateral. Os quatro ataques básicos da fase C.1 foram preservados sem modificação; a C.3 acrescenta **quatro candidatos originais** da fonte ActorX, sem reinterpretar keyframes. A reprodução permanece manual até validação visual, sem autoplay, música ou VFX.

## Novas fontes privadas

Pacote: `Shorekeeper_F21C3_Advanced_Combat_Preflight_PRIVADO.zip` (não anexado ao repositório). Contém o PSK canônico, oito PSA (quatro pares corpo/Rib) e manifesto SHA-256.

| Arquivo fonte (corpo + Rib) | ID Three.js | Quadros | Duração aproximada | Alerta de QA |
|---|---|---:|---:|---|
| AttackL02 | `SK_ATTACK_L02_ORIGINAL` | 141 | 4,667 s | ataque pesado, deslocamento |
| Skill01 | `SK_SKILL_01_ORIGINAL` | 158 | 5,233 s | movimento de habilidade |
| SkillQte01 | `SK_SKILL_QTE_01_ORIGINAL` | 155 | 5,133 s | deslocamento significativo |
| AirSkill01 | `SK_AIR_SKILL_01_ORIGINAL` | 66 | 2,167 s | depende de contexto aéreo |

Metadados avaliados diretamente nos PSA do pacote: 243 entradas BONENAMES, uma ANIMINFO por arquivo, SCALEKEYS e ANIMKEYS consistentes; contagem de quadros e FPS coincidem em cada par corpo/Rib. Na comparação de mudanças das propriedades (limiares do conversor) não houve propriedade com movimentação em ambas as fontes para esses quatro pares. Isso **não demonstra** fidelidade semântica da pose, correção de root motion ou renderização em WebGL.

A comparação das posições de origem nos dados ActorX indica deslocamentos relevantes: `Root` altera-se cerca de 141, 89, 181 e 240 unidades-fonte, respectivamente; `Bip001` pode contribuir com movimentos adicionais. Não transformar diretamente essas medidas em distância de palco ou métricas de jogo sem conferir as conversões de unidade, bone ownership e transformações de hierarquia. Alguns movimentos poderão sair do enquadramento; câmera automática permanece desativada.

## Conversão privada

1. Extrair o ZIP **fora** do repositório Git.
2. Executar `python3 scripts/shorekeeper/convert-advanced-combat.py PRIVATE_SOURCE PRIVATE_MODEL.glb PRIVATE_OUTPUT` com dependências existentes `numpy` e parser ActorX local.
3. Conferir os logs, `conversion-report.json`, os arquivos `ownership-{nome}.json` e os SHA-256 gerados.
4. Para cada arquivo `SK_*.animations.glb`, validar o carregamento local e o playback individual no Three.js.
5. Comparar neutro, entrada, movimento, fim e recuperação, frontal/¾/corpo inteiro.

O conversor C.3 é uma cópia isolada, parametrizada, do C.1. Ele preserva escala, quaternions, keyframes originais, duração, ownership por **propriedade** e produz três clipes por biblioteca (composto, BODY, RIB). Falha explicitamente quando houver concorrência de propriedades animadas.

Nenhum glTF, PSA, PSK ou textura do jogo foi inserido no repositório público. O modelo privado permanece o F2.0-A com SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`.

## Uso na rota

Na rota `/experimentos/sk/`, modo **Combate · experimental**, carregar **até quatro bibliotecas por seleção**; você pode importar as quatro básicas e, em outra seleção, as quatro avançadas. Os controles avançados só são habilitados quando o respectivo clipe está presente no GLB importado. A execução usa o diretor corporal existente e o mesmo render loop; nenhum writer facial foi alterado.

Os quatro novos identificadores são aceitos pela verificação de bibliotecas, mas nenhum é chamado de original visualmente aprovado nesta entrega. A UI mantém o caráter experimental de habilidades aéreas e QTE.

## Gates restantes

- Validar a conversão completa dos quatro pares com o GLB privado real.
- Conferir `Root`/`Bip001`, pose aérea e saída de quadro.
- Verificar malhas, roupa, fitas, dedos, cabelos e snapping nos limites dos clipes.
- Registrar FPS real em desktop e Samsung Internet.
- Não encadear movimentos aéreos, QTE ou ataques longos até comprovar o estado inicial e final.
- Se os movimentos tiverem dependências de estado, criar máquina de estados de sequência **separada**, não acelerar ou reescrever os arquivos originais.

**Integração:** PR draft empilhado sobre #212 (que permanece em cima de #211); sem merge automático e sem modificações em main.
