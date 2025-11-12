import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LivroService } from '../../services/livro.service';
import { LivroCard } from '../../components/livro-card/livro-card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LivroCard, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {
  
  livros: any[] = [];

  constructor(private livroService: LivroService) {}

  ngOnInit(): void {
    this.livroService.getLivros().subscribe({
      next: (data: any) => {
        this.livros = data.slice(0, 6);
      },
      error: (err: any) => console.error('Erro ao carregar livros para home', err)
    });
  }
}