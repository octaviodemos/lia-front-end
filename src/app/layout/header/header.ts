import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
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
  isAdminMenuOpen: boolean = false;
  isUserMenuOpen: boolean = false;
  cartItemCount: number = 0;
  isLoggedIn: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private carrinhoService: CarrinhoService,
    private authService: AuthService,
    private router: Router
  ) {
    // Inicializa o estado de login
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  ngOnInit(): void {
    this.observarCarrinho();
    this.observarLogin();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.isAdminMenuOpen = false;
    this.isUserMenuOpen = false;
  }

  toggleAdminMenu(): void {
    this.isAdminMenuOpen = !this.isAdminMenuOpen;
    this.isDropdownOpen = false;
    this.isUserMenuOpen = false;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isDropdownOpen = false;
    this.isAdminMenuOpen = false;
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
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
   * Observa mudanças no estado de login
   */
  private observarLogin(): void {
    this.authService.loggedIn$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loggedIn: boolean) => {
        this.isLoggedIn = loggedIn;
      });
  }

  getUserName(): string {
    const user = this.authService.getUser();
    return user?.nome || 'Usuário';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  /**
   * Fecha dropdown ao clicar fora
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.dropdown');
    
    if (!clickedInside) {
      this.isDropdownOpen = false;
      this.isAdminMenuOpen = false;
      this.isUserMenuOpen = false;
    }
  }
}