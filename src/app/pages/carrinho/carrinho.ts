import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-carrinho',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrinho.html',
  styleUrls: ['./carrinho.scss']
})
export class Carrinho implements OnInit {
  
  cart: any = null;

  constructor(private cartService: CartService) { }

  ngOnInit(): void {
    this.cartService.getCart().subscribe({
      next: (response: any) => {
        this.cart = response;
        console.log('Carrinho:', this.cart);
      },
      error: (err: any) => {
        console.error('Erro ao buscar carrinho:', err);
      }
    });
  }
}