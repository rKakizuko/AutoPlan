# Relatório Detalhado do Backend - Projeto de Estágio

**Data**: Maio 2026  
**Objetivo**: Documentar atributos, métodos e relacionamentos dos Models e Services

---

## 1. MODELOS (SCHEMAS)

### 1.1 Model: User

#### Atributos

| Atributo | Tipo | Obrigatório | Unique | Descrição |
|----------|------|-------------|--------|-----------|
| `email` | String | ✓ | ✓ | Email do usuário (lowercase) |
| `cpf` | String | ✗ | ✓* | CPF do usuário (sparse) |
| `password` | String | ✓ | ✗ | Senha criptografada com bcrypt |
| `role` | String (enum) | ✗ | ✗ | 'admin' ou 'user' (padrão: 'user') |
| `createdAt` | Date | ✗ | ✗ | Data de criação (padrão: Date.now) |

**Observações:**
- CPF é único mas sparse (permite valores nulos/undefined)
- Senha é criptografada automaticamente via middleware `pre('save')`

#### Métodos de Instância

| Método | Parâmetros | Retorno | Descrição |
|--------|-----------|---------|-----------|
| `comparePassword()` | `enteredPassword: string` | `Promise<boolean>` | Compara senha inserida com hash salvo usando bcrypt |

#### Métodos Estáticos do Mongoose

- `findOne()` - Buscar usuário por atributos
- `findById()` - Buscar por ID
- `find()` - Listar múltiplos
- `findByIdAndDelete()` - Deletar por ID

#### Middlewares

| Hook | Ação |
|------|------|
| `pre('save')` | Hash da senha com bcrypt (salt: 10) se modificada |

---

### 1.2 Model: Protocol

#### Atributos

| Atributo | Tipo | Obrigatório | Descrição |
|----------|------|-------------|-----------|
| `protocolId` | String | ✓ | Identificador único (format: PROTO-{timestamp}) |
| `userId` | ObjectId (ref: User) | ✓ | Referência ao usuário criador |
| `cliente` | String | ✓ | Nome do cliente |
| `precoBase` | Number | ✓ | Preço base inicial |
| `metodo` | String (enum) | ✓ | 'pix' \| 'boleto' \| 'cartao' |
| `parcelas` | Number | ✗ | Número de parcelas (padrão: 1) |
| `total` | Number | ✓ | Valor total com juros/taxas |
| `startDate` | Date | ✗ | Data de início (padrão: Date.now) |
| `payments` | Array[Object] | ✗ | Array de pagamentos (parcelas) |
| `createdAt` | Date | ✗ | Data de criação |

#### Estrutura do Array `payments`

```javascript
payments: [{
  parcelaNumero: Number,        // Número sequencial da parcela
  valor: Number,                // Valor da parcela
  dataPagamento: Date,          // Quando foi paga (null se não paga)
  pago: Boolean                 // Status de pagamento
}]
```

#### Relacionamentos

- **1:N com User** - Um usuário pode ter múltiplos protocols
- Referência: `userId` → `User._id`

---

### 1.3 Model: PaymentRules

#### Atributos

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `pix` | Object | Configurações do PIX |
| `pix.nome` | String | Nome da forma (padrão: "PIX (10% OFF)") |
| `pix.taxa` | Number | Taxa/desconto (padrão: -0.10 = 10% OFF) |
| `boleto` | Object | Configurações do Boleto |
| `boleto.nome` | String | Nome da forma (padrão: "Boleto (5% Taxa)") |
| `boleto.taxa` | Number | Taxa de processamento (padrão: 0.05 = 5%) |
| `boleto.parcelas` | Boolean | Se permite parcelamento (padrão: true) |
| `cartao` | Object | Configurações do Cartão |
| `cartao.taxaOperadora` | Number | Taxa da operadora (padrão: 0.04 = 4%) |
| `cartao.jurosMensal` | Number | Juros mensais (padrão: 0.0249 = 2.49%) |
| `cartao.parcelas` | Boolean | Se permite parcelamento (padrão: true) |
| `timestamps` | Auto | createdAt, updatedAt (automático) |

#### Observações

- **Singleton Pattern**: Apenas um documento deve existir
- Timestamps automáticos habilitados (createdAt, updatedAt)

