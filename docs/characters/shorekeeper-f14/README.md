# Shorekeeper F1.4 — Visual Fidelity & Study Presentation

**Status:** implementação F1.4 (Sonnet) aplicada neste PR draft — ver `f14-implementation-report.md` (causa medida da borboleta, perfis de cor, estudo longo, custos e limites) e `reference-recognition.md` (P3). Evidência visual privada entregue por canal privado; aceitação canônica: `CANONICAL_PENDING`, `G7_NO_GO`. O handoff original abaixo é preservado como contrato.
**Base imutável de comparação:** PR #285, head `936bf64ff1728c000a257eaf14ff6215a016dbd5`, empilhado sobre #284 (F3), #283 (F2), #282 (F1).
**Objetivo:** resolver oclusão da borboleta, recuperar variação azul/violeta/dourado em um *modo de estudo* separado e criar apresentação expositiva 60–90 s sem retimar as animações originais.

## Avaliação anterior: o que é fato e o que é hipótese

- A pequena borboleta F2 já foi aprovada artisticamente. Preservar silhueta, venação, movimento, transparência e trajetória tanto quanto possível.
- Em `combat-vfx-liberation.mjs`, o gatilho tem `depthTest:true`, `depthWrite:false`, `renderOrder:14`, máscara `faceMask()` e raio relativo de cabeça (`uFaceR=0.14*h`). A asa sumindo pode envolver o depth buffer, a máscara de rosto ou ambos. **Não escolher a causa sem testes A/B renderizados.**
- `liberationColorScore(...,'fidelity')` zera as contribuições violeta/dourado; o G11.3 artístico guarda as cores. Isso é uma opção editorial, não um impedimento técnico. Nunca inferir estados Outer/Inner/Supernal das cores.
- O corpo e a sequência principal F3 ainda reutilizam sete clipes candidatos da G11.3. O catálogo de quatro Basics e Unbound/Illation é para investigação de fontes, não uma biblioteca canônica aprovada.
- O estudo longo não deve alongar timing das curvas PSA nem inventar Inner/Supernal/Discernment. Pausas e holds pertencem a `STUDY_PRESENTATION`, com rotulagem clara de estado expositivo.
- `shorekeeper_prints.zip` esteve indisponível no workspace do F3. Nesta etapa, dez capturas já foram fornecidas nesta conversa, mas **não estão incorporadas ao repositório**. O Sonnet deve recebê-las por canal privado e verificar bytes; caso contrário, `SOURCE_UNAVAILABLE`.

## Escopo

P0: comparar fontes/referências com distinção entre observação, inferência e prova.
P1: teste A/B da asa da borboleta com cabeça/cabelo e câmera.
P2: estudo cromático opcional azul / violeta / dourado sem modificar FIDELIDADE de referência e ARTÍSTICO G11.3.
P3: modo expositivo longo, 60–90 s configurável, campo 15–25 s em hold de estudo explicitamente não canônico.
P4: três MP4s privados + inspeção skinnada real + regressões.

### Entrega posterior do Sonnet
Continuar nesta mesma branch e PR draft F1.4, em vez de abrir um PR para cada microcorreção. Respeitar a base #285 e NÃO executar merge. Implementar somente depois de confirmar as fontes reais. Prioridade visual: borboleta > cromatismo > apresentação longa. Se faltar GLB/modelo, entregar diagnóstico e status bloqueado, não simular aceitação visual.

**Documentos deste PR:**
- `f14-implementation-report.md` — BEFORE/AFTER, causa confirmada, perfis de cor, duração real do estudo, recursos, veredictos por componente.
- `reference-recognition.md` — reconhecimento visual P3 (OBSERVED / INFERRED / VERIFIED_SOURCE / MOTION_MATCHED, `SOURCE_UNAVAILABLE`).

**Documentos do handoff original:**
- `reference-matrix.md` — comparação com as dez capturas e suas incertezas.
- `qa-contract.md` — testes e critérios de aceitação.
- `sonnet-prompt.md` — instruções operativas prontas para colar no Sonnet.

**Privacidade:** nunca commitar ZIPs, JPEGs privados, vídeos, clipes, GLB ou URLs assinadas; apenas descrição textual sanitizada no PR. A evidência F1.4 deve seguir canal privado autorizado.
