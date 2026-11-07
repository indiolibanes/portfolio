# Uma câmera para atuação, combate e entrada manual

A cena pública usa PerspectiveCamera FOV 34°, OrbitControls com damping e pan desabilitado. A proposta da prévia pode habilitar pan dentro de um limite espacial; preservar o valor anterior ao sair. O loop atual chama controlsUpdate antes de step. Nunca chamar orbit.update duas vezes no mesmo frame. Consumir o alvo resolvido no frame anterior, com amortecimento por dt; para uma mudança estrutural de ordem, revalidar também a torre musical.

| Plano | Alvo e enquadramento proposto |
|---|---|
| Contemplação / preparação | Alvo do framing lunar; conservar azimute de entrada. Transição suave para altura do esterno. |
| Ataque / seguimento | União dos pés, cabeça e extremidade da arma/anel via bounds pré-calculados. Seguir o deslocamento do ator uma vez, com margem lateral. |
| Transformação | Três quartos de tronco e palma apenas quando a leitura do gesto for possível. Em movimento reduzido, manter plano estável. |
| Mecanismos / clímax | Ajustar distância pela união de bounds do ator e mecanismo. Se o efeito exceder o quadro, priorizar o corpo inteiro; não recuar até a personagem ficar ilegível. |
| Recuperação | Interpolar para o alvo/distância no início do plano se a automação ainda possuir a câmera. |

Resolver distância mínima pelos dois semicampos de visão e aspect atual; medir no viewport utilizável depois de descontar widget/controles. Verificar 16:9 e 390×640, pés e cabeça com margem proposta ≥5% em plano inteiro. Proibir shake e resets por marcador. Manter continuidade de posição, velocidade e target nas transições e nos resize. Registrar velocidade/ aceleração e inversões bruscas; limites finais dependem de revisão em movimento.

Em pointerdown, início de OrbitControls, roda, pinça ou pan, cessar escrita automática antes de aplicar o input. Conservar alvo e distância ao soltar, inclusive após fim do golpe. Retomar somente por comando explícito de recentralização/automático, interpolando da vista atual. Um registro de atores por id fornece disponibilidade, bounds e âncoras. Hsin participa; Shorekeeper só consta como pronta após o carregador existente confirmar; Phrolova e Sophia ficam indisponíveis até registro real. Não iniciar loaders para atores indisponíveis.
