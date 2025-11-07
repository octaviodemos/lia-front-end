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
    this.livroService.getLivros().subscribe({
      next: (response: any) => {
        this.livros = response;
        console.log('Livros carregados:', this.livros);
      },
      error: (err: any) => {
        console.error('Erro ao carregar livros:', err);
      }
    });
  }
}