import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LivroService } from '../../services/livro.service';
import { CarrinhoService } from '../../services/carrinho.service';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { switchMap } from 'rxjs';
import { getGeneroLabel as getGeneroLabelFn, getImagemUrl as getImagemUrlFn, getAutorNome as getAutorNomeFn, temPreco as temPrecoFn } from '../../utils/livro-utils';
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
    return temPrecoFn(this.livro);
  }

  getAutorNome(): string {
    return getAutorNomeFn(this.livro);
  }

  getGeneroLabel(): string {
    return getGeneroLabelFn(this.livro);
  }

  getImagemUrl(): string {
    return getImagemUrlFn(this.livro);
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