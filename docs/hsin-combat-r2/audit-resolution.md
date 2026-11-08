# Resolução da auditoria posterior

A auditoria Astra foi solicitada depois da implementação, em modo somente leitura. Os achados estruturais foram aplicados na candidata.

| Achado | Correção e verificação |
|---|---|
| Restart perdia os ticks após liberar o corpo | needsAdvance inclui o pedido pendente. Teste do laboratório usa a condição de ticks do palco. |
| Stop não cancelava o restart pendente | Limpa a fila antes de iniciar a recuperação. Teste confirma que o ciclo não aumenta depois de Stop. |
| Recusa durante dança chamava o idle | acquire recusa a dança antes de qualquer writer do idle. Teste verifica que release não foi chamado. |
| Restart readquiria sem verificar contexto | Mesmo acquire para início e reinício, com referência de posição/quaternion. |
| drawRange recortava a espessura do toro | TorusGeometry parcial prealocada, ângulo explícito de 1,3π. |
| Expressão desaparecia na entrada da recuperação | Conserva a receita e aplica envelope decrescente. Teste verifica igualdade no primeiro instante e redução posterior. |
| Timeline revisada era sobrescrita pela ingestão | Candidatos automáticos têm outro arquivo. Teste sintético preserva timeline.csv. |
| Trilhas alocadas na R1 | Alocação condicionada à R2. |
| Métrica omitia a lattice | Soma o buffer decodificado de recuperação e remove strings base64 após decode. |
| Dupla escrita nas pernas durante recovery | Cadeia upper exclui canais da lattice. Só a lattice escreve lower. |

Verificação independente final: SHA do bake e manifesto coincidiram. Em 505 fases × 25 progressos de recuperação, o maior desvio foi de 0,3120 mm em DEF-Bip001Toe0R, para interrupção em 53,57% e recuperação em 83,33%. São articulações amostradas, não uma prova de colisão dos tecidos.

A avaliação de aparência, VFX finais, iluminação e desempenho de dispositivo permanece pendente.
