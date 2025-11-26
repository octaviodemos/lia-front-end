import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { CarrinhoService } from '../../services/carrinho.service';
import { ItemCarrinho } from '../../services/carrinho.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header implements OnInit, OnDestroy {

  isDropdownOpen: boolean = false;
  isUserMenuOpen: boolean = false;
  cartItemCount: number = 0;
  isLoggedIn: boolean = false;
  currentUser: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private carrinhoService: CarrinhoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.observarCarrinho();
    this.checkUserState();
    
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkUserState();
      });
    
    // Sincronizar com o backend para obter contagens precisas quando o usuário estiver autenticado
    this.carrinhoService.refreshCarrinho().subscribe({ next: () => {}, error: () => {} });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  checkUserState(): void {
    this.currentUser = this.authService.getUser();
    this.isLoggedIn = !!this.currentUser;
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  logout(): void {
    this.authService.logout();
    this.isLoggedIn = false;
    this.currentUser = null;
    this.isUserMenuOpen = false;
    this.router.navigate(['/']);
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
    const clickedInside = target.closest('.dropdown') || target.closest('.user-menu');
    
    if (!clickedInside) {
      this.isDropdownOpen = false;
      this.isUserMenuOpen = false;
    }
  }
}