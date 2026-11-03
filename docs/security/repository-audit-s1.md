# Repository Hygiene & Security Audit — S1

**Data:** 2026-11-03. **Base congelada:** `95e78e82c29bac57707469440f6806979fcdc94f`. **Estado global: PARTIAL.**

## Método e abrangência

Checkout completo e inspeção dos 527 arquivos versionados da base (68.405.183 bytes lógicos). Foram recuperadas as 50 branches remotas e as 224 referências de head de PRs, incluindo PRs fechados; o grafo acessível contém 1.353 commits. As 224 descrições/títulos de PR foram consultadas. A matriz registra ancestralidade, commits exclusivos, arquivos presentes apenas no head, PRs e bases empilhadas. A varredura complementar examinou 2.128 blobs de texto (37.965.817 bytes), limitados a 2 MB por blob; 2.098 blobs grandes ou binários ficaram fora dessa busca textual. Não houve OCR de imagens, inspeção integral de binários, comentários de PR ou todos os logs externos.

Gitleaks v8.30.1, configuração padrão e redaction integral: `gitleaks git --redact=100 --log-opts='--all'`, 1.113 commits não-merge/diffs reportados pela ferramenta, ~14,91 MB de linhas examinadas; zero achados. Títulos e corpos dos 224 PRs foram examinados por `gitleaks stdin`, ~339 KB, zero achados. Ausência de achados não comprova ausência de segredos fora da cobertura. Relatórios brutos não foram adicionados ao Git.

## Achados

| ID | Risco | Achado | Medida / situação |
|---|---|---|---|
| S1-01 | Médio | Dois workflows de QA tinham escrita e publicação por force-push de branches de evidência | Retirados os passos de escrita; artifacts preservados, retenção explícita de 30 dias |
| S1-02 | Médio | Ingestão externa podia commitar/pushar na branch de execução e usava instalação não reproduzível | Artifacts para revisão por PR, token read-only e `npm ci` |
| S1-03 | Baixo | Input manual de cenário interpolado diretamente num comando shell | Valor por variável de ambiente, lista permitida e argumento entre aspas; não foi demonstrado comprometimento |
| S1-04 | Médio | Reconstrução local conservava arquivo excluído em `dist/`; houve ainda output temporário parcial | Limpeza limitada a `dist/` e gate de saída; testes de preservação de fonte/symlinks e rejeição de arquivos privados/temporários |
| S1-05 | Baixo | Proposta de manifesto substituída e documentação repetiam detalhes administrativos desnecessários | Proposta removida e documentação reduzida a contrato arquitetural; bindings ativos preservados |
| S1-06 | Baixo | Sprite público inválido, explicitamente excluído da rotação | Removido após inspeção Sharp e busca de consumidores; quatro sprites válidos preservados |
| S1-07 | Médio | API informou `protected:false` nas 50 branches e coleção de rulesets vazia | Sem alteração administrativa; recomendar proteção de main e revisão dos checks exigidos |

As correções propostas só entram em produção após revisão/merge/deploy. Não houve merge nem alteração de bindings, objetos, policies ou credenciais remotas.

## Resultado e limites

Cinco PRs obsoletos foram encerrados com justificativas: #179, #180, #181, #142 e #207. Nenhuma branch foi excluída. A tentativa de exclusão de uma branch incorporada foi bloqueada pela revisão automática por insuficiência de prova de abandono e ausência de dependências; não houve tentativa por outro caminho. As branches com commits exclusivos, bases ativas e evidências autorais continuam preservadas.

As superfícies Cloudflare não puderam ser verificadas: requests HEAD ao site retornaram 403 em todas as sete rotas sondadas, inclusive a home. Isso não demonstra que os endpoints da aplicação tenham validado autenticação. GitHub deployments vazio não significa ausência de deploys Cloudflare. Não se afirma integridade do deploy, de previews ou do R2.

Modelos, rigs, morphs, materiais, animações, personagens e runtime 3D não foram alterados. O build final manteve idênticos os hashes de todos os recursos previamente emitidos exceto a exclusão do sprite e comentários em quatro HTMLs. A análise específica está nos demais relatórios.

## Indicadores observados

| Indicador | Antes | Depois da correção / snapshot |
|---|---:|---:|
| Arquivos versionados | 527 | 533 |
| Bytes lógicos da árvore atual | 68.405.183 | 68488094 |
| Arquivos obsoletos comprovados | 2 | 2 removidos |
| Grupos de duplicatas exatas | 1 | 1 preservado por dois consumidores |
| Branches remotas | 50 | 51 (nova branch S1; 0 excluídas) |
| PRs obsoletos abertos confirmados | 5 | 0 (5 encerrados) |
| PRs abertos totais | 23 | 18 antes do draft S1 |
| Credenciais detectadas na cobertura do scanner | 0 | 0 |
| Grupo de metadados operacionais dispensáveis | 1 | sanitizado na proposta |
| Exposições históricas comprovadas de credenciais | 0 detectadas | nenhum saneamento extraordinário executado |
| Build local | PASS | PASS |
| Deploy / infraestrutura remota | NOT_VERIFIED | NOT_VERIFIED |

O aumento do espaço lógico da árvore decorre principalmente dos seis relatórios, incluindo inventário de 527 arquivos e matriz de 50 branches, mais dois arquivos de código/teste. Não é uma redução do tamanho do pack Git; a exclusão de 2 arquivos não remove seus blobs históricos. O output estático limpo, separadamente, reduziu 6.186 bytes em disco. O PR S1 acrescenta um PR aberto ao snapshot; alterações concorrentes exigem nova consulta.
