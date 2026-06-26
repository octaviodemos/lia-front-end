import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { CarrinhoService } from '../../services/carrinho.service';
import { EnderecoService } from '../../services/endereco.service';
import { PedidoService } from '../../services/pedido.service';
import { PagamentoService } from '../../services/pagamento.service';
import { AuthService } from '../../services/auth';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import flatpickr from 'flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt.js';

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

  private _datePickerRef!: ElementRef;
  @ViewChild('datePickerRef') set datePickerRef(el: ElementRef) {
    this._datePickerRef = el;
    if (el && el.nativeElement) {
      setTimeout(() => {
        if (this.flatpickrInstance) {
          this.flatpickrInstance.destroy();
        }
        this.flatpickrInstance = flatpickr(el.nativeElement, {
          dateFormat: 'd/m/Y',
          allowInput: true,
          locale: Portuguese,
          maxDate: new Date() // Não pode ter nascido no futuro
        });
      }, 0);
    }
  }
  
  private flatpickrInstance: any;

  constructor(
    private cartService: CarrinhoService,
    private enderecoService: EnderecoService,
    private pedidoService: PedidoService,
    private pagamentoService: PagamentoService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.carregarDados();

    this.route.queryParamMap.subscribe((params) => {
      const enderecoId = Number(params.get('enderecoId'));
      if (enderecoId > 0) {
        this.enderecoSelecionadoId = enderecoId;
        this.etapaAtual = 1;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.destroy();
    }
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
          preco_unitario: i.preco || i.price || i.valor || i.preco_unitario || 0
        }));
        
        const total = mappedItems.reduce((s, it) => 
          s + it.preco_unitario, 0
        );
        
        this.cart = { items: mappedItems, total };
      },
      error: (err: any) => console.error('Erro ao buscar carrinho', err)
    });

    this.cartService.refreshCarrinho().subscribe({ next: () => {}, error: () => {} });

    this.enderecoService.getEnderecos().subscribe({
      next: (response: any) => {
        this.enderecos = response;
        if (this.enderecoSelecionadoId > 0) {
          const existe = this.enderecos.some((e) => e.id_endereco === this.enderecoSelecionadoId);
          if (!existe) {
            this.enderecoSelecionadoId = 0;
          }
        }
      },
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

    const dadosComprador: any = {
      name: this.checkoutForm.get('name')?.value,
      email: this.checkoutForm.get('email')?.value,
      cpf: this.pagamentoService.limparCPF(this.checkoutForm.get('cpf')?.value),
      surname: 'TEST'
    };

    this.cartService.garantirCarrinhoNoServidor().pipe(
      switchMap(() => this.pagamentoService.criarCheckoutStripe(dadosComprador))
    ).subscribe({
      next: (response) => {
        const url = response?.url || response?.data?.url || response?.data?.checkout_url;
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
          alert('Redirecionando para Stripe Checkout...');
        } else {
          alert('Resposta inválida do servidor ao criar checkout.');
          this.processandoPagamento = false;
        }
      },
      error: (err) => {
        console.error('❌ Erro ao criar sessão de checkout:', err);
        try {
          console.error('❌ Erro body:', err?.error);
        } catch (e) { /* ignore */ }

        const status = err?.status;
        const serverMsg = (err?.error?.error || err?.error?.message || err?.message || '').toString().toLowerCase();

        if (status === 400 && serverMsg.includes('carrinho')) {
          alert('Seu carrinho não está sincronizado no servidor. Volte ao carrinho e tente novamente.');
          this.router.navigate(['/carrinho']);
        } else {
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
        // pedido confirmado (resposta do servidor)
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
    
    let nascimento: Date;
    
    // Tratando formato d/m/Y (que vem da máscara ou flatpickr)
    if (typeof dataNascimento === 'string' && dataNascimento.includes('/')) {
      const partes = dataNascimento.split('/');
      if (partes.length === 3) {
        // dd/MM/yyyy
        nascimento = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
      } else {
        return { dataInvalida: true };
      }
    } else {
      nascimento = new Date(dataNascimento);
    }
    
    if (isNaN(nascimento.getTime())) return { dataInvalida: true };

    const anoNascimento = nascimento.getFullYear();
    if (anoNascimento < 1900) {
      return { anoInvalido: true };
    }

    const hoje = new Date();
    const idade = hoje.getFullYear() - anoNascimento;
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