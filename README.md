# NimbusCRM

Um CRM simples, moderno e funcional — sem back-end, sem dependências, sem processo de build. Basta abrir `index.html` no navegador.

## Funcionalidades

- **Dashboard** — visão geral com número de clientes, negócios ativos, valor total em pipeline, negócios ganhos, distribuição do pipeline por etapa, atividade recente e próximas tarefas.
- **Clientes** — cadastro completo (nome, empresa, e-mail, telefone, status, origem, notas), busca em tempo real, filtro por status (Lead / Ativo / Inativo) e edição/exclusão via modal.
- **Negócios** — quadro Kanban com as etapas Lead → Contato → Proposta → Negociação → Ganho / Perdido. Arraste os cartões entre colunas para atualizar a etapa, ou edite pelo modal. Cada coluna mostra o total em R$.
- **Tarefas** — lista de tarefas com data e cliente vinculado, marcação de concluída/pendente, destaque para tarefas atrasadas.
- **Tema claro/escuro** com preferência salva.
- **Totalmente responsivo** (menu lateral retrátil no mobile).

## Como usar

Abra `index.html` diretamente no navegador, ou sirva a pasta com qualquer servidor estático:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## Dados

Todos os dados (clientes, negócios e tarefas) são salvos no `localStorage` do navegador — não há servidor nem banco de dados. Na primeira execução, o app carrega alguns dados de exemplo para facilitar a exploração; eles podem ser editados ou excluídos livremente.

## Estrutura

```
index.html       # marcação e estrutura das telas
css/style.css     # design system (cores, tema claro/escuro, componentes)
js/app.js         # estado, persistência e toda a lógica da aplicação
```

## Stack

HTML, CSS e JavaScript puros (vanilla) — nenhuma biblioteca ou framework externo.
