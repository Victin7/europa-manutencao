# 🏢 Europa Manutenção

<p align="center">
  <img src="public/logo.png" alt="Europa Manutenção" width="150" />
</p>

<h3 align="center">
  Sistema de Gestão de Manutenções do Condomínio Europa
</h3>

<p align="center">
  Plataforma web para controle, acompanhamento e gestão de manutenções prediais.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-UI-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/shadcn%2Fui-Components-000000?style=flat-square" />
</p>

---

## 📋 Sobre o projeto

O **Europa Manutenção** é uma plataforma web desenvolvida para centralizar, organizar e acompanhar a gestão de manutenções do **Condomínio Europa**.

A solução foi criada para substituir controles descentralizados e facilitar o acompanhamento de chamados, serviços, prazos, responsáveis, prestadores, ativos e histórico operacional.

O sistema conta com controle de acesso por função, permitindo que cada usuário visualize e execute somente as ações compatíveis com seu perfil.

Além do gerenciamento de manutenções, a plataforma possui dashboard, calendário, relatórios, gerenciamento de prestadores e ativos, solicitações administrativas, autenticação com PIN, logs de acesso e recursos de impressão.

---

## 🎯 Objetivos

O projeto tem como principais objetivos:

- Centralizar o gerenciamento de manutenções.
- Organizar chamados e ordens de serviço.
- Acompanhar o andamento dos serviços.
- Controlar prazos.
- Identificar manutenções atrasadas.
- Identificar quem criou cada manutenção.
- Gerenciar prestadores de serviço.
- Gerenciar ativos do condomínio.
- Organizar manutenções por torre e áreas gerais.
- Controlar permissões de usuários.
- Registrar solicitações de conclusão e exclusão.
- Facilitar a análise através de dashboards e relatórios.
- Disponibilizar calendário de manutenções.
- Manter histórico e rastreabilidade das operações.
- Aumentar a segurança dos dados através de RLS.

---

# ✨ Funcionalidades

## 📊 Dashboard

O dashboard apresenta uma visão geral da operação de manutenção.

### Indicadores

- Total de manutenções
- Pendentes
- Em andamento
- Aguardando aprovação
- Concluídas
- Emergenciais
- Prazo vencido
- Atrasadas

### Recursos

- Alertas operacionais
- Atividades recentes
- Gráfico de manutenções por status
- Filtro por torre
- Filtro por período
- Ações rápidas
- Indicadores visuais
- Atualização dos dados através do backend

### Períodos disponíveis

- Hoje
- Últimos 7 dias
- Este mês
- Mês anterior
- Data inicial personalizada
- Data final personalizada

---

# 🔧 Gestão de Manutenções

O módulo de manutenções permite controlar o ciclo operacional dos serviços realizados no condomínio.

Cada manutenção pode possuir informações como:

- Número do chamado
- Ordem de serviço
- Descrição
- Local
- Torre
- Categoria
- Status
- Prioridade
- Data
- Prazo
- Prestador
- Equipe
- Responsáveis
- Observações
- Anexos
- Histórico
- Usuário responsável pela criação

---

## 🔄 Status das manutenções

### 🕐 Pendente

Manutenção registrada e aguardando início.

### 🔵 Em andamento

Serviço atualmente em execução.

### 🟠 Aguardando aprovação

Manutenção aguardando aprovação administrativa.

### 🟢 Concluída

Serviço finalizado.

### 🔴 Atrasada

Manutenção que ultrapassou o prazo estabelecido.

### 🚨 Emergencial

Manutenção identificada como de alta prioridade.

---

# 👤 Rastreabilidade — "Gerado por"

Cada manutenção registra automaticamente o usuário responsável por sua criação.

O sistema utiliza o campo:

