import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LivroService } from '../../services/livro.service';
import { LivroCard } from '../../components/livro-card/livro-card';

@Component({
  selector: 'app-loja',
  standalone: true,
  imports: [CommonModule, LivroCard],
  templateUrl: './loja.html',
  styleUrls: ['./loja.scss']
})
export class Loja implements OnInit {

  livros: any[] = [];

  constructor(private livroService: LivroService) { }

  ngOnInit(): void {
    this.carregarLivros();
  }

  carregarLivros(): void {
    this.livroService.getLivros().subscribe({
      next: (response: any) => {
        this.livros = response;
        console.log('📚 Total de livros:', this.livros.length);
        
        // Log detalhado de TODOS os livros
        this.livros.forEach((livro, index) => {
          console.log(`\n📖 Livro ${index + 1}:`, {
            titulo: livro.titulo,
            estoque: livro.estoque,
            preco: livro.estoque?.preco,
            tipo_preco: typeof livro.estoque?.preco
          });
        });
      },
      error: (err: any) => {
        console.error('❌ Erro ao carregar livros:', err);
      }
    });
  }

  testarAPI(): void {
    fetch('http://localhost:3333/api/books')
      .then(res => res.json())
      .then(data => {
        console.log('\n🔥 RESPOSTA DIRETA DA API (SEM NORMALIZAÇÃO):');
        console.log('Total:', data.length);
        data.slice(0, 3).forEach((livro: any, i: number) => {
          console.log(`\n📦 Livro ${i + 1} RAW:`, {
            titulo: livro.titulo,
            preco: livro.preco,
            estoque: livro.estoque,
            id_estoque: livro.id_estoque
          });
        });
      })
      .catch(err => console.error('❌ Erro no fetch:', err));
  }
}