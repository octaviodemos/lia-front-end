import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OfertaVendaService } from '../../services/oferta-venda.service';
import { ReformaService } from '../../services/reforma.service';

@Component({
  selector: 'app-minha-conta',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './minha-conta.html',
  styleUrls: ['./minha-conta.scss']
})
export class MinhaConta implements OnInit {

  ofertas: any[] = [];
  solicitacoes: any[] = [];

  constructor(
    private ofertaVendaService: OfertaVendaService,
    private reformaService: ReformaService
  ) {}

  ngOnInit(): void {
    this.ofertaVendaService.getMinhasOfertas().subscribe({
      next: (data: any) => this.ofertas = data,
      error: (err: any) => console.error('Erro ao buscar ofertas', err)
    });

    this.reformaService.getMinhasSolicitacoes().subscribe({
      next: (data: any) => this.solicitacoes = data,
      error: (err: any) => console.error('Erro ao buscar solicitações', err)
    });
  }
}