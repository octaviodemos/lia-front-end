import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Cadastro } from './pages/cadastro/cadastro';
import { Loja } from './pages/loja/loja';
import { LivroDetalhes } from './pages/livro-detalhes/livro-detalhes';
import { Carrinho } from './pages/carrinho/carrinho';
import { Checkout } from './pages/checkout/checkout';
import { MeusEnderecos } from './pages/meus-enderecos/meus-enderecos';
import { PedidoSucesso } from './pages/pedido-sucesso/pedido-sucesso';
import { PedidoFalha } from './pages/pedido-falha/pedido-falha';
import { MeusPedidos } from './pages/meus-pedidos/meus-pedidos';
import { OfertarLivro } from './pages/ofertar-livro/ofertar-livro';
import { SolicitarReforma } from './pages/solicitar-reforma/solicitar-reforma';
import { MinhaConta } from './pages/minha-conta/minha-conta';
import { Comunidade } from './pages/comunidade/comunidade';
import { PublicacaoDetalhes } from './pages/publicacao-detalhes/publicacao-detalhes';
import { AdminLivros } from './pages/admin/admin-livros/admin-livros';
import { AdminEstoque } from './pages/admin/admin-estoque/admin-estoque';
import { AdminPedidos } from './pages/admin/admin-pedidos/admin-pedidos';
import { adminGuard } from './guards/admin-guard';
import { AdminOfertas } from './pages/admin/admin-ofertas/admin-ofertas';
import { AdminReformas } from './pages/admin/admin-reformas/admin-reformas';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'cadastro', component: Cadastro },
  { path: 'loja', component: Loja },
  { path: 'livro/:id', component: LivroDetalhes },
  { path: 'carrinho', component: Carrinho },
  { path: 'checkout', component: Checkout },
  { path: 'meus-enderecos', component: MeusEnderecos },
  { path: 'pedido/sucesso', component: PedidoSucesso },
  { path: 'pedido/falha', component: PedidoFalha },
  { path: 'meus-pedidos', component: MeusPedidos },
  { path: 'vender-livro', component: OfertarLivro },
  { path: 'solicitar-reforma', component: SolicitarReforma },
  { path: 'minha-conta', component: MinhaConta },
  { path: 'comunidade', component: Comunidade },
  { path: 'publicacao/:id', component: PublicacaoDetalhes },
  { path: 'comunidade', component: Comunidade },
  { path: 'publicacao/:id', component: PublicacaoDetalhes },

{ path: 'admin/livros', component: AdminLivros, canActivate: [adminGuard] },
  { path: 'admin/estoque', component: AdminEstoque, canActivate: [adminGuard] },
  { path: 'admin/pedidos', component: AdminPedidos, canActivate: [adminGuard] },
  { path: 'admin/pedidos', component: AdminPedidos, canActivate: [adminGuard] },
  { path: 'admin/ofertas', component: AdminOfertas, canActivate: [adminGuard] },
  { path: 'admin/reformas', component: AdminReformas, canActivate: [adminGuard] }
];