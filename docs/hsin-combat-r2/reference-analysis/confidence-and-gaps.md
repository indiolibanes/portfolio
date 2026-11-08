# Confiança, medição e lacunas

O ZIP foi recuperado e os 16 arquivos foram lidos. O manifesto preserva nome original, SHA-256, duração do arquivo, codec, resolução, frame rates declarados, timebase, áudio e heurística de VFR. Os originais permanecem fora do repositório.

A ferramenta amostra imagens a 2 Hz, calcula diferenças RGB, fração de pixels alterados, centroide do movimento aparente, regiões luminosas/saturadas e quase duplicatas. Esses sinais localizam candidatos a transições, sustentação e efeitos. Não recuperam bones nem separam automaticamente câmera e corpo. O limiar de corte marca flashes e movimentos rápidos como candidatos. O showcase gerou muitas dessas marcações; elas não foram promovidas a cortes confirmados. A timeline revisada conserva a classificação visual e as incertezas.

O OCR amostra legendas editoriais a 1 Hz no canto inferior. A margem mínima dos limites é ±1 s, podendo ser maior quando o texto entra ou sai da tela. A precisão temporal do arquivo é preservada no metadado; o intervalo semântico de uma habilidade pode conter vários gestos. As pranchas usam até 24 amostras, com grid e margem temporal no manifesto.

As paletas são quantizadas em bins sRGB, extraídas de uma região central com limiar de brilho e saturação. Elas incluem partes de roupa e cenário. Janelas luminosas são candidatos a VFX, sem recuperação do shader original. Bloom, exposição e compressão alteram cores/área. A R2 usa carmim/marfim para os arcos e âmbar/dourado para emissão como proposta artística.

GIFs não comprovam timing de jogo. Não há prova de velocidade original, quadros omitidos ou pausa entre loops sem um original contínuo equivalente. Os dois closes dourados parecem sobrepostos, mas têm hashes e durações diferentes; permanecem fontes distintas. A personagem de cabelo escuro em wuthering-wave-hsin.gif não foi confirmada como Hsin e foi excluída do mapeamento facial.

## Lacunas que realmente afetam as próximas ações

| Lacuna | Impacto | Material que resolveria |
|---|---|---|
| Timing de cada golpe isolado e Heavy | Não permite promover a duração/ordem autoral ao status de animação original | Uma gravação contínua em velocidade normal, com input ou rótulo legível, do início ao repouso. O showcase fornecido já basta para localizar a ação; nenhum novo pacote genérico é necessário. |
| Representação da raposa e Forma Iluminante | Impede reconstrução geométrica fiel da transformação | Asset autorizado e adequado, ou aprovação de uma transição simbólica explicitamente autoral. |
| Expressões com boca aberta, lágrimas e de personagem incerta | O atlas atual não contém todos os deformadores/efeitos observados | Identificação da cena/personagem e decisão artística sobre quais detalhes são essenciais. |
| Validação WebGL e Samsung | Cor, transparência, VFX, enquadramento em movimento e custo real continuam abertos | Executar o preview autorizado no navegador e no aparelho. Os testes Node e o vídeo CPU não satisfazem esses gates. |

A pesquisa oficial confirma o papel da Hsin em 3.7, mas não fornece clipes de rig nesta execução. [Notas oficiais](https://wutheringwaves.kurogames.com/en/main/news/detail/5571)
