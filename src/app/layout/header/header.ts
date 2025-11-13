import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CarrinhoService } from '../../services/carrinho.service';
import { ItemCarrinho } from '../../services/carrinho.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header implements OnInit, OnDestroy {

  isDropdownOpen: boolean = false;
  cartItemCount: number = 0;
  private destroy$ = new Subject<void>();

  constructor(private carrinhoService: CarrinhoService) {}

  ngOnInit(): void {
    this.observarCarrinho();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  onSearch(): void {
    // TODO: Implementar lógica de busca
    console.log('Buscando...');
  }

  /**
   * Observa mudanças no carrinho e atualiza o contador
   */
  private observarCarrinho(): void {
    this.carrinhoService.getCarrinho()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (itens: ItemCarrinho[]) => {
          this.cartItemCount = itens.reduce(
            (total: number, item: ItemCarrinho) => total + item.quantidade, 
            0
          );
        },
        error: (err: Error) => {
          console.error('Erro ao observar carrinho:', err);
          this.cartItemCount = 0;
        }
      });
  }

  /**
   * Fecha dropdown ao clicar fora
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.dropdown');
    
    if (!clickedInside && this.isDropdownOpen) {
      this.isDropdownOpen = false;
    }
  }
}