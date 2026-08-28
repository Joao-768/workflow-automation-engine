# Workflow Automation Engine

Plataforma de automação de workflows. O utilizador define regras no formato
**WHEN / IF / DO**, o sistema recebe eventos e executa automaticamente as ações
configuradas.

```
WHEN   Utilizador criado
IF     (sempre)
DO     Enviar email para {{email}}
```

Quando chega um evento, o sistema procura os workflows ativos com aquele
trigger, avalia a condição de cada um e executa a ação. Cada execução fica
registada no histórico.

```
EVENT -> TRIGGER -> WORKFLOW -> ACTION -> EXECUTION
```

## Stack

- **Frontend:** React, TypeScript, Vite, React Router
- **Backend:** Node.js, TypeScript, Express
- **Base de dados:** PostgreSQL
- **Autenticação:** JWT, passwords com bcrypt

## Como funciona

Um evento entra pelo `POST /events`:

```json
{
  "type": "user.created",
  "data": { "userId": 45, "email": "ana@mail.com", "name": "Ana" }
}
```

O engine faz três coisas por cada workflow que corresponda ao trigger:

1. **Avalia a condição** (`engine/conditions.ts`) — se não passar, a execução
   fica com estado `skipped` e a ação não corre.
2. **Executa a ação** (`engine/actions.ts`) — se rebentar, o estado é `failed`
   e o erro é guardado.
3. **Grava a execução** (`engine/runner.ts`) com o evento que a despoletou e o
   resultado.

Cada workflow é tratado de forma isolada: se um falhar, os restantes correm na
mesma.

Como não há integrações externas nesta versão, as ações são simuladas — cada
uma devolve um objeto a descrever o que teria feito.

### Dados do evento nas ações

Os campos da ação aceitam `{{campo}}`, substituído pelo valor que vem no
evento. É o que permite um único workflow servir cada utilizador com os seus
dados, em vez de um destinatário fixo:

```
to:       {{email}}                  ->  ana@mail.com
subject:  Bem-vindo, {{name}}!       ->  Bem-vindo, Ana!
```

Um campo que o evento não traga fica literal (`{{telefone}}`) em vez de virar
`undefined`, para se ver no histórico o que faltou.

### Estados de execução

| Estado | Significado |
|--------|-------------|
| `success` | A condição passou e a ação correu |
| `skipped` | A condição não passou, a ação não correu |
| `failed` | A ação foi executada mas rebentou |

## Triggers e ações

| Trigger | Campos do evento |
|---------|------------------|
| `order.created` | `total`, `orderId`, `customer`, `email` |
| `user.created` | `userId`, `email`, `name` |
| `payment.completed` | `amount`, `paymentId` |
| `form.submitted` | `formId`, `field` |

**Ações** e a configuração de cada uma, guardada em JSONB:

```json
send_notification  { "message": "..." }
send_email         { "to": "...", "subject": "..." }
create_record      { "table": "...", "fields": "..." }
```

**Condições** comparam um campo do evento com um valor, através de um dos três
operadores que o engine conhece: `>`, `<`, `==`. Um workflow sem condição corre
sempre.

```json
{ "field": "total", "operator": ">", "value": 100 }
```

O formulário monta isto a partir de dropdowns — o campo vem do trigger
escolhido e o operador da lista acima, por isso não é possível gravar uma
condição que só rebentaria em runtime.

## API

Tirando o registo e o login, todas as rotas exigem `Authorization: Bearer
<token>`. Cada utilizador só vê os seus próprios workflows e execuções.

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Cria conta, devolve token |
| POST | `/auth/login` | Autentica, devolve token |
| GET | `/workflows` | Lista os do utilizador |
| POST | `/workflows` | Cria |
| GET | `/workflows/:id` | Vê um |
| PUT | `/workflows/:id` | Edita |
| DELETE | `/workflows/:id` | Apaga (e o histórico dele) |
| PATCH | `/workflows/:id/toggle` | Ativa/desativa |
| POST | `/events` | Recebe um evento e corre os workflows |
| GET | `/executions` | Histórico de execuções |
| GET | `/executions/:id` | Detalhe de uma execução |
| GET | `/health` | Estado da ligação à base de dados |

O `POST` e o `PUT` passam por um middleware de validação que rejeita campos em
falta ou triggers e ações fora da lista, devolvendo `400`.

## Base de dados

```sql
users
  id, name, email, password_hash, created_at

workflows
  id, name, description, user_id, created_at
  trigger_type      -- coluna: é por aqui que se procuram os workflows
  conditions        -- JSONB, opcional
  action_type       -- coluna: decide qual o handler
  action_config     -- JSONB, varia conforme a ação
  is_active

executions
  id, workflow_id, status, executed_at
  event_data        -- o evento que despoletou
  result            -- o que a ação devolveu, ou o erro
```

O que é pesquisado ou determina uma decisão é coluna; o que varia conforme o
tipo é JSONB. Apagar um utilizador apaga os workflows dele, e apagar um
workflow apaga as execuções (`ON DELETE CASCADE`).

## Estrutura

```
backend/src
  db/          ligação ao Postgres e schema
  engine/      lógica de domínio (não conhece Express)
  middleware/  verificação do JWT
  routes/      camada HTTP

frontend/src
  pages/       landing, autenticação, dashboard, workflows, simulador, histórico
  schema.ts    triggers, campos e ações que o formulário oferece
  types.ts
```

O engine não importa nada do Express. Recebe dados, devolve resultados — pode
ser chamado a partir de outra origem sem alterações.

## Arrancar

Precisa de PostgreSQL a correr localmente.

```bash
createdb workflow_automation_engine
psql workflow_automation_engine -f backend/src/db/schema.sql
```

**Backend** (porta 3000)

```bash
cd backend
npm install
cp .env.example .env    # ajustar DATABASE_URL e JWT_SECRET
npm run dev
```

**Frontend** (porta 5173)

```bash
cd frontend
npm install
npm run dev
```

Cria conta em `/register`, define um workflow e dispara um evento no simulador
para o ver correr.

## Estado

V1 completo: autenticação com isolamento de dados por utilizador, CRUD de
workflows, engine de execução, simulador de eventos e histórico.

Previsto para V2: builder visual com nodes, drag & drop, IF/ELSE e múltiplas
ações por workflow.
