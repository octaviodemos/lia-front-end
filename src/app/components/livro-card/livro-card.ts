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

  adicionarAoCarrinho(): void {
    if (this.livro) {
      // Adiciona ao carrinho
      this.carrinhoService.adicionarItem({
        livroId: String(this.livro.id_livro || this.livro.id),
        titulo: this.livro.titulo || 'Livro sem título',
        autor: this.livro.autor?.nome || this.livro.autor || 'Autor desconhecido',
        preco: parseFloat(this.livro.estoque?.preco) || 0,
        quantidade: 1,
        imagemUrl: this.livro.capa_url
      });
      
      // Mostra mensagem de sucesso
      this.mensagemSucesso = '✅ Adicionado ao carrinho!';
      this.mostrarMensagem = true;
      
      // Esconde mensagem após 2 segundos
      setTimeout(() => {
        this.mostrarMensagem = false;
      }, 2000);
    }
  }
}