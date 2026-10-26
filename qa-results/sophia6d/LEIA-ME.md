# Sophia6D: certificação reprovada

As duas entradas foram auditadas. As cópias higienizadas passam no Khronos oficial com 0 erros e 0 avisos, sem filtros; mensagens informativas e hints permanecem. Isso não significa aprovação geométrica.

- Principal recebida: 16.413.188 bytes; SHA-256 bf71210efd66ca0f913bd0be1b930b6a035c4dc7d4fe2df9e11a3aa63935f427.
- Variante recebida: 16.699.328 bytes; SHA-256 0cddeb02527a07ad130b69f1c5b4b6f93ba3f4b9bdb78539c85bb930585c9908.
- 105 acessores da principal mudaram nos atributos esperados. Nenhum byte do BIN fora deles mudou; JSON igual após excluir limites dos acessores e proveniência em asset.extras. A variante adiciona seus recursos de cartões.
- 153 triângulos da primitiva231 estão contrários às normais. Normais unitárias, pesos válidos e cinco loops com erro0mm.
- Forro: deslocamento máximo14,375mm, costuras duplicadas com deslocamentos idênticos. Espessura não certificada; a diferença de distância entre vértices correspondentes chega a11,208mm.
- Repouso: forro/casaco1072 pares cruzando, forro/corpo761, cauda/corpo436, cauda/casaco320. Demais contagens por clipe estão nos JSON.
- Cauda nunca toca o chão nas398 amostras mais repouso; mínimoY20,344mm no Walk. Decorações: consulta local em repouso0,607–2,400mm, sem certificação global nem animada.
- Cartões rejeitados: renders reais com alpha0,4 e sheen1 mostram placas/manchas nas orelhas e bochechas. Testemunhos globais reais de distância da raiz à pele:1,074mm em rest e1,926mm em Point, acima0,5mm.

## Arquivos

Sophia_Fase6D_higienizada.glb e Sophia_Fase6D_cartoes_higienizada.glb são candidatos de revisão: não usar como final aprovado. Mudou apenas JOINTS_0 onde o peso é exatamente zero e limites min/max. A geometria é idêntica à entrada correspondente. Não houve correção de rig, escultura, retopologia ou deformação artística.

Renders de6C,6D e cartões usam three.js, mesma câmera/luzes, pose Write0, culling conforme glTF e sheen físico importado. Os mosaicos comparam6C/6D/variante. Um final geométrico corrigido ainda não existe.

## Reprodução

Python3 com NumPy/SciPy/Pillow; Node com versões fixadas em certification/package-lock.json. Rodar a partir da raiz extraída.

```sh
python patches6d/patch_hempaws.py /caminho/Sophia_Fase6C.glb certification/hem.glb
python patches6d/patch_tailspiral.py certification/hem.glb certification/rebuilt.glb
python tools/cleanup.py certification/rebuilt.glb certification/clean.glb
node certification/validate.cjs certification/clean.glb
python tools/structure.py /caminho/Sophia_Fase6C.glb /caminho/Sophia_Fase6D.glb /caminho/Sophia_Fase6D_cartoes_opcional.glb
python tools/collisions.py /caminho/Sophia_Fase6D.glb certification/Eyes399.json eyes
python tools/collisions.py /caminho/Sophia_Fase6D.glb certification/Hem399.json hem
python tools/collisions.py /caminho/Sophia_Fase6D.glb certification/Tail399.json tail
```

O GLB6C e as entradas originais devem ser fornecidos separadamente nos caminhos indicados; não foram duplicados neste ZIP. Os scripts de olhos externos não foram aplicados. A reconstrução bruta difere em dois joints sem peso, e converge byte a byte depois da higiene (SHA5e08918f...). A reaplicação de hem, tail e cleanup é byte-idêntica. O script dos cartões não é reprodutível com o ZIP recebido: falta fluff_lib.py e sua versão de fluff_glbio.py.

## Retopologia proposta, não aplicada

Reconstruir a cava do ombro unindo manga e tronco por anéis sem sobreposição; remover a tampa interna escondida da manga e transferir UVs/pesos por correspondência de superfície. Preservar os motivos lunares e testar todas as poses. Depende da autorização exigida para retopologia do casaco.

## Próximas correções

1. Remodelar os fios da constelação que dobraram, com mais segmentos e ancoragem à superfície.
2. Corrigir o forro mantendo uma faixa com distância normal controlada do casaco e cobrindo as junções.
3. Converter a piscada em morph que acompanha a superfície real do globo; depois ajustar a abertura para36–40mm.
4. Esculpir três dedos e almofadas em candidato separado; copiar os pesos existentes e auditar contra os acessórios.
5. Somente depois repetir todos os pares completos, folgas e vídeos de animação.

Consulte a lista integral de pendências em Relatorio.json. Não há certificado de zero colisões.

Pacote completo (GLBs de revisão, JSON detalhado e renders):
https://chatgpt.com/library?file_id=libfile_d88d23c1ef60819184b0493a5652dd2b&account_id=personal

A branch foi criada a partir de main25f4277. A linhagem do modelo é definida pelo SHA-256 da6C auditada; não se afirma descendência git de c34aae2. Os GLBs reprovados estão no pacote de evidências e não substituem arquivos da produção.
