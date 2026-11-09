# Matriz de referências visuais — Shorekeeper F1.4

**Critério:** os pares foram associados pela semelhança visual das imagens enviadas; a correspondência de habilidade e do timecode NÃO foi comprovada. Confirmar arquivo, vídeo e frame no material recebido antes de promover confiança.

| Laboratório | Referência de gameplay | Observação demonstrável | Identidade candidata | Estado / verificação exigida |
|---|---|---|---|---|
| `201995.jpg` | `201990.jpg` | Ambas mostram núcleo escuro luminoso e elementos orbitais; a referência apresenta anéis magenta/ciano, composição e escala diferentes | Illation / Heavy aprimorado | HIPÓTESE. Exigir vídeo contínuo, fonte e timing; não editar como parte da Liberation |
| `201997.jpg` | `201991.jpg` | Borboleta junto à mão; no laboratório a asa cruza a silhueta cabeça/cabelo, a referência destaca rosto, dedos e asas | Interação cinematográfica borboleta/mãos (End Loop candidata) | FOCO F1.4. A/B de máscara facial, profundidade e câmera; provar oclusão real versus mascaramento por shader |
| `201992.jpg` | `201986.jpg` | Movimento corporal inclinado/acrobático; frames não demonstram mesma trajetória | Basic/ação aérea/contragolpe indeterminado | NÃO CLASSIFICAR etapa Basic pelo frame. Requer clipe contínuo PSA + vídeo fonte |
| `201999.jpg` | `201978.jpg` | Abóbada/luzes do Stellarealm; referência mostra maior mistura cromática e estrutura de luz diferente | Apresentação do Stellarealm | FOCO F1.4: estudo cromático explícito. Cor NÃO implica Outer/Inner/Supernal |
| `201996.jpg` | `201988.jpg` | Borboletas luminosas ligadas à atuação da personagem | Chaos Theory ou Intro Enlightenment (ambíguo) | NÃO ATRIBUIR habilidade sem contexto do gameplay e fonte |

Observação adicional: `201462.jpg` é um close de borboleta/dedos/rosto de uma referência anterior; `201464.jpg` é uma cena da Hsin, fora do escopo F1.4.

## Modelo de registro por evento

Criar um CSV ou JSON PRIVADO com as colunas:
`refFile, sha256, sourceVideo, sourceTimeStart, sourceTimePeak, sourceTimeEnd, observedPose, observedVfx, observedCamera, candidateAbility, candidateClip, identityConfidence, motionConfidence, visualDifference, status`.

Separar as classes:
- **OBSERVED:** o que o quadro mostra, sem identificar habilidade;
- **INFERRED:** habilidade provável, explicitando alternativas;
- **SOURCE_VERIFIED:** clip e origem/hashes tecnicamente verificados;
- **MOTION_MATCHED:** trajetória, corpo e timing confirmados em vídeo + GLB skinnado real;
- **PRESENTATION_PARTIAL:** câmera/VFX não são ainda fiéis;
- **CANONICAL_PENDING:** não há aceitação final.

Uma imagem não mede trajetória, tempo de impacto nem bone motion. O Sonnet deve deixar lacunas, não inventar medidas.
