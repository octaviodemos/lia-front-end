import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ItemPagamento {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  description: string;
}

export interface DadosPagamento {
  email: string;
  name: string;
  cpf: string;
  items?: ItemPagamento[];
  order_id?: string;
}

export interface RespostaPagamento {
  success: boolean;
  message: string;
  data: {
    id: string;
    init_point: string;
    sandbox_init_point: string;
    status: string;
  };
}

export interface StatusPagamento {
  order_id: string;
  payment_id?: string;
  status: string;
  payment_method?: string;
  amount?: number;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagamentoService {
  private apiUrl = 'http://localhost:3333/api';

  constructor(private http: HttpClient) { }

  /**
   * Criar pagamento com itens específicos
   */
  criarPagamento(dados: DadosPagamento): Observable<RespostaPagamento> {
    return this.http.post<RespostaPagamento>(`${this.apiUrl}/payments/create`, dados);
  }

  /**
   * Criar pagamento a partir do carrinho atual
   * Para evitar conflitos, use criarPagamentoLimpo() em vez deste método
   */
  criarPagamentoDoCarrinho(dadosComprador: { name: string; cpf: string; surname?: string }): Observable<RespostaPagamento> {
    return this.http.post<RespostaPagamento>(`${this.apiUrl}/payments/create-from-cart`, dadosComprador);
  }

  /**
   * Verificar informações de um pagamento
   */
  obterInfoPagamento(paymentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments/info/${paymentId}`);
  }

  /**
   * Verificar status de um pedido
   */
  obterStatusPedido(orderId: string): Observable<StatusPagamento> {
    return this.http.get<StatusPagamento>(`${this.apiUrl}/payments/status/${orderId}`);
  }

  /**
   * Método legado (manter compatibilidade)
   */
  criarPreferenciaPagamento(enderecoId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/pagamentos/criar-preferencia`, { enderecoId });
  }

  /**
   * Validar CPF (básico)
   */
  validarCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false; // Números iguais
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digito1 = 11 - (soma % 11);
    if (digito1 > 9) digito1 = 0;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    let digito2 = 11 - (soma % 11);
    if (digito2 > 9) digito2 = 0;
    
    return digito1 === parseInt(cpf.charAt(9)) && digito2 === parseInt(cpf.charAt(10));
  }

  /**
   * Formatar CPF
   */
  formatarCPF(cpf: string): string {
    cpf = cpf.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Limpar formatação do CPF
   */
  limparCPF(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  // NOTE: Funções de limpeza de dados de provedores legados foram removidas.

  /**
   * Criar pagamento do carrinho com limpeza de dados
   */
  criarPagamentoLimpo(dadosComprador: { name: string; cpf: string; surname?: string }): Observable<RespostaPagamento> {
    // Mantido por compatibilidade com implementações antigas — encaminha para criar a partir do carrinho
    return this.criarPagamentoDoCarrinho(dadosComprador);
  }

  /**
   * Criar uma sessão de checkout na Stripe (backend deve retornar URL de redirecionamento)
   */
  criarCheckoutStripe(dadosComprador: { userId?: any; name?: string; cpf?: string; email?: string; surname?: string }): Observable<any> {
    // Cria sessão de checkout no backend (Stripe)
    // Backend exige `userId` e `email` (verificar contrato do endpoint)
    return this.http.post<any>(`${this.apiUrl}/payments/create-checkout`, dadosComprador);
  }

  /**
   * Obter informação de uma sessão Stripe criada (usada após redirecionamento de sucesso)
   */
  obterSessaoStripe(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payments/session/${encodeURIComponent(sessionId)}`);
  }

 
}