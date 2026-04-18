# LIA Front-end

Aplicação web da LIA desenvolvida com Angular, responsável pelos fluxos de loja, carrinho, checkout, conta do usuário, ofertas de venda, solicitações de reforma e painel administrativo.

## Stack principal

- Angular 20 (standalone components)
- TypeScript
- SCSS
- RxJS
- `ngx-mask` para máscaras de entrada
- Font Awesome

## Requisitos

- Node.js 20+
- npm 10+
- Back-end da LIA rodando localmente em `http://localhost:3333`

## Como executar localmente

1. Instale as dependências:

```bash
npm install
```

2. Inicie o projeto em modo desenvolvimento:

```bash
npm start
```

3. Acesse no navegador:

`http://localhost:4200`

## Scripts disponíveis

- `npm start`: inicia o servidor de desenvolvimento (`ng serve`)
- `npm run build`: gera build de produção
- `npm run watch`: build em modo watch com configuração de desenvolvimento
- `npm test`: executa os testes unitários (Karma)

## Build

Para gerar build:

```bash
npm run build
```

O output é gerado em `dist/lia-frontend`.

## Arquitetura resumida

Estrutura principal em `src/app`:

- `pages`: telas da aplicação (home, loja, carrinho, checkout, minha conta, admin etc.)
- `services`: integração HTTP com API e regras de acesso a dados
- `models`: contratos e tipagens do domínio
- `utils`: normalização de payloads e helpers reutilizáveis
- `interceptors`: interceptação de requisições HTTP (JWT)
- `guards`: controle de acesso por perfil (ex.: admin)
- `layout`: elementos globais de interface (ex.: header)

## Autenticação e autorização

- O token JWT é armazenado no `localStorage` (`lia_auth_token`).
- O interceptor de autenticação (`src/app/interceptors/auth.ts`) injeta `Authorization: Bearer <token>` nas requisições autenticadas.
- Rotas administrativas usam `adminGuard`.

## Rotas e fluxos principais

- Loja e catálogo: `/loja`, `/livro/:id`
- Carrinho e checkout: `/carrinho`, `/checkout`
- Conta do usuário: `/minha-conta`, `/meus-pedidos`, `/meus-enderecos`
- Oferta de venda: `/vender-livro`
- Solicitação de reforma: `/solicitar-reforma`
- Admin: `/admin/*` (livros, estoque, pedidos, ofertas, reformas, avaliações)

## Integrações de API (resumo)

Endpoints usados no front-end (base local):

- Autenticação: `/api/auth/*`
- Livros: `/api/books`
- Carrinho/Pedidos/Pagamento: `/api/cart`, `/api/orders`, `/api/payments`
- Endereços: `/api/addresses`
- Ofertas: `/api/offers`
- Reformas: `/api/repairs`

## Oferta de venda de livro

Fluxo na página `/vender-livro`:

- Formulário com:
  - `titulo_livro` (obrigatório)
  - `autor_livro` (opcional)
  - `isbn` (opcional)
  - `preco_sugerido` (obrigatório)
  - `descricao_condicao` (opcional)
- Envio em `multipart/form-data` para `POST /api/offers`
- Upload de imagens categorizadas:
  - `imagem_Capa`
  - `imagem_Contracapa`
  - `imagem_Lombada`
  - `imagem_MioloPaginas`
  - `imagem_DetalhesAvarias`

## Convenções do projeto

- Componentes e páginas em padrão standalone.
- Estilos com SCSS e mixins compartilhados.
- Normalização de payloads centralizada em `utils`.
- Tipagem de domínio centralizada em `models`.

## Troubleshooting rápido

- Erro CORS/401:
  - confirme se o back-end está em `http://localhost:3333`
  - confirme se o usuário está autenticado e token presente no `localStorage`
- Dados não carregam:
  - valide a disponibilidade dos endpoints no back-end
  - verifique o console do navegador e aba Network

## Referências

- [Documentação Angular CLI](https://angular.dev/tools/cli)
