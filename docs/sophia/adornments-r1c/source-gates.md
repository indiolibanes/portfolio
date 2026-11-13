# Sophia R1.C — Decisões de fonte e intervenção

> **CORREÇÃO AUTORAL PRIORITÁRIA (2026-11-13):** o alvo desta recuperação é a **Sophia RAPOSINHA / mascote celestial**, **não** a Sophia anime antropomórfica C1. O gate `IDENTITY_BLOCKED` por divergência com rosto/franja/proporções anime utilizou a referência errada e está **SUPERSEDED_WRONG_TARGET**. Consulte obrigatoriamente [`OWNER-CORRECTION-FOX-SOPHIA.md`](OWNER-CORRECTION-FOX-SOPHIA.md) antes das instruções históricas abaixo. As fontes 6H/7B/R5/R6 são candidatas da **raposinha**, e a falta de R2/WebView bloqueia somente a verificação REMOTA, não impede estudo não destrutivo sobre a 6H verificável. Não solicitar `Sophia_v1.1.glb` anime nem master anime como pré-requisito da R1.C.1. Reavaliar a identidade com a **arte 2D da raposinha**, sem aprovação artística automática.


| Fonte / artefato | Provado | O que NÃO prova |
|---|---|---|
| 6H alpha, SHA 3b0e7db8… | Equivalência com 6H arquivada; 101 joints; 5 clipes; Book/Pen originais | Que a 6H tenha identidade C1 aprovada |
| Piloto SHA fd278e20… | Book/Pen/estrelas recuperados sem alterar payload/curvas; 255 poses equivalentes | Contatos corretos ou marca C1 |
| 7B E1 | Malha e texturas; sem rig/clipes embutidos | Que seja base animável pronta para jaleco |
| Astronauta R3 | Relatório anterior de 47 clipes, asset separado | Direito de modificar sua malha ou adaptar o vestuário autoral |
| Arte C1 | Autoridade de identidade da Sophia autoral | Prova geométrica de que 6H ou 7B está aprovada |

## Propriedades específicas
- **Marca:** uma marca dourada de QUATRO pontas, PLANA SOBRE A PELE, sob franja branca OPACA. A 6H tem três relevos, não conformes. Sem halo, decal na franja ou ornamento metálico.
- **Write:** mãos × Pen 61/61 pode incluir contato necessário. Não classificar toda interseção como defeito, nem ignorar penetração visível. Provar close e orientação da pena.
- **Manga:** wrists/forearms × sleeves 12/61, cuffs × Book 60/61. Ajustar malha/pesos locais apenas onde impactem a leitura.
- **Gola:** chin × collar 12/61, principalmente Write. Preservar gola/lapela.
- **Cauda:** tail × body e tail × coat 61/61. Separar encaixe anatômico de penetração excessiva e documentar a região afetada.
- **Ombro:** `shoulders__coat` é `REGION_UNRESOLVED` (0 triângulos selecionados no relatório). Primeira ação: corrigir segmentação e medir, nunca declarar ausência de colisão.
- **Ear ribbons × mane:** 4/61. Só corrigir após prova visual de defeito.
- **Fonte privada:** GLB piloto e BLEND não estão em Git. Verificar o arquivo entregue ou reconstruir localmente pelo builder de #304 e comparar hash. Não criar novo GLB de produção com 20 MB por acaso.

## Escada de decisão de vestuário
**A** Recuperar malha e ajustar pesos/contato com rig original → tentada primeiro.
**B** Retopologia ou remesh parcial da gola/manga/barra somente se A falhar com evidência.
**C** Tripo3D para um único jaleco separado somente após demonstração de inviabilidade de A e B e autorização expressa do proprietário.

Os gates são independentes: SOURCE_VERIFIED, BODY_C1_APPROVAL_PENDING, CONTACT_GATES, GARMENT_GATES, REAL_WEBGL_PENDING, MOBILE_GPU_PENDING, ARTISTIC_PENDING.

Reconciliação documental: consultar PR #303 head cb1ae5eb (regras de material privado e C1) sem rebase/merge não solicitado.
