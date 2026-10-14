<p align="center">
  <img src="public/icons/icon-192.png" alt="Europa Manutenção" width="110" />
</p>

<h1 align="center">Europa Manutenção</h1>

<p align="center">
  Sistema web de gestão de manutenções prediais, criado para a administração do <strong>Condomínio Europa</strong> (São Paulo).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TanStack-Start_·_Router_·_Query-FF4154?style=flat-square" alt="TanStack" />
  <img src="https://img.shields.io/badge/Supabase-Postgres_·_Auth_·_RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-shadcn%2Fui-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind e shadcn/ui" />
</p>

---

## O problema

Na administração do condomínio, as manutenções eram controladas de forma descentralizada: chamados em mensagens, prazos em planilhas e pouca visibilidade de quem pediu o quê. O **Europa Manutenção** centraliza esse fluxo em um só lugar, com controle de acesso por função e histórico de tudo o que acontece.

O sistema foi construído a partir da rotina real de trabalho na administração do condomínio e é usado como ferramenta interna.

## Funcionalidades

| Módulo | O que faz |
| --- | --- |
| **Dashboard** | Indicadores por status (pendente, em andamento, aguardando aprovação, concluída, atrasada, emergencial), alertas, atividades recentes e filtros por torre e período |
| **Manutenções** | Cadastro com chamado, ordem de serviço, local, torre, categoria, prioridade, prazo, prestador, anexos e histórico; impressão de OS |
| **Fluxo de aprovação** | Síndico e zelador solicitam conclusão ou exclusão; a administração aprova ou recusa |
| **Calendário** | Visão mensal, semanal e em lista das manutenções (FullCalendar) |
| **Mapa do condomínio** | Navegação por torre e áreas comuns, com as manutenções de cada local |
| **Prestadores** | Cadastro, histórico de serviços e relatórios por prestador |
| **Ativos** | Equipamentos do condomínio vinculados a local e torre, com relatórios |
| **Relatórios** | Indicadores consolidados e exportação para Excel |
| **Usuários e logs** | Gestão de perfis e registro de acessos |

**Rastreabilidade:** cada manutenção grava automaticamente quem a criou ("Gerado por Fulano · Zelador"), e um trigger no banco impede que esse campo seja alterado depois.

## Controle de acesso

Login em duas etapas (e-mail e senha, depois PIN). Após 5 PINs incorretos, o acesso fica bloqueado por 15 minutos.

| Ação | Administração | Síndico | Zelador | Subsíndico | Conselheiro |
| --- | :---: | :---: | :---: | :---: | :---: |
| Visualizar todas as manutenções | ✅ | ✅ | ✅ | — | ✅ |
| Criar e editar manutenção | ✅ | ✅ | ✅ | — | — |
| Concluir ou excluir diretamente | ✅ | — | — | — | — |
| Solicitar conclusão ou exclusão | — | ✅ | ✅ | — | — |
| Aprovar solicitações | ✅ | — | — | — | — |

As permissões são aplicadas no banco de dados com **Row Level Security** do PostgreSQL, não só na interface: mesmo uma chamada direta à API respeita o perfil e o escopo de torre do usuário.

## Stack e arquitetura

- **Front-end:** React 19, TypeScript, TanStack Start / Router / Query, Tailwind CSS, shadcn/ui, Recharts, FullCalendar
- **Back-end:** Supabase (PostgreSQL, Auth, Storage), com políticas RLS, triggers, views e funções RPC
- **Banco:** 32 migrations versionadas em [`supabase/migrations`](supabase/migrations)

```
src/
├── routes/          # páginas (file-based routing do TanStack Router)
│   └── _authenticated/   # área logada: dashboard, manutenções, ativos, prestadores…
├── components/      # componentes de interface (shadcn/ui + componentes próprios)
├── hooks/           # hooks de dados e de autorização por perfil
├── integrations/    # cliente Supabase e tipos gerados
└── lib/             # utilitários
supabase/
└── migrations/      # schema, políticas RLS, triggers e funções
```

## Rodando localmente

Requisitos: Node.js 20+ e um projeto Supabase.

```bash
git clone https://github.com/Victin7/europa-manutencao.git
cd europa-manutencao
npm install
cp .env.example .env   # preencha com as chaves do seu projeto Supabase
npm run dev
```

Para criar o banco, aplique as migrations da pasta `supabase/migrations` no seu projeto (por exemplo, com `supabase db push`).

| Script | Descrição |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | verificação com ESLint |

## Autor

**Victor Sousa dos Anjos** · estudante de Análise e Desenvolvimento de Sistemas (UNICID)
[LinkedIn](https://www.linkedin.com/in/victor-s-anjos) · [GitHub](https://github.com/Victin7)