---

### 1.4 Model: AuditLog

#### Atributos

| Atributo | Tipo | Obrigatório | Descrição |
|----------|------|-------------|-----------|
| `action` | String | ✓ | Tipo de ação realizada |
| `entityType` | String | ✓ | Tipo de entidade afetada (ex: 'user', 'protocol') |
| `entityId` | String | ✗ | ID da entidade modificada |
| `actorId` | ObjectId (ref: User) | ✗ | Referência ao usuário que fez a ação |
| `actorEmail` | String | ✗ | Email do ator (padrão: 'system') |
| `details` | Mixed | ✗ | Objeto com dados adicionais (padrão: {}) |
| `timestamps` | Auto | - | createdAt, updatedAt (automático) |

#### Ações Registradas

| Ação | Tipo Entidade | Contexto |
|------|---------------|---------|
| `user_registered` | user | Novo usuário se registrou |
| `user_logged_in` | auth | Usuário fez login |
| `user_profile_updated` | user | Usuário atualizou perfil |
| `user_created` | user | Admin criou novo usuário |
| `user_updated` | user | Admin atualizou usuário |
| `user_deleted` | user | Admin deletou usuário |
| `protocol_created` | protocol | Novo protocolo criado |
| `protocol_payment_updated` | protocol_payment | Status de pagamento atualizado |
| `payment_rules_created` | payment_rules | Regras de pagamento criadas |
| `payment_rules_updated` | payment_rules | Regras de pagamento atualizadas |

---

## 2. SERVIÇOS (SERVICES)

### 2.1 UserService

#### Métodos

##### `register(email, password, cpf?)`

```javascript
async register(email: string, password: string, cpf?: string)
  → Promise<{ token: string, user: { id, email, cpf, role } }>
```

**Validações:**
- Email e password obrigatórios
- CPF normalizado (remove caracteres não-numéricos)
- CPF deve ter 11 dígitos (se fornecido)
- Email único
- CPF único (se fornecido)

**Comportamento:**
- Cria novo usuário com role 'user'
- Gera JWT válido por 7 dias
- Registra audit log: `user_registered`

**Exceções:**
- "Email and password required"
- "CPF must have 11 digits"
- "User already exists"
- "CPF already in use"

---

##### `login(email, password)`

```javascript
async login(email: string, password: string)
  → Promise<{ token: string, user: { id, email, cpf, role } }>
```

**Validações:**
- Email e password obrigatórios
- Email existe no banco
- Password corresponde ao hash salvo

**Comportamento:**
- Valida credenciais via `comparePassword()`
- Gera JWT válido por 7 dias
- Registra audit log: `user_logged_in`

**Exceções:**
- "Email and password required"
- "Invalid credentials"

---

##### `getProfile(userId)`

```javascript
async getProfile(userId: string)
  → Promise<{ id, email, cpf, role, createdAt }>
```

**Comportamento:**
- Busca usuário sem a senha (exclusão de campo '-password')
- Retorna dados públicos do perfil

**Exceções:**
- "User not found"

---

##### `updateProfile(userId, email, cpf?, password?)`

```javascript
async updateProfile(userId: string, email: string, cpf?: string, password?: string)
  → Promise<{ id, email, cpf, role, createdAt }>
```

**Validações:**
- Email obrigatório
- CPF deve ter 11 dígitos (se fornecido)
- Password mínimo 6 caracteres (se fornecido)
- Email único (exceto o do próprio usuário)
- CPF único (exceto o do próprio usuário)

**Comportamento:**
- Atualiza dados do usuário logado
- Criptografa nova password automaticamente via middleware
- Registra audit log: `user_profile_updated`

**Exceções:**
- "User not found"
- "Email already in use"
- "CPF already in use"
- "Password must have at least 6 characters"

---

##### `listUsers()`

```javascript
async listUsers()
  → Promise<Array<{ id, email, cpf, role, createdAt }>>
```

**Comportamento:**
- Lista todos os usuários
- Exclui password de todos
- Ordena por createdAt descending

**Restrição:** Apenas admin deve chamar

---

##### `createUser(email, password, role?, cpf?, actorId)`

