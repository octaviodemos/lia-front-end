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

  adicionarAoCarrinho(): void {
    if (this.livro) {
      this.carrinhoService.adicionarItem({
        livroId: String(this.livro.id_livro || this.livro.id),
        titulo: this.livro.titulo || 'Livro sem título',
        autor: this.livro.autor?.nome || this.livro.autor || 'Autor desconhecido',
        preco: parseFloat(this.livro.estoque?.preco) || 0,
        quantidade: 1,
        imagemUrl: this.livro.capa_url
      });
      this.mensagemSucesso = '✅ Livro adicionado ao carrinho com sucesso!';
      
      // Limpa a mensagem após 3 segundos
      setTimeout(() => {
        this.mensagemSucesso = '';
      }, 3000);
    } else {
      this.mensagemSucesso = '❌ Erro: livro não encontrado';
      setTimeout(() => {
        this.mensagemSucesso = '';
      }, 3000);
    }
  }
}