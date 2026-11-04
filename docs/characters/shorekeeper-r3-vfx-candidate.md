# C R3 — ambiente e perfil VFX candidatos

Base técnica: PR #230 @ a36c8513efcaea511da5fc1bcd96ccda411b0cdc. Este draft contém os módulos de ambiente/arte e testes; a interface unificada e o ownership de combate estão no draft de integração. Não duplica o combo de #229/#230.

R3 estende o diretor R2, compartilhando buffers, relógio e contrato. Adiciona céu, horizonte, solo em perspectiva e ruínas procedurais persistentes em OFF. Reenquadra canopy; Core usa cristal/cage coloridos e flare menor com depthTest. Borboletas são InstancedMesh com batimento bilateral e atlas autoral; o perfil R2 recebe limites corrigidos comuns. Desktop 18 borboletas/40 Core/320 estrelas+motes; Android 8/12/110. Até 13 draw calls estimadas no perfil completo, GPU não medida.

Narrativa manual de 18 s com câmera opcional e restauração dos OrbitControls; nenhum marker de combate presumido. Outer/Inner/Supernal permanecem STAGE_REFERENCE_UNVERIFIED.

Verificação: lifecycle, budget, reduced motion, pausa, ownership do cenário e devolução de câmera em Node. 600 s simulados em CPU não equivalem a 600 s em navegador. WebGL2 não está disponível no navegador de QA. Não há render SwiftShader R3, vídeo R3, GPU/Samsung ou aprovação artística. **VISUAL_QA_PENDING**. C não está concluída: monumentalidade/visibilidade do Stellarealm precisa ser demonstrada com personagem+campo+céu no mesmo plano.
