import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarrinhoService } from '../../services/carrinho.service';

@Component({
  selector: 'app-livro-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './livro-card.html',
  styleUrls: ['./livro-card.scss']
})
export class LivroCard {
  @Input() livro: any;
  mensagemSucesso: string = '';
  mostrarMensagem: boolean = false;

  constructor(private carrinhoService: CarrinhoService) {}

  temPreco(): boolean {
    if (!this.livro) return false;
    const preco = this.livro.estoque?.preco;
    if (!preco && preco !== 0) return false;
    
    // Converte para número
    const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
    
    // Verifica se é número válido e maior que 0
    return !isNaN(precoNum) && isFinite(precoNum) && precoNum > 0;
  }

  getPrecoFormatado(): string {
    if (!this.livro || !this.livro.estoque?.preco) return '0,00';
    const preco = this.livro.estoque.preco;
    const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
    return precoNum.toFixed(2).replace('.', ',');
  }

  getAutorNome(): string {
    if (!this.livro) return 'Autor desconhecido';
    
    // Se tem array de autores
    if (this.livro.autores && Array.isArray(this.livro.autores) && this.livro.autores.length > 0) {
      return this.livro.autores[0].nome || 'Autor desconhecido';
    }
    
    // Se tem objeto autor
    if (this.livro.autor && typeof this.livro.autor === 'object') {
      return this.livro.autor.nome || 'Autor desconhecido';
    }
    
    // Se é string
    if (this.livro.autor && typeof this.livro.autor === 'string') {
      return this.livro.autor;
    }
    
    return 'Autor desconhecido';
  }

  getImagemUrl(): string {
    if (!this.livro) {
      return 'assets/placeholder.svg';
    }
    
    const url = this.livro.capa_url;
    
    // Se não tem URL ou é inválida (bloqueia placeholders)
    if (!url || url.includes('placeholder') || url.includes('200x300') || url.includes('text=')) {
      return 'assets/placeholder.svg';
    }
    
    // Se a URL não começa com http/https, assume que é relativa
    if (!url.startsWith('http')) {
      return url;
    }
    
    return url;
  }

  adicionarAoCarrinho(): void {
    if (!this.livro || !this.temPreco()) {
      this.mensagemSucesso = '❌ Este livro não está disponível para compra';
      this.mostrarMensagem = true;
      setTimeout(() => {
        this.mostrarMensagem = false;
      }, 2000);
      return;
    }

    const preco = this.livro.estoque.preco;
    const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
    const idEstoque = Number(this.livro.estoque?.id_estoque || this.livro.id_livro);

    this.carrinhoService.adicionarItem(idEstoque, 1, {
      livroId: String(this.livro.id_livro || this.livro.id),
      titulo: this.livro.titulo || 'Livro sem título',
      autor: this.getAutorNome(),
      preco: precoNum,
      quantidade: 1,
      imagemUrl: this.livro.capa_url
    }).subscribe({
      next: () => {
        this.mensagemSucesso = '✅ Adicionado ao carrinho!';
        this.mostrarMensagem = true;
        setTimeout(() => {
          this.mostrarMensagem = false;
        }, 2000);
      },
      error: () => {
        this.mensagemSucesso = '✅ Adicionado ao carrinho!';
        this.mostrarMensagem = true;
        setTimeout(() => {
          this.mostrarMensagem = false;
        }, 2000);
      }
    });
  }
}