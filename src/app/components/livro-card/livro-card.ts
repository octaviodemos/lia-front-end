import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarrinhoService } from '../../services/carrinho.service';
import { getImagemUrl as resolverUrlImagemLivro, temPreco as temPrecoLivro } from '../../utils/livro-utils';

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
    return temPrecoLivro(this.livro);
  }

  private getEstoqueParaExibicao(): any {
    if (!this.livro) return null;
    if (Array.isArray(this.livro.estoques) && this.livro.estoques.length) {
      const d = this.livro.estoques.find((x: any) => x.disponivel);
      return d || this.livro.estoques[0];
    }
    return this.livro.estoque;
  }

  getPrecoFormatado(): string {
    const e = this.getEstoqueParaExibicao();
    if (!e) return '0,00';
    const raw = e.preco;
    if (raw == null || raw === '') return '0,00';
    const precoNum = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(precoNum)) return '0,00';
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
    return resolverUrlImagemLivro(this.livro);
  }

  getNotaConservacao(): number | null {
    if (!this.livro) return null;
    const bruto = this.livro.nota_conservacao;
    const n = typeof bruto === 'string' ? parseFloat(bruto) : Number(bruto);
    if (!Number.isFinite(n)) return null;
    const arredondada = Math.round(n);
    if (arredondada < 1 || arredondada > 5) return null;
    return arredondada;
  }

  exibeBadgeConservacao(): boolean {
    return this.getNotaConservacao() !== null;
  }

  getTotalExemplaresMesmoIsbn(): number {
    if (!this.livro) return 1;
    const n = this.livro.exemplares_mesmo_isbn;
    if (typeof n === 'number' && Number.isFinite(n) && n >= 1) return Math.floor(n);
    const arr = this.livro.outras_opcoes;
    if (Array.isArray(arr) && arr.length) return arr.length + 1;
    return 1;
  }

  exibeSeloVariosExemplaresIsbn(): boolean {
    return this.getTotalExemplaresMesmoIsbn() > 1;
  }

  getTituloSeloVariosExemplares(): string {
    const t = this.getTotalExemplaresMesmoIsbn();
    return `Mesmo ISBN: ${t} exemplares na loja. Abra a página para ver preços e estados.`;
  }

  private getNotaMediaAvaliacoesNumero(): number | null {
    if (!this.livro) return null;
    const v = this.livro.nota_media_avaliacoes;
    if (v === null || v === undefined || v === '') return null;
    const num = typeof v === 'string' ? parseFloat(v) : Number(v);
    if (!Number.isFinite(num)) return null;
    return Math.min(5, Math.max(0, Math.round(num * 10) / 10));
  }

  private getTotalAvaliacoesNumero(): number {
    if (!this.livro) return 0;
    const t = this.livro.total_avaliacoes;
    const n = typeof t === 'number' ? t : parseInt(String(t ?? '').trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  exibeNotaComunidade(): boolean {
    return this.getNotaMediaAvaliacoesNumero() !== null || this.getTotalAvaliacoesNumero() > 0;
  }

  getNotaMediaComunidadeTexto(): string {
    const m = this.getNotaMediaAvaliacoesNumero();
    const t = this.getTotalAvaliacoesNumero();
    if (m !== null) {
      const s = m.toFixed(1).replace('.', ',');
      return `${s} (${t})`;
    }
    return String(t);
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

    const e = this.getEstoqueParaExibicao();
    if (!e) {
      this.mensagemSucesso = '❌ Este livro não está disponível para compra';
      this.mostrarMensagem = true;
      setTimeout(() => {
        this.mostrarMensagem = false;
      }, 2000);
      return;
    }
    const indisponivel =
      e.disponivel === false || e.disponivel === 0 || e.disponivel === 'false';
    if (indisponivel) {
      this.mensagemSucesso = '❌ Este livro não está disponível para compra';
      this.mostrarMensagem = true;
      setTimeout(() => {
        this.mostrarMensagem = false;
      }, 2000);
      return;
    }

    const preco = e.preco;
    const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
    const rawId = e.id_estoque;
    const idEstoque =
      rawId != null && rawId !== '' ? Number(rawId) : Number.NaN;
    if (!Number.isFinite(idEstoque) || idEstoque < 1) {
      this.mensagemSucesso = '❌ Este livro não está disponível para compra';
      this.mostrarMensagem = true;
      setTimeout(() => {
        this.mostrarMensagem = false;
      }, 2000);
      return;
    }

    this.carrinhoService.adicionarItem(idEstoque, {
      livroId: String(this.livro.id_livro || this.livro.id),
      titulo: this.livro.titulo || 'Livro sem título',
      autor: this.getAutorNome(),
      preco: precoNum,
      imagemUrl: this.getImagemUrl()
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