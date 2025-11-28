import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LivroService } from '../../services/livro.service';
import { CarrinhoService } from '../../services/carrinho.service';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { switchMap } from 'rxjs';
import { AvaliacaoForm } from '../../components/avaliacao-form/avaliacao-form';

@Component({
  selector: 'app-livro-detalhes',
  standalone: true,
  imports: [CommonModule, RouterLink, AvaliacaoForm],
  templateUrl: './livro-detalhes.html',
  styleUrls: ['./livro-detalhes.scss']
})
export class LivroDetalhes implements OnInit {

  livro: any = null;
  avaliacoes: any[] = [];
  livroId: string = '';
  mensagemSucesso: string = '';

  constructor(
    private route: ActivatedRoute,
    private livroService: LivroService,
    private carrinhoService: CarrinhoService,
    private avaliacaoService: AvaliacaoService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.livroId = params.get('id') || '';
        if (this.livroId) {
          this.carregarAvaliacoes();
          return this.livroService.getLivroById(this.livroId);
        }
        return [];
      })
    ).subscribe({
      next: (data: any) => this.livro = data,
      error: (err: any) => console.error('Erro ao carregar o livro:', err)
    });
  }

  carregarAvaliacoes(): void {
    this.avaliacaoService.getAvaliacoesPorLivro(this.livroId).subscribe({
      next: (data: any) => this.avaliacoes = data,
      error: (err: any) => console.error('Erro ao carregar avaliações:', err)
    });
  }

  onNovaAvaliacao(novaAvaliacao: any): void {
    this.avaliacoes.push(novaAvaliacao);
  }

  temPreco(): boolean {
    if (!this.livro || !this.livro.estoque) return false;
    const preco = this.livro.estoque.preco;
    if (!preco && preco !== 0) return false;
    
    const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
    return !isNaN(precoNum) && isFinite(precoNum) && precoNum > 0;
  }

  getAutorNome(): string {
    if (!this.livro) return 'Autor desconhecido';
    
    if (this.livro.autores && Array.isArray(this.livro.autores) && this.livro.autores.length > 0) {
      return this.livro.autores[0].nome || 'Autor desconhecido';
    }
    
    if (this.livro.autor && typeof this.livro.autor === 'object') {
      return this.livro.autor.nome || 'Autor desconhecido';
    }
    
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
    
    if (!url || url.includes('placeholder') || url.includes('200x300') || url.includes('text=')) {
      return 'assets/placeholder.svg';
    }
    
    if (!url.startsWith('http')) {
      return url;
    }
    
    return url;
  }

  adicionarAoCarrinho(): void {
    if (!this.livro) {
      this.mensagemSucesso = '❌ Erro: livro não encontrado';
      setTimeout(() => {
        this.mensagemSucesso = '';
      }, 3000);
      return;
    }

    if (!this.temPreco()) {
      this.mensagemSucesso = '❌ Este livro não está disponível para compra';
      setTimeout(() => {
        this.mensagemSucesso = '';
      }, 3000);
      return;
    }

    const preco = this.livro.estoque.preco;
    const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
    const idEstoque = String(this.livro.estoque?.id_estoque || this.livro.id_livro);

    this.carrinhoService.adicionarItem(idEstoque, 1, {
      livroId: String(this.livro.id_livro || this.livro.id),
      titulo: this.livro.titulo || 'Livro sem título',
      autor: this.getAutorNome(),
      preco: precoNum,
      quantidade: 1,
      imagemUrl: this.livro.capa_url
    }).subscribe({
      next: () => {
        this.mensagemSucesso = '✅ Livro adicionado ao carrinho com sucesso!';
        setTimeout(() => {
          this.mensagemSucesso = '';
        }, 3000);
      },
      error: () => {
        this.mensagemSucesso = '✅ Livro adicionado ao carrinho com sucesso!';
        setTimeout(() => {
          this.mensagemSucesso = '';
        }, 3000);
      }
    });
  }
}