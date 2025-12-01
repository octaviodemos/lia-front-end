import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { CarrinhoService } from '../../services/carrinho.service';
import { EnderecoService } from '../../services/endereco.service';
import { PedidoService } from '../../services/pedido.service';
import { PagamentoService } from '../../services/pagamento.service';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class Checkout implements OnInit {

  cart: any = null;
  enderecos: any[] = [];
  enderecoSelecionadoId: number = 0;
  loading: boolean = false;
  checkoutForm!: FormGroup;
  processandoPagamento = false;
  etapaAtual = 1; // 1: Endereço, 2: Dados do Cliente, 3: Pagamento

  constructor(
    private cartService: CarrinhoService,
    private enderecoService: EnderecoService,
    private pedidoService: PedidoService,
    private pagamentoService: PagamentoService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.carregarDados();
  }

  private inicializarFormulario(): void {
    const user = this.authService.getUser();
    
    this.checkoutForm = this.fb.group({
      name: [user?.nome || '', [Validators.required, Validators.minLength(2)]],
      email: [user?.email || '', [Validators.required, Validators.email]],
      cpf: ['', [Validators.required, this.cpfValidator.bind(this)]],
      telefone: ['', [Validators.required, this.telefoneValidator.bind(this)]],
      dataNascimento: ['', [Validators.required, this.idadeValidator.bind(this)]]
    });
  }

  private carregarDados(): void {
    // "Assina" o estado local do carrinho e calcula uma estrutura compatível com o template
    this.cartService.getCarrinho().subscribe({
      next: (items: any[]) => {
        const mappedItems = items.map(i => ({
          livro: { titulo: i.titulo || i.title || i.nome },
          quantidade: i.quantidade || i.quantity || 1,
          preco_unitario: i.preco || i.price || i.valor || i.preco_unitario || 0
        }));
        
        const total = mappedItems.reduce((s, it) => 
          s + (it.preco_unitario * it.quantidade), 0
        );
        
        console.log(`💰 Checkout - Total: R$ ${total.toFixed(2)} | ${mappedItems.length} itens`);
        this.cart = { items: mappedItems, total };
      },
      error: (err: any) => console.error('Erro ao buscar carrinho', err)
    });

    // Tenta sincronizar com o back-end (sem efeito quando não autenticado)
    this.cartService.refreshCarrinho().subscribe({ next: () => {}, error: () => {} });

    this.enderecoService.getEnderecos().subscribe({
      next: (response: any) => this.enderecos = response,
      error: (err: any) => console.error('Erro ao buscar endereços', err)
    });
  }

  selecionarEndereco(id: number): void {
    this.enderecoSelecionadoId = id;
  }

  proximaEtapa(): void {
    if (this.etapaAtual === 1) {
      if (!this.enderecoSelecionadoId) {
        alert('Por favor, selecione um endereço de entrega.');
        return;
      }
      this.etapaAtual = 2;
    } else if (this.etapaAtual === 2) {
      if (this.checkoutForm.valid) {
        this.etapaAtual = 3;
      } else {
        alert('Por favor, preencha todos os dados corretamente.');
        this.checkoutForm.markAllAsTouched();
      }
    }
  }

  voltarEtapa(): void {
    if (this.etapaAtual > 1) {
      this.etapaAtual--;
    }
  }

  finalizarCompra(): void {
    if (!this.checkoutForm.valid) {
      alert('Por favor, preencha todos os dados corretamente.');
      return;
    }

    this.processandoPagamento = true;
    
    // Dados conforme esperado pelo backend (CreatePaymentFromCartDto)
    const isAuth = this.authService.isAuthenticated();

    // If user is not authenticated, require login before creating checkout
    if (!isAuth) {
      this.processandoPagamento = false;
      alert('Você precisa entrar na sua conta para finalizar a compra.');
      // Redirect to login; preserve return URL so user can continue checkout after login
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    const user = this.authService.getUser();

    // Build buyer payload. Backend expects userId and email (server-side validation).
    const dadosComprador: any = {
      name: this.checkoutForm.get('name')?.value,
      email: this.checkoutForm.get('email')?.value,
      cpf: this.pagamentoService.limparCPF(this.checkoutForm.get('cpf')?.value),
      surname: 'TEST' // Campo opcional, pode usar sobrenome se tiver no form
    };

    // Prefer common id fields used by different backends
    const userId = user?.id || user?._id || user?.userId || user?.user_id || user?.id_usuario || null;
    if (userId) dadosComprador.userId = userId;

    // Não enviar `frontend_total` ou `frontend_items` — backend é a fonte da verdade
    console.log('📋 Dados do comprador sendo enviados (sem frontend totals/items):', dadosComprador);
    console.log('📄 CPF limpo:', dadosComprador.cpf);
    console.log('👤 Nome completo:', dadosComprador.name, dadosComprador.surname);

    // Logs de depuração adicional: mostrar itens e total calculados localmente
    if (dadosComprador.frontend_items) {
      console.log('🧾 Itens calculados (frontend):', dadosComprador.frontend_items);
      const soma = dadosComprador.frontend_items.reduce((s: number, it: any) => s + (Number(it.unit_price) * Number(it.quantity)), 0);
      console.log('Σ frontend_items (soma):', soma.toFixed(2));
    }
    if (dadosComprador.frontend_total != null) {
      console.log('🏷️ frontend_total enviado:', Number(dadosComprador.frontend_total).toFixed(2));
    }

    // Criar sessão de checkout via Stripe (backend: espera userId e email)
    // Criar sessão de checkout via Stripe (backend: autentica via JWT; não envie userId)
    this.pagamentoService.criarCheckoutStripe(dadosComprador).subscribe({
      next: (response) => {
        console.log('💳 Resposta do create-checkout:', response);
        // Suporte a múltiplos formatos de resposta do backend
        const url = response?.url || response?.data?.url || response?.data?.checkout_url;
        if (url) {
          console.log('🔗 Redirecionando para Stripe Checkout:', url);
          // Abrir em nova aba para isolar contexto (pode usar mesmo aba se preferir)
          window.open(url, '_blank', 'noopener,noreferrer');
          alert('Redirecionando para Stripe Checkout...');
        } else {
          alert('Resposta inválida do servidor ao criar checkout.');
          this.processandoPagamento = false;
        }
      },
      error: (err) => {
        console.error('❌ Erro ao criar sessão de checkout:', err);
        // Logar corpo de erro retornado pelo servidor (útil para debug 500)
        try {
          console.error('❌ Erro body:', err?.error);
        } catch (e) { /* ignore */ }

        const status = err?.status;
        const serverMsg = (err?.error?.error || err?.error?.message || err?.message || '').toString().toLowerCase();

        // Caso: carrinho não encontrado no servidor -> redireciona para /carrinho e tenta sincronizar
        if (status === 400 && serverMsg.includes('carrinho')) {
          try {
            alert('Seu carrinho não está sincronizado no servidor. Você será redirecionado para o carrinho para atualizá-lo.');
          } catch (e) { /* ignore */ }

          // Navega para a página do carrinho e força uma sincronização
          this.router.navigate(['/carrinho']).then(() => {
            this.cartService.refreshCarrinho().subscribe({
              next: () => {
                console.log('Carrinho sincronizado após erro 400; o usuário pode tentar novamente o pagamento.');
              },
              error: (e) => console.error('Falha ao sincronizar carrinho após redirecionamento:', e)
            });
          });

        } else {
          // Erro genérico
          alert('Erro ao processar pagamento. Tente novamente mais tarde.');
        }

        this.processandoPagamento = false;
      }
    });
  }

  // Método legado para compatibilidade
  finalizarCompraLegado(): void {
    if (!this.enderecoSelecionadoId) {
      alert('Por favor, selecione um endereço de entrega.');
      return;
    }
    this.loading = true;

    this.pedidoService.confirmarPedido(this.enderecoSelecionadoId, 'cartao_credito').subscribe({
      next: (response: any) => {
        console.log('Pedido confirmado:', response);
        if (response && response.success) {
          this.router.navigate(['/pedido/sucesso']);
        } else {
          this.router.navigate(['/pedido/falha']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erro ao confirmar pedido:', err);
        this.router.navigate(['/pedido/falha']);
        this.loading = false;
      }
    });
  }

  cpfValidator(control: any) {
    const cpf = control.value;
    if (!cpf) return null;
    return this.pagamentoService.validarCPF(cpf) ? null : { cpfInvalido: true };
  }

  idadeValidator(control: any) {
    const dataNascimento = control.value;
    if (!dataNascimento) return null;
    
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    const idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();
    
    let idadeReal = idade;
    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
      idadeReal--;
    }
    
    return idadeReal >= 16 ? null : { menorIdade: true };
  }

  telefoneValidator(control: any) {
    const telefone = control.value;
    if (!telefone) return null;
    
    // Remove todos os caracteres não numéricos
    const telefoneLimpo = telefone.replace(/\D/g, '');
    
    // Valida se tem 10 dígitos (fixo) ou 11 dígitos (celular)
    if (telefoneLimpo.length !== 10 && telefoneLimpo.length !== 11) {
      return { telefoneInvalido: true };
    }
    
    // Valida código de área (primeiro dois dígitos)
    const codigoArea = telefoneLimpo.substring(0, 2);
    const codigosValidos = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
    
    if (!codigosValidos.includes(codigoArea)) {
      return { codigoAreaInvalido: true };
    }
    
    // Se for celular (11 dígitos), o terceiro dígito deve ser 9
    if (telefoneLimpo.length === 11 && telefoneLimpo[2] !== '9') {
      return { celularInvalido: true };
    }
    
    return null;
  }
}