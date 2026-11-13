# CLAUDE SONNET — SOPHIA R1.C.1 · Live Source First

**Modelo:** Claude Sonnet, esforço alto; usar navegador Cloud/WebView autorizado do Work se disponível.
**Repo:** `indiolibanes/portfolio`.
**PR:** #305, continuar na branch `planning/sophia-adornments-r1c-identity-contact-20261113`, draft, sem merge.
**Estado do último código auditado antes deste handoff:** implementação R1.C `b195340dd5e9bbd007b90cd321dce0f86bbbc966`. O PR pode ter avançado com documentação; confira HEAD na abertura.
**Prioridade absoluta:** não desperdiçar tokens e tempo com a Sophia 6H antiga antes de verificar o último asset C1.

## Autorização específica do proprietário
O proprietário AUTORIZA o uso das fontes necessárias para esta tarefa, mediante as conexões e aprovações efetivamente disponíveis no seu ambiente:
- Acesso **somente de leitura** aos arquivos Sophia pertinentes em R2, com inventário de versões, data, hashes, download do GLB e materiais anexos;
- Acesso interativo pelo navegador WebView/Cloud Browser às páginas e previews Cloudflare Access de Sophia, com autenticação feita pelo proprietário se solicitada;
- Acesso aos GLBs/BLENDs, master 2D C1, ortografias, imagens, GIF/MP4s e relatórios privados disponíveis;
- Uso local de Blender, Python, Three.js e ferramentas de inspeção WebGL para comparar o modelo realmente carregado.

**Isso autoriza a atividade, mas não concede tecnicamente credenciais ou libera políticas de Access.** Se faltar integração ou sessão, pedir a conexão/autorização interativa pelo mecanismo seguro da plataforma. Não solicitar ou divulgar tokens, cookies, passwords ou signed URLs em mensagens, commits, PRs ou logs. Não acessar fontes de outras personagens, não mudar buckets/políticas e não criar endpoints públicos para inspecionar o R2.

## 0 — STOP GATE: confira versão real antes de implementar
Leia integralmente `docs/sophia/adornments-r1c/source-access-preflight.md` e os resultados R1.C do PR #305.

Na PRIMEIRA sessão, antes de abrir Blender para editar qualquer vértice:
1. Revise `main`, #303, #304, #305, commits e previews ativos, para evitar branch antiga.
2. Liste as versões autorizadas dos assets Sophia no R2 e disponíveis em documentos/arquivos privados; confira datas, SHA256 real dos bytes, rig, clips, morphs, material, corpo, identidade, função e proveniência.
3. Abra pelo WebView a página autoral e o `/modo-imersivo/` reais, incluindo o que estiver protegido pelo Cloudflare Access. Use a janela de login da plataforma se for exibida.
4. Identifique por requests e hash qual GLB a página carrega; não confundir cache/previews antigos com a versão atual.
5. Compare a **C1 autoral antropomórfica** com os **doador 6H**, **7B desrigada** e **astronauta R3 com foguete**. Nenhum desses papéis é intercambiável. O endpoint `/api/sophia/rocket` é somente do modelo astronauta aprovado, não expõe outras versões privadas.
6. Responda em uma tabela curta: `ASSET / VERSÃO / SHA / DATA / PAPEL / URL OU ROTA TESTADA (sem endereço privado) / STATUS DE IDENTIDADE`. Salve detalhes sensíveis apenas no material privado autorizado.
7. Se faltar acesso, devolva `ACCESS_BLOCKED`; se encontrar somente 6H, `AUTHORITATIVE_C1_MODEL_UNVERIFIED`. NÃO continue modelando o corpo errado.

## 1 — Só após source lock
- Se C1 3D aprovada/adequada for encontrada: avalie no máximo a transferência NÃO destrutiva de caderno, pena e jaleco 6H para o corpo C1, com matriz de compatibilidade de rig, escalas, UVs, skinning e clips. Não assuma equivalência entre os 101 joints 6H e o esqueleto do novo modelo.
- Se for apenas candidata ainda sem aprovação C1: apresente comparativos e gate de identidade ao proprietário, sem copiar/adaptar a roupa indiscriminadamente.
- Se só houver 6H antiga: limite-se ao diagnóstico de doador e a melhorias de harness QA estritamente necessárias; NÃO gaste ciclos corrigindo anatomia/jaleco da mascote como modelo final.

## 2 — Se fonte e identidade permitirem, R1.C.1 propriamente dita
- Preservar o reparo de gola R1.C (queixo/gola 12→0 em 61 poses) e os cinco clipes originais.
- Investigar separadamente os defeitos de Write: empunhadura (mitene), punho-manga, punho-caderno, pena-página, contatos de braço e movimento.
- Retestar a mesma matriz de colisões antes/depois com BVH e GLB real skinnado. Evitar os offsets globais de caderno e correções de ombro rejeitados na R1.C.
- Não reconstruir personagem, gerar jaleco no Tripo, mexer na astronauta R3 (47 clipes), converter /404/curiosidades ou alterar páginas públicas.
- Dar preferência a demonstrar a limitação geométrica real da 6H em vez de simular mãos humanas ou declarar aprovação via 0 triângulos de colisão.

## 3 — Evidência e entrega
- Fonte verificada com hash e data + captura real do WebView quando possível.
- Screenshots e MP4 privados de Write, Wave e Walk usando o modelo efetivamente selecionado; 3s/24+FPS se houver ambiente de renderização.
- Diferenças de malha, pesos e transforms com checksums e relatório de preservação.
- Comandos `npm run check:sophia-adornments`, `npm run check:sophia-adornments-r1c`, `npm run check:sophia`, `npm run check`, `npm run build`; WebGL/Samsung como gates separados.
- Atualizar SOMENTE PR #305 e documentos públicos sanitizados. Dados sensíveis permanecem em entregas privadas. Sem merge nem R1.D automático.

**Definição de pronto da primeira etapa:** `CURRENT_C1_SOURCE_VERIFIED`, `ACCESS_BLOCKED` ou `AUTHORITATIVE_C1_MODEL_UNVERIFIED` com evidências. Nenhum trabalho substancial de modelagem deve ocorrer sem a primeira condição ou uma aprovação explícita do proprietário para usar a 6H apenas como doadora.