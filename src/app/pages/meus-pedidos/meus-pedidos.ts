import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../services/pedido.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-meus-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './meus-pedidos.html',
  styleUrls: ['./meus-pedidos.scss']
})
export class MeusPedidos implements OnInit {

  pedidos: any[] = [];
  loading: boolean = true;

  constructor(private pedidoService: PedidoService) { }

  ngOnInit(): void {
    this.pedidoService.getMeusPedidos().subscribe({
      next: (response: any) => {
        this.pedidos = response;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erro ao buscar pedidos:', err);
        this.loading = false;
      }
    });
  }
}