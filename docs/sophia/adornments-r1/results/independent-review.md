# Revisão independente e correções

A revisão inicial por Astra conferiu os hashes e o diff estrutural de forma independente: BIN, corpo, meshes Book/Pen, materiais, texturas, skins e cinco clipes preservados; só parenting/socket e relocação das estrelas mudaram. Nenhum runtime R3 foi alterado.

Foram encontrados e corrigidos: bounds incluindo vértices não indexados (agora separados dos bounds da superfície), status de archive match fixo (agora derivado do hash), offset de um frame do NLA nas capturas (agora medido pelos strips), close de página ocluído (novos dois detalhes props-only rotulados), Host irrestrito do servidor local (allowlist e teste HTTP), placeholder sobre o modelo (regra CSS hidden) e ausência de retomada após webglcontextrestored (handler adicionado).

Correções verificadas localmente por teste de hash estrangeiro, equivalência Three.js, HTTP, inspeção de código e novas capturas. A segunda revisão independente das correções não foi executada. Não se declara signoff independente final, aceitação artística, WebGL ou mobile.
