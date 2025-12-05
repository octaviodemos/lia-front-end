import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-pedido-falha',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pedido-falha.html',
  styleUrl: './pedido-falha.scss'
})
export class PedidoFalha implements OnInit {
  
  paymentId: string | null = null;
  orderId: string | null = null;
  paymentStatus: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Captura parâmetros de retorno do provedor de pagamento Stripe
    this.route.queryParams.subscribe(params => {
      this.paymentId = params['payment_id'] || params['paymentIntent'] || null;
      this.orderId = params['external_reference'] || params['orderId'] || null;
      this.paymentStatus = params['status'] || params['payment_status'] || null;


    });
  }
}
