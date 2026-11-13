# Identidade — IDENTITY_BLOCKED

O artefato entregue é `R1C_6H_VISUAL_CANDIDATE`: um estudo localizado da gola da 6H, sem aprovação como corpo C1. A referência C1 foi encontrada e inspecionada; não há bloqueio de acesso à arte.

| Componente | C1 autoral | Fonte 6H / piloto / derivado R1.C | Gate |
|---|---|---|---|
| Silhueta e rosto | Figura humanoide de pernas longas, rosto de inspiração anime | Mascote de raposa compacto, focinho e proporções diferentes | BLOCKED |
| Cabelo | Branco/prateado, comprido, franja opaca sobre a testa | Pelagem e crista; sem franja suficiente na área da marca | BLOCKED |
| Testa | Uma marca de nascimento dourada plana de quatro pontas, diretamente na pele, parcialmente oculta | Três estrelas salientes originais, ainda presentes no estudo experimental | FAIL |
| Olhos e orelhas | Olhos dourados e orelhas de raposa | Afinidade de cor e espécie, insuficiente para provar identidade completa | PARTIAL |
| Corpo aprovado | Necessário corpo C1 aprovado pelo proprietário | Nenhum corpo 3D C1 aprovado demonstrado pelas fontes disponíveis | BLOCKED |
| 7B E1 | Não é autoridade C1 por conveniência | Fonte distinta, sem rig ou clipes embutidos | BLOCKED como substituta animada |

O master `Sophia_2D_Master_RGBA.png` é a referência de identidade. É arte 2D, não um conjunto de quatro projeções geométricas. O painel privado a identifica como arte, ao lado de ortografias reais da 6H e do ensaio; não fabrica costas/perfil C1. As ortografias 6H, piloto e derivado usam Idle em 0 s, mesma câmera/luz/escala. A 7B usa sua geometria estática sem animação, explicitamente identificada.

Foi considerada uma máscara de material ou cor de vértice na pele craniana (primitiva fonte 274). Ela não tem TEXCOORD_0; uma marca plana não exige obrigatoriamente novo UV, e isso, isoladamente, não prova inviabilidade. O bloqueio decisivo é a ausência da franja e a divergência do rosto/corpo: uma máscara plana continuaria exposta, sem a oclusão autoral exigida. Não foi criada uma falsa solução por decal sobre pelo, nova franja, joia, halo, novo osso ou morph. As três estrelas legadas ficam identificadas como defeito da candidata experimental, nunca como marca C1.

`C1_face_mark.mp4` NÃO é entregue como resultado aprovado: não existe marca C1 implementada. O vídeo privado `C1_identity_blocked.mp4` documenta a divergência nas vistas reais 0°/45°/90°. Não é demonstração de oclusão resolvida.

Decisão mínima seguinte, sujeita à inspeção do proprietário: localizar/indicar um corpo 3D C1 já aprovado, ou decidir explicitamente o escopo de uma futura adaptação autoral. Não iniciar R1.D, reconstrução corporal ou geração de penteado automaticamente.

Proveniência: base #304 `c59335f823f30ed2af4e55ccddc1044277929d61`; handoff #305 `bbd350e8c5a8e9edbd5596282a772f2dd8c3bd9a`; preflight #303 `cb1ae5ebeaeee43b0ea26d2d7cdd2363905c7c8b`, consultado sem merge. O antigo aviso de piloto ausente foi superado pela recuperação do arquivo privado fd278e20…; as 255 poses eram equivalência, enquanto a matriz de colisões original continha 61 poses.