```javascript
async createUser(email: string, password: string, role?: 'admin'|'user', cpf?: string, actorId: string)
  → Promise<{ id, email, cpf, role, createdAt }>
```

**Validações:**
- Email e password obrigatórios
- CPF deve ter 11 dígitos (se fornecido)
- Password mínimo 6 caracteres
- Role deve ser 'admin' ou 'user'
- Email único
- CPF único (se fornecido)

**Comportamento:**
- Cria novo usuário com role especificado
- Registra audit log: `user_created` com actorId do admin

**Exceções:**
- Mesmo as do registro + validações adicionais

---

##### `updateUser(userId, updates, actorId)`

```javascript
async updateUser(userId: string, updates: { email?, password?, role?, cpf? }, actorId: string)
  → Promise<{ id, email, cpf, role, createdAt }>
```

**Parâmetro `updates`:**
```javascript
{
  email?: string,        // Novo email
  password?: string,     // Nova password
  role?: 'admin'|'user', // Novo role
  cpf?: string          // Novo CPF
}
```

**Validações:**
- Email obrigatório no updates
- Mesmo as de createUser para cada campo

**Comportamento:**
- Atualiza usuário especificado (admin)
- Registra audit log: `user_updated` com actorId do admin

---

##### `deleteUser(userId, actorId)`

```javascript
async deleteUser(userId: string, actorId: string)
  → Promise<void>
```

**Validações:**
- Admin não pode deletar a si mesmo
- Usuário deve existir

**Comportamento:**
- Remove usuário do banco
- Registra audit log: `user_deleted` com actorId do admin

**Exceções:**
- "You cannot delete your own user"
- "User not found"

---

### 2.2 ProtocolService

#### Métodos

##### `create(userId, cliente, precoBase, metodo, parcelas?, total)`

```javascript
async create(userId: string, cliente: string, precoBase: number, metodo: 'pix'|'boleto'|'cartao', parcelas?: number, total: number)
  → Promise<Protocol>
```

**Comportamento:**
- Gera `protocolId` = "PROTO-{timestamp}"
- Divide `total` em `parcelas` iguais
- Cria array de `payments` com status `pago: false`
- Registra audit log: `protocol_created`

**Retorno:**
- Documento Protocol completo com todas as parcelas

**Exemplo:**
```javascript
// Input: 3 parcelas de total 300
// Output: payments = [
//   { parcelaNumero: 1, valor: 100, pago: false },
//   { parcelaNumero: 2, valor: 100, pago: false },
//   { parcelaNumero: 3, valor: 100, pago: false }
// ]
```

---

##### `getAll(userId, isAdmin)`

```javascript
async getAll(userId: string, isAdmin: boolean)
  → Promise<Array<Protocol>>
```

**Comportamento:**
- Se admin: retorna TODOS os protocols
- Se não admin: retorna apenas protocols do usuário
- Ordena por createdAt descending

---

##### `getById(protocolId, userId, isAdmin)`

```javascript
async getById(protocolId: string, userId: string, isAdmin: boolean)
  → Promise<Protocol>
```

**Validações:**
- Protocol existe
- Se não admin: userId do protocol deve ser o do requisitante

**Exceções:**
- "Protocol not found"
- "Not authorized"

---

##### `updatePaymentStatus(protocolId, userId, parcelaNumero, pago, dataPagamento?)`

```javascript
async updatePaymentStatus(protocolId: string, userId: string, parcelaNumero: number, pago: boolean, dataPagamento?: Date)
  → Promise<Protocol>
```

**Validações:**
- Protocol existe
- userId do protocol é o do requisitante
- Parcela (parcelaNumero) existe

**Comportamento:**
- Atualiza campo `pago` da parcela especificada
- Se pago=true: seta `dataPagamento` (ou usa data atual se não fornecida)
- Se pago=false: limpa `dataPagamento` (null)
- Registra audit log: `protocol_payment_updated`

**Exceções:**
- "Protocol not found"
- "Not authorized"
- "Payment not found"

---

### 2.3 PaymentRulesService

#### Métodos

##### `get()`

```javascript
async get()
  → Promise<PaymentRules>
```