```text
created_by

Exemplos:

Gerado por João Silva · Zelador
Gerado por Maria Souza · Síndico
Gerado por Carlos Oliveira · Administração

O registro do criador é protegido através de trigger no banco de dados, evitando alterações indevidas posteriormente.

🏢 Estrutura do Condomínio

O Condomínio Europa possui sete torres:

Torre	Nome	Cor
A	Madri	Azul
B	Roma	Verde
C	Lisboa	Laranja
D	Londres	Cinza
E	Paris	Marrom
F	Atenas	Amarelo
G	Amsterdam	Vermelho

Além das torres existe:

Geral / Áreas Gerais

A área Geral não é considerada uma torre.

As cores das torres representam sua identidade e localização dentro do condomínio e não são utilizadas para representar status de manutenção.

👥 Controle de acesso

O sistema possui controle de acesso baseado em funções.

Perfis disponíveis:

Administração
Síndico
Zelador
Subsíndico
Conselheiro
🔐 Matriz de permissões
Ação	Administração	Síndico	Zelador	Subsíndico	Conselheiro
Visualizar todas as manutenções	✅	✅	✅	❌	✅
Visualizar Geral	✅	✅	✅	❌	✅
Criar manutenção	✅	✅	✅	❌	❌
Editar manutenção	✅	✅	✅	❌	❌
Iniciar manutenção	✅	✅	✅	❌	❌
Concluir diretamente	✅	❌	❌	❌	❌
Excluir diretamente	✅	❌	❌	❌	❌
Solicitar conclusão	❌	✅	✅	❌	❌
Solicitar exclusão	❌	✅	✅	❌	❌
Aprovar solicitações	✅	❌	❌	❌	❌
🧑‍💼 Administração

A Administração possui acesso administrativo completo.

Pode:

Visualizar todas as manutenções.
Criar manutenções.
Editar manutenções.
Iniciar manutenções.
Concluir diretamente.
Excluir diretamente.
Aprovar solicitações.
Recusar solicitações.
Gerenciar usuários.
Gerenciar Subsíndicos.
Acessar logs.
Visualizar todas as áreas.
👔 Síndico

O Síndico possui acesso operacional amplo.

Pode:

Visualizar todas as manutenções.
Criar manutenções.
Editar manutenções.
Iniciar manutenções.
Solicitar conclusão.
Solicitar exclusão.

Não pode concluir ou excluir diretamente.

Essas ações precisam ser encaminhadas para aprovação da Administração.

🧰 Zelador

O Zelador possui acesso operacional semelhante ao Síndico.

Pode:

Visualizar todas as manutenções.
Criar manutenções.
Editar manutenções.
Iniciar manutenções.
Solicitar conclusão.
Solicitar exclusão.

Não pode:

Concluir diretamente.
Excluir diretamente.
Aprovar solicitações.
🏠 Subsíndico

O Subsíndico possui acesso restrito à sua própria torre.

Cada Subsíndico pode estar associado a exatamente uma torre.

Exemplo:

Subsíndico
└── Torre D — Londres

A associação é armazenada na estrutura:

subsindico_torres

O Subsíndico:

Visualiza somente sua torre.
Não visualiza Geral.
Não cria manutenções.
Não edita manutenções.
Não inicia manutenções.
Não solicita conclusão.
Não solicita exclusão.

A atribuição da torre é administrada pelos perfis autorizados.

👁️ Conselheiro

O Conselheiro possui acesso somente para visualização.

Pode consultar:

Todas as torres.
Área Geral.
Manutenções.
Informações operacionais permitidas.

Não pode modificar os dados.

📩 Sistema de Solicitações

Síndicos e Zeladores não podem concluir ou excluir manutenções diretamente.

Quando necessário, eles podem enviar uma solicitação para a Administração.

Tipos disponíveis:

Conclusão
Exclusão

Cada solicitação possui:

Manutenção relacionada
Usuário solicitante
Tipo
Status
Motivo
Data da solicitação
Responsável pela resolução
Data da resolução
Observação administrativa
Estados das solicitações
Pendente
Aprovada
Recusada

A Administração possui uma central específica:

/solicitacoes

onde pode:

Visualizar solicitações pendentes.
Aprovar solicitações.
Recusar solicitações.
Consultar solicitações aprovadas.
Consultar solicitações recusadas.
🔑 Autenticação

O sistema utiliza autenticação em duas etapas:

Email + Senha
       ↓
      PIN

A primeira etapa utiliza autenticação por email e senha.

Usuários não principais precisam informar um PIN para completar o acesso.

A tela de PIN possui uma rota independente:

/auth/pin
🔒 Proteção do PIN

O sistema possui proteção contra tentativas consecutivas incorretas.

Após:

5 tentativas incorretas

o acesso por PIN é temporariamente bloqueado.

Período de bloqueio:

15 minutos

Usuários principais possuem bypass conforme as regras de autenticação do sistema.

🛡️ Segurança

A segurança foi implementada em diferentes camadas.

Row Level Security

O Supabase utiliza Row Level Security (RLS) para controlar o acesso aos dados diretamente no banco de dados.

Isso permite que as regras de acesso não dependam exclusivamente da interface.

As permissões são aplicadas também na camada de dados.

Escopo por torre

O acesso de Subsíndicos é determinado pela relação existente em:

subsindico_torres

Essa estrutura define qual torre pode ser visualizada pelo usuário.

O campo legado:

profiles.torre

não é utilizado como fonte autoritativa para o escopo de Subsíndicos.

🗄️ Banco de Dados

O backend utiliza:

Supabase + PostgreSQL

Recursos utilizados:

PostgreSQL
Supabase Authentication
Row Level Security
Policies
Triggers
Views
RPCs
Storage
📦 Principais estruturas

Entre as principais estruturas utilizadas estão:

profiles
subsindico_torres
manutencoes
manutencao_equipe
solicitacoes_manutencao
usuarios_publicos
prestadores
ativos
⚙️ Tecnologias
Frontend
React
TypeScript
Vite
TanStack Router
TanStack Query
Tailwind CSS
shadcn/ui
Lucide Icons
Backend
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Row Level Security
PostgreSQL Functions
PostgreSQL Triggers
PostgreSQL Views
Visualização
Recharts
FullCalendar
🏗️ Arquitetura

O projeto utiliza uma arquitetura baseada em componentes, hooks e separação de responsabilidades.

Estrutura simplificada:

src/
│
├── components/
│   ├── ui/
│   ├── AlertsBar.tsx
│   ├── GeradoPor.tsx
│   └── ...
│
├── hooks/
│   ├── use-role.ts
│   ├── use-criadores.ts
│   ├── useSubsindicoTorre.ts
│   └── ...
│
├── lib/
│   ├── torres.ts
│   ├── solicitacoes.ts
│   ├── users.functions.ts
│   └── ...
│
├── routes/
│   ├── _authenticated/
│   │   ├── dashboard.tsx
│   │   ├── manutencoes.tsx
│   │   ├── calendario.tsx
│   │   ├── prestadores.tsx
│   │   ├── ativos.tsx
│   │   ├── relatorios.tsx
│   │   ├── impressoes.tsx
│   │   ├── perfil.tsx
│   │   ├── solicitacoes.tsx
│   │   ├── usuarios.tsx
│   │   └── logs.tsx
│   │
│   ├── auth.tsx
│   └── ...
│
├── integrations/
│   └── supabase/
│
├── styles.css
└── routeTree.gen.ts
🧩 Hooks de autorização

As regras de acesso são centralizadas através de hooks específicos.

Principais hooks:

useCurrentRole()
useIsAdmin()
useIsReadOnly()
useCanManageUsers()
useCanEditManutencao()
useCanDeleteManutencao()
useCanConcluirDireto()
useCanSolicitarAcao()
useCanAprovarSolicitacao()
useCanViewOnlyManutencao()
useSubsindicoTorre()
useScopeFilter()
useAllowedTorresList()
useAllowedTorreIds()

Essa abordagem ajuda a manter as regras de autorização consistentes em toda a aplicação.

📅 Calendário

O módulo de calendário utiliza o FullCalendar.

Permite visualizar as manutenções de acordo com suas datas e organizar a operação de forma temporal.

O calendário é integrado ao Design System da aplicação e possui suporte ao tema escuro.

🏭 Prestadores

O módulo de prestadores permite centralizar informações de profissionais e empresas responsáveis pela execução dos serviços.

Os prestadores podem ser relacionados às manutenções correspondentes.

📦 Ativos

O módulo de ativos permite organizar equipamentos e elementos da infraestrutura do condomínio.

Os ativos podem ser relacionados a:

Localização
Torre
Categoria
Responsável
Manutenções relacionadas
📈 Relatórios

O sistema possui uma área dedicada à análise das manutenções.

Os dados podem ser analisados de acordo com diferentes informações operacionais, como:

Status
Torre
Período
Quantidade
Situação dos serviços
🖨️ Impressões

O sistema possui recursos específicos para impressão de informações e documentos relacionados às manutenções.

Os documentos impressos possuem estilos próprios para garantir uma apresentação adequada independentemente do tema visual utilizado na aplicação.

📝 Logs de acesso

O sistema possui uma área de logs para acompanhamento de acessos e operações relevantes.

O objetivo é aumentar a rastreabilidade e facilitar processos de auditoria administrativa.

🎨 Design System

A interface utiliza um sistema de tokens centralizados para manter consistência visual.

Principais categorias:

Background
Surface
Surface elevada
Sidebar
Bordas
Texto
Texto secundário
Accent
Status
Radius
Transições

Exemplos:

--background
--surface
--surface-elevated
--sidebar-bg
--border
--foreground
--muted-foreground
--gold
--status-pending
--status-active
--status-waiting
--status-done
--status-late
--status-emergency
🌙 Dark Mode

A aplicação possui uma interface baseada em superfícies escuras.

A identidade visual utiliza principalmente:

Azul marinho
Azul profundo
Cinza escuro
Branco
Dourado

O dourado é utilizado como elemento de destaque e ações principais.

As cores de status possuem função semântica.

📱 Responsividade

A aplicação foi desenvolvida para diferentes tamanhos de tela:

Desktop
Notebook
Tablet
Smartphone

No mobile:

Sidebar adaptada para navegação compacta.
Tabelas possuem tratamento responsivo.
Filtros podem ser recolhidos.
Cards se reorganizam.
Conteúdo é adaptado para telas menores.
♿ Acessibilidade

O projeto considera princípios de acessibilidade, incluindo:

Contraste adequado.
Estados de foco.
Navegação por teclado.
Labels para campos.
Áreas de interação adequadas.
Feedback visual para estados.
Responsividade.
🚀 Instalação
Pré-requisitos

Antes de executar o projeto, tenha instalado:

Node.js
npm

Também é necessário possuir um projeto Supabase configurado.

1. Clonar o repositório
git clone https://github.com/SEU-USUARIO/europa-manutencao.git

Entre na pasta:

cd europa-manutencao
2. Instalar dependências
npm install
3. Configurar variáveis de ambiente

Crie um arquivo:

.env.local

Configure as variáveis utilizadas pela aplicação.

Exemplo:

VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave

Nunca publique credenciais privadas, Service Role Keys ou outros secrets no GitHub.

4. Executar o projeto
npm run dev

O Vite disponibilizará a aplicação localmente.

🏗️ Build de produção

Para gerar a versão de produção:

npm run build

Para executar uma prévia:

npm run preview

Os comandos disponíveis podem variar conforme a configuração do projeto.

🔐 Segurança de credenciais

Nunca versionar arquivos contendo informações sensíveis.

Exemplos:

.env
.env.local

Não publicar:

Senhas
Service Role Key
Tokens privados
Secrets
Credenciais administrativas

Recomenda-se manter um arquivo:

.env.example

contendo apenas os nomes das variáveis necessárias.

🧪 Checklist de qualidade

Antes de publicar alterações importantes:

[ ] TypeScript
[ ] Build
[ ] Rotas
[ ] Login
[ ] PIN
[ ] Permissões
[ ] RLS
[ ] CRUD de manutenções
[ ] Solicitações
[ ] Dashboard
[ ] Calendário
[ ] Prestadores
[ ] Ativos
[ ] Relatórios
[ ] Impressões
[ ] Logs
[ ] Dark Mode
[ ] Responsividade
[ ] Mobile
🗺️ Roadmap

Possíveis evoluções futuras:

 PWA completa
 Notificações push
 Aplicativo mobile
 Dashboard executivo avançado
 Indicadores de desempenho
 Histórico detalhado por ativo
 Controle de contratos
 Controle de custos
 Gestão de fornecedores
 Módulo de orçamentos
 Aprovação financeira
 Exportação avançada de relatórios
 Integrações externas
 Multi-condomínio
 Estrutura SaaS
💡 Evolução para SaaS

O projeto pode futuramente evoluir de uma solução específica para o Condomínio Europa para uma plataforma multi-condomínio.

Conceito:

Europa Manutenção
        │
        ▼
Sistema de Gestão de Manutenções
        │
        ▼
Plataforma Multi-Condomínio
        │
        ▼
SaaS de Gestão Predial

Uma futura arquitetura multi-tenant poderia permitir que cada condomínio possuísse:

Usuários próprios
Torres próprias
Permissões próprias
Prestadores próprios
Ativos próprios
Manutenções próprias
Configurações próprias
Dashboards próprios
🧠 Conceitos aplicados

O desenvolvimento do projeto envolve conceitos de:

Desenvolvimento Web
React
TypeScript
UX/UI
Design System
Arquitetura de software
Banco de dados
PostgreSQL
Autenticação
Autorização
Row Level Security
CRUD
Controle de acesso baseado em funções
Responsividade
Acessibilidade
Segurança de aplicações
Componentização
Gerenciamento de estado
Gerenciamento de dados
Visualização de dados
📸 Screenshots

As capturas de tela do projeto podem ser adicionadas em:

docs/screenshots/

Sugestão:

docs/
└── screenshots/
    ├── dashboard.png
    ├── manutencoes.png
    ├── calendario.png
    ├── prestadores.png
    ├── ativos.png
    ├── solicitacoes.png
    └── usuarios.png

Exemplo:

## Dashboard

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard Europa Manutenção" width="100%" />
</p>
📁 Estrutura recomendada do repositório
europa-manutencao/
│
├── public/
│   ├── logo.png
│   └── ...
│
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── routes/
│   ├── integrations/
│   ├── styles.css
│   └── ...
│
├── docs/
│   └── screenshots/
│
├── supabase/
│   └── migrations/
│
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── package.json
├── tailwind.config.*
├── tsconfig.json
└── vite.config.*
🔄 Fluxo simplificado
                    EUROPA MANUTENÇÃO
                           │
             ┌─────────────┼─────────────┐
             │             │             │
         Dashboard    Manutenções    Calendário
             │             │             │
             │       ┌─────┴─────┐       │
             │       │           │       │
             │   Prestadores   Ativos    │
             │       │           │       │
             └───────┴─────┬─────┴───────┘
                           │
                    Controle de acesso
                           │
        ┌──────────┬───────┼───────┬──────────┐
        │          │       │       │          │
      Admin     Síndico  Zelador  Subsíndico Conselheiro
        │          │       │       │          │
        │          └───────┴───────┘          │
        │                  │                  │
        │             Solicitações            │
        │                  │                  │
        └──────────── Administração ──────────┘
🛡️ Princípios do projeto
Controle

Centralizar as informações relacionadas às manutenções em uma única plataforma.

Rastreabilidade

Permitir identificar:

Quem
    ↓
Fez o quê
    ↓
Quando
    ↓
Onde
Segurança

Aplicar as regras de acesso tanto na interface quanto na camada de dados.

Organização

Estruturar as informações de acordo com:

Condomínio
    ↓
Torres
    ↓
Locais
    ↓
Ativos
    ↓
Manutenções
    ↓
Prestadores
📈 Status do projeto

🟢 Em desenvolvimento e evolução contínua

O sistema está em constante evolução, com foco em:

Estabilidade
Segurança
UX/UI
Responsividade
Organização do código
Novas funcionalidades
Escalabilidade
Possível evolução comercial
👨‍💻 Desenvolvimento

O Europa Manutenção foi desenvolvido como uma solução para gestão de manutenções prediais, aplicando tecnologias modernas de desenvolvimento web e conceitos de engenharia de software.

O projeto também funciona como aplicação prática de conhecimentos relacionados a:

Front-end
Back-end as a Service
Banco de Dados
Segurança
UX/UI
Arquitetura
Autenticação
Autorização
Design Systems
📄 Licença

Este projeto é de uso privado e foi desenvolvido para o contexto do Condomínio Europa.

A utilização, cópia, distribuição ou comercialização do código deve ser autorizada pelo responsável pelo projeto.
