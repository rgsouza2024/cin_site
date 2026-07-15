# Planejamento — Plataforma de Gestão do CIn (Estágio 2)

Documento separado de propósito do [CIN_PLANEJAMENTO.md](CIN_PLANEJAMENTO.md), que cobre só a parte pública/estática do `cin_site`. Este arquivo cobre o estágio 2: uma plataforma autenticada, com RBAC, para uso interno dos participantes do CIn. **Não é uma extensão do site público — é outro sistema, com outro modelo de ameaça, que só compartilha a identidade visual.**

## Por que é um sistema separado, não uma seção do `cin_site`

O `cin_site` (site público) é estático por decisão de arquitetura herdada do CEJ: sem backend, sem banco, sem autenticação — é isso que torna o modelo de ameaça dele trivial (`SEGURANCA.md`: "as classes de SQLi, CSRF e sequestro de sessão não se aplicam"). Uma plataforma com login e RBAC sobre workflow institucional reintroduz todas essas classes de risco. Misturar os dois no mesmo repositório/hospedagem criaria uma superfície de ataque desnecessária para a parte pública e uma dependência de infraestrutura estática inadequada para a parte autenticada. **Recomendação: repositório novo, hospedagem de aplicação real (não host estático), compartilhando só os tokens de design (Seção 5 do `CIN_PLANEJAMENTO.md`).**

## Decisão de autenticação (herdada, não negociável)

Federação OIDC com IdP institucional (SSO CJF/PDPJ/gov.br) — jamais base própria de senhas. Essa decisão já estava registrada nas discussões de arquitetura do CEJ e se aplica aqui com mais força ainda, por lidar com contas de magistrados e servidores.

## Escopo confirmado (15/07/2026)

Núcleo funcional mínimo, na ordem em que aparece no plano de ação do CIn:
1. **Workflow de Notas Técnicas** — rascunho (Grupo Operacional) → revisão → aprovação (Grupo Decisório) → publicação no site público.
2. **Gestão de relatórios dos CLIs** — submissão de dados/relatórios dos Centros Locais para o CIn Nacional.
3. **Diretório de membros e papéis** — cadastro de quem é Grupo Decisório, Grupo Operacional, CLI local, com papéis/permissões. Pré-requisito técnico dos outros dois itens.

## Achado: já existe um "Sistema CIn" em produção

Ao investigar o portal atual (15/07/2026), encontrei dois links autenticados dentro do mesmo sistema, hospedados em `www2.cjf.jus.br/centro_inteligencia/`:

- **`/tema-proposto/` ("Propor Temas")**: formulário maduro (build #112 no rodapé, não é protótipo) com CPF, nome, categoria de usuário (magistrado/servidor/executivo/estudante/advogado), cargo, instituição (taxonomia extensa de órgãos da Justiça), contato, descrição do tema, dispositivo legal, justificativa e anexo PDF.
- **`/relatorio-temas` ("Sistema CIn")**: tela de login usuário/senha simples — **sem SSO, gov.br ou CAS**. Descrito no menu do portal como "exclusivo Grupo Operacional".

Isso é evidência concreta de que parte do escopo desejado (intake de propostas com categorização por papel) **já está em produção**, só que com autenticação fora do padrão institucional atual. A taxonomia de categoria de usuário desse formulário é um ponto de partida real para o "diretório de membros e papéis" (item 3 do escopo) — não precisa ser reinventada do zero.

## Bloqueios (não são meus para resolver)

1. **SSO/IdP institucional**: existe um provedor OIDC em produção que uma aplicação nova possa integrar, ou isso precisa ser negociado com a STI primeiro? Resposta registrada: "não sei, precisa verificar com a STI". O fato de o Sistema CIn atual usar login próprio é sinal (não prova) de que a resposta pode ser "ainda não" — o que tornaria isso um pré-requisito de governança antes de qualquer linha de código, na mesma ordem já usada para o CEJ (governança/hospedagem institucional antes de área autenticada).
2. **Relação com o Sistema CIn existente**: substituir, complementar ou ignorar? Resposta registrada: "não sei o que esse sistema faz" — só quem usa por dentro (Grupo Operacional) pode responder. Construir uma plataforma nova sem essa resposta arrisca duplicar ferramenta que já existe e já foi adotada.

## Próximo passo

Não é técnico. É levantar, com a equipe do CIn e a STI:
- O que o Sistema CIn atual (`relatorio-temas`) faz hoje, na prática, e se está em uso ativo.
- Se há um IdP OIDC institucional disponível para integração.

Só depois disso faz sentido voltar a este documento para desenhar stack, modelo de dados e fluxo de aprovação.