**Comportamento:**
- Busca único documento de PaymentRules
- Se não existir, cria um novo com valores padrão
- Retorna o documento

**Nota:** Garante sempre que existe um documento no banco

---

##### `update(updates, actorId)`

```javascript
async update(updates: { pix?, boleto?, cartao? }, actorId: string)
  → Promise<PaymentRules>
```

**Parâmetro `updates`:**
```javascript
{
  pix?: { nome?: string, taxa?: number },
  boleto?: { nome?: string, taxa?: number, parcelas?: boolean },
  cartao?: { taxaOperadora?: number, jurosMensal?: number, parcelas?: boolean }
}
```

**Comportamento:**
- Busca documento único
- Se não existir, cria novo com os updates
- Se existir, faz merge dos updates (mantém valores não atualizados)
- Registra audit log: `payment_rules_created` ou `payment_rules_updated`
- Audit log inclui previousRules e updatedRules

**Retorno:**
- PaymentRules atualizado com timestamps automáticos

---

### 2.4 AuditService

#### Métodos

##### `create(action, entityType, entityId?, actorId?, actorEmail?, details?)`

```javascript
async create(action: string, entityType: string, entityId?: string, actorId?: string, actorEmail?: string = 'system', details?: object = {})
  → Promise<void>
```

**Comportamento:**
- Cria documento AuditLog no banco
- Timestamps automáticos (createdAt)
- Não retorna nada (fire-and-forget)
- Captura erros silenciosamente (console.error)

**Uso Comum:**
```javascript
await createAuditLog({
  action: 'user_created',
  entityType: 'user',
  entityId: user._id.toString(),
  actorId: adminId,
  actorEmail: admin.email,
  details: { email: user.email, role: user.role }
});
```

---

##### `query(filters?, limit?)`

```javascript
async query(filters?: { action?, entityType?, actorEmail? }, limit?: number = 100)
  → Promise<Array<AuditLog>>
```

**Parâmetro `filters`:**
```javascript
{
  action?: string,      // Filtro exato (ex: 'user_created')
  entityType?: string,  // Filtro exato (ex: 'user', 'protocol')
  actorEmail?: string   // Filtro regex case-insensitive
}
```

**Validações:**
- Limit máximo: 200
- Limit padrão: 100

**Comportamento:**
- Busca logs que correspondem aos filtros
- Se `actorEmail` fornecido, usa regex para busca parcial
- Ordena por createdAt descending
- Todos os filtros são AND (não OR)

**Exemplo:**
```javascript
// Todos os logins
const logins = await auditService.query({ 
  action: 'user_logged_in' 
}, 50);

// Todas as ações do usuário admin@email.com
const adminActions = await auditService.query({
  actorEmail: 'admin@email.com'
}, 100);
```

---

## 3. RELACIONAMENTOS ENTRE MODELOS

### 3.1 Diagrama de Relacionamentos

```
User (1) ─────── (N) Protocol
  │                    │
  │                    │ Contém array de payments
  └──── (N) AuditLog
         (como actorId)

PaymentRules (1) ─── Referenciado em Protocol
                     (metodo determina taxa a usar)
```

### 3.2 Tabela de Relacionamentos

| Relação | De | Para | Tipo | Campo | Comportamento |
|---------|----|----|------|-------|----------------|
| **User → Protocol** | User | Protocol | 1:N | `userId` (ObjectId ref) | Um user pode ter N protocols |
| **User → AuditLog** | User | AuditLog | 1:N | `actorId` (ObjectId ref) | Um user pode gerar N logs |
| **Protocol → Payments** | Protocol | Array | 1:N | `payments[]` (embedded) | Um protocol contém múltiplas parcelas |
| **PaymentRules → Application** | PaymentRules | Global | 1:1 | Singleton | Uma única configuração global |

### 3.3 Fluxo de Dados

