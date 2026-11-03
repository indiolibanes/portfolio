# Shorekeeper B.5 — consolidação parcial

Base #203, 9d22da2151569d27027700f8a6a593b132a72c26. **FACIAL_CONSOLIDATION_PARTIAL / SMILE_VISUAL_QA_PENDING / VISUAL_QA_PENDING.**

A auditoria B.4 foi lida junto com a tabela de capacidades, receitas e folha de comparação privada. O rasterizador CPU mostra sorriso candidato com M_Smile_L/R e P_M_L/R_Add a 1,0; E_Smile tem artefatos de cílios no render simplificado. Isso não comprova o resultado WebGL nem atribui o defeito a geometria ou material. O sorriso V2 é manual e experimental, sem E_Smile e sem abertura de boca. My Star e expressões sem suporte demonstrado estão bloqueadas. O scheduler não executa expressões não aprovadas; seu movimento corporal original permanece intacto.

| Categoria | Capacidade | Evidência |
|---|---|---|
| VALIDATED | retorno numérico ao neutro | Teste sintético; não afirma aprovação artística. |
| EXPERIMENTAL | sorriso V2, olhar, surpresa, piscada bilateral | Evidência B.4 em CPU; sem confirmação WebGL na execução atual. Apenas sorriso V2 disponível em controles de laboratório. |
| UNSUPPORTED | My Star fiel, amor, esperança, preocupação, olá e meme | Não se demonstrou equivalência às cutscenes; My Star bloqueado por E_Smile. Wink e bochecha inflada requerem capacidade não demonstrada. |

Não foi possível obter capturas com material Three.js real nem comparar depthWrite, depthTest, renderOrder, side, alphaTest, transparência e oclusão. Nenhum material foi alterado. Validação WebGL com pesos E_Smile 0, .15, .30, 1 e comparação neutro/sorriso anterior/V2/retorno continuam pendentes.

Os três idles e o GLB foram preservados. Testes sintéticos: diretor original, composição F1.6, biblioteca de expressões, laboratório e 600 segundos de scheduler. Não há medição de FPS, GPU ou QA Android. O alvo 60 FPS, DPR 2, teto de pixels e preferência high-performance permanecem como no PR #203. Nenhum asset privado foi publicado.

## Etapa C

**SOURCE_ASSETS_BLOCKED**: foram encontrados apenas os seis PSA de Action01–03 do pacote de idles, sem os pares Attack01–04/Rib. A busca disponível não revelou o RAR original. Sem as fontes não é possível determinar ownership, converter, validar ou produzir quatro golpes. É necessário um pacote privado contendo PSK e os pares body/Rib dos ataques; não solicitar os 532 PSA. O contrato futuro deve reutilizar um único diretor/mixer e exigir evento de reprodução musical confirmada, nunca a mera abertura do player.
