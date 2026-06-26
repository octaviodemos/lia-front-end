# LIA Frontend

Interface web do **LIA** — loja de livros usados, checkout, conta do usuário, ofertas de venda, reformas, comunidade e painel administrativo.

Stack: **Angular 20** (standalone), **TypeScript**, **SCSS**.

| | |
|---|---|
| **App local** | `http://localhost:4200` |
| **API esperada** | `http://localhost:3333/api` |

---

## Funcionalidades

| Área | Rotas | Descrição |
|------|-------|-----------|
| **Institucional** | `/`, `/politica-de-privacidade`, `/condicoes-de-uso` | Home, Social Club e páginas legais |
| **Loja** | `/loja`, `/livro/:id`, `/mais-vendidos` | Catálogo, detalhe com variantes e avaliações |
| **Compra** | `/carrinho`, `/checkout` | Carrinho e pagamento via Stripe |
| **Conta** | `/minha-conta`, `/meus-pedidos`, `/meus-enderecos` | Perfil, histórico e endereços |
| **Venda** | `/vender-livro` | Oferta de livro com fotos categorizadas e preço formatado |
| **Reforma** | `/solicitar-reforma` | Solicitação com upload de imagens |
| **Comunidade** | `/comunidade`, `/publicacao/:id` | Publicações, comentários e reações |
| **Admin** | `/admin/*` | Pedidos, ofertas, reformas, livros e estoque |

---

## Stack

- Angular 20 · standalone components · Angular Router
- RxJS · TypeScript 5.9
- SCSS com mixins compartilhados (`src/app/styles/mixins/`)
- `ngx-mask` — máscaras de entrada (CPF, telefone, moeda)
- Font Awesome · Material Symbols (admin)
- Flatpickr — seleção de datas onde aplicável

---

## Pré-requisitos

- Node.js 20+
- npm 10+
- [Backend LIA](https://github.com/octaviodemos/lia-back-end) rodando em `http://localhost:3333`

---

## Início rápido

```bash
npm install
npm start
```

Abra `http://localhost:4200`.

Para dados de demonstração, rode o seed no backend (`npm run seed`) e faça login com o usuário admin configurado no `.env` do back.

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm start` | `ng serve` — desenvolvimento |
| `npm run build` | Build de produção em `dist/lia-frontend` |
| `npm run watch` | Build contínuo (dev) |
| `npm test` | Testes unitários (Karma) |

---

## Arquitetura

```text
src/app/
  pages/           telas (home, loja, admin, checkout…)
  components/      blocos reutilizáveis (livro-card, avaliação…)
  services/        HTTP e estado (auth, livros, carrinho…)
  models/          tipos do domínio
  utils/           normalização de payloads e URLs de mídia
  interceptors/    JWT nas requisições autenticadas
  guards/          proteção de rotas admin
  layout/          header e footer globais
  styles/mixins/   formulários e painel admin
```

**Convenções:** componentes standalone; tipagem centralizada em `models/`; normalização de livros em `utils/normalize-livro.ts` e `utils/livro-utils.ts`.

---

## Autenticação

- Token JWT em `localStorage` (`lia_auth_token`).
- Interceptor [`src/app/interceptors/auth.ts`](src/app/interceptors/auth.ts) envia `Authorization: Bearer <token>`.
- Rotas `/admin/*` protegidas por `adminGuard` (perfil `admin` no backend).

---

## Integração com a API

A URL base está definida nos services como `http://localhost:3333`. Principais grupos:

| Service | Endpoints |
|---------|-----------|
| `auth.ts` | `/api/auth/*` |
| `livro.service.ts` | `/api/books` |
| `carrinho.service.ts` | `/api/cart` |
| `pedido.service.ts` | `/api/orders` |
| `pagamento.service.ts` | `/api/payments` |
| `oferta-venda.service.ts` | `/api/offers` |
| `reforma.service.ts` | `/api/repairs` |
| `endereco.service.ts` | `/api/addresses` |
| `publicacao.service.ts` | `/api/publicacoes` |
| `ai.service.ts` | `/api/ai` |
| `recommendations.service.ts` | `/api/recommendations/skoob` |
| `endereco-utils.service.ts` | `/api/utils/cep`, estados e municípios |

URLs de imagens são resolvidas em [`src/app/utils/media-url.ts`](src/app/utils/media-url.ts) (`/uploads/*` no backend).

> **Produção:** hoje a API está hardcoded nos services. Para deploy, centralize a origem em um único ponto de configuração.

---

## Fluxos em destaque

### Cadastro de livro (admin)

Em `/admin/livros`:

- Upload da capa dispara `POST /api/ai/identify-cover`.
- Campos preenchidos automaticamente: título, autor, ISBN, editora, ano e sinopse.
- Autor é enviado no `POST /api/books` e vinculado no backend.

### Oferta de venda

Em `/vender-livro`:

- Formulário com título, autor, ISBN, preço (máscara R$) e descrição da condição.
- Envio `multipart/form-data` para `POST /api/offers`.
- Fotos: `imagem_Capa`, `imagem_Contracapa`, `imagem_Lombada`, `imagem_MioloPaginas`, `imagem_DetalhesAvarias`.

### Checkout

1. Carrinho → checkout com endereço de entrega.
2. Backend cria sessão Stripe.
3. Retorno em `/pedido/sucesso` ou `/pedido/falha` (aliases em `/payment/*`).

### Painel admin

| Rota | Função |
|------|--------|
| `/admin/pedidos` | Gestão de pedidos |
| `/admin/ofertas` | Triagem de ofertas (+ avaliação IA) |
| `/admin/reformas` | Triagem de reformas |
| `/admin/livros` | Cadastro de títulos |
| `/admin/estoque` | Preço e disponibilidade por exemplar |

---

## Layout global

- Header fixo com altura em `--header-height` (ver `src/styles.scss`).
- Conteúdo principal compensa o header; footer ancora ao fim da página quando o conteúdo é curto.
- Estilos de formulário e admin reutilizam mixins em `src/app/styles/mixins/`.

---

## Troubleshooting

| Problema | O que verificar |
|----------|-----------------|
| CORS ou 401 | Backend em `:3333`; token em `localStorage`; usuário logado |
| Dados não carregam | Aba Network; Swagger do back em `/api/docs` |
| Imagens quebradas | Backend servindo `/uploads/`; `media-url.ts` apontando para a origem correta |
| Preços estranhos | API retorna decimais como string `"XX.XX"` — ver `normalize-livro.ts` |
| Erro de parse no `ng serve` | `src/index.html` deve ter `</head>` antes do `<body>` |

---

## Referências

- [Angular](https://angular.dev)
- [Documentação de integração com a API](https://github.com/octaviodemos/lia-back-end/blob/main/docs/FRONTEND_INTEGRATION.md)
- [Swagger local](http://localhost:3333/api/docs) (com o backend rodando)