```
[Usuário Registra]
  ↓
  └→ UserService.register()
     └→ Cria User (password criptografada)
        └→ AuditLog: user_registered

[Usuário Faz Login]
  ↓
  └→ UserService.login()
     └→ Valida password via User.comparePassword()
        └→ Gera JWT
           └→ AuditLog: user_logged_in

[Admin Cria Protocolo]
  ↓
  └→ ProtocolService.create()
     └→ Cria Protocol linked com userId
        └→ Gera array de payments
           └→ AuditLog: protocol_created

[Usuário Atualiza Pagamento]
  ↓
  └→ ProtocolService.updatePaymentStatus()
     └→ Busca Protocol por ID
        └→ Valida ownership (userId)
           └→ Atualiza status da parcela
              └→ AuditLog: protocol_payment_updated

[Admin Configura Taxas]
  ↓
  └→ PaymentRulesService.update()
     └→ Cria/atualiza documento singleton
        └→ Armazena previousRules para auditoria
           └→ AuditLog: payment_rules_created/updated
```

---

## 4. VALIDAÇÕES CONSOLIDADAS

### 4.1 CPF

- **Normalização**: Remove caracteres não-numéricos (`\D`)
- **Validação**: Exatamente 11 dígitos (`^\d{11}$`)
- **Unicidade**: Não pode repetir (sparse index)

### 4.2 Email

- **Normalização**: Convertido para lowercase
- **Validação**: Obrigatório
- **Unicidade**: Não pode repetir (unique index)

### 4.3 Password

- **Criptografia**: bcrypt com salt 10
- **Comprimento Mínimo**: 6 caracteres
- **Hash automático**: Via middleware pre-save

### 4.4 Role

- **Valores Permitidos**: 'admin' ou 'user'
- **Padrão**: 'user'
- **Imutável na Criação**: Apenas admin pode mudar

### 4.5 Método de Pagamento

- **Valores Permitidos**: 'pix', 'boleto', 'cartao'
- **Obrigatório**: Sim
- **Vínculo com PaymentRules**: Determina taxa aplicada

---

## 5. FLUXOS DE AUTORIZAÇÃO

### 5.1 Usuários Comuns

- Podem registrar-se
- Podem fazer login
- Podem visualizar/atualizar seu próprio perfil
- Podem criar protocols
- Podem visualizar seus próprios protocols
- Podem atualizar status de pagamento de seus protocols

### 5.2 Administradores

- Todas as permissões de usuário comum
- Podem listar todos os usuários
- Podem criar novos usuários (qualquer role)
- Podem atualizar qualquer usuário
- Podem deletar usuários (exceto a si mesmo)
- Podem visualizar TODOS os protocols (não apenas seus)
- Podem modificar PaymentRules globais
- Registram todas as ações em AuditLog com seu ID

---

## 6. DIFERENÇAS COM DIAGRAMA MERMAID

### Pontos para Verificação

- [ ] O diagrama mostra Model "Payment"? **Não existe separado** - está como array em Protocol.payments
- [ ] O diagrama mostra relacionamentos de actorId? **Deve estar em AuditLog → User**
- [ ] O diagrama usa os nomes de método corretos? **Verificar assinaturas exatas**
- [ ] O diagrama mostra PaymentRules como singleton? **Confirmar representação**
- [ ] O diagrama mostra array payments corretamente? **Está dentro de Protocol, não separado**

---

## 7. RESUMO DE ESTATÍSTICAS

| Item | Quantidade |
|------|-----------|
| **Models** | 4 (User, Protocol, PaymentRules, AuditLog) |
| **Services** | 4 |
| **Métodos totais** | ~22 |
| **Métodos de User** | 1 (comparePassword) |
| **Métodos de Protocol** | 0 (apenas Schema) |
| **Métodos de PaymentRules** | 0 (apenas Schema) |
| **Métodos de AuditLog** | 0 (apenas Schema) |
| **Métodos em UserService** | 8 |
| **Métodos em ProtocolService** | 4 |
| **Métodos em PaymentRulesService** | 2 |
| **Métodos em AuditService** | 2 |
| **Ações de Audit** | 10 |
| **Enums** | 3 (role, metodo, payment methods) |

---

## 8. TECNOLOGIAS E DEPENDÊNCIAS

| Dependência | Uso |
|-------------|-----|
| `mongoose` | ODM para MongoDB |
| `bcryptjs` | Criptografia de password |
| `jsonwebtoken` | Geração de JWT |
| **Versão Node** | v20.x (conforme package.json) |
| **Banco** | MongoDB |

---

**FIM DO RELATÓRIO**
