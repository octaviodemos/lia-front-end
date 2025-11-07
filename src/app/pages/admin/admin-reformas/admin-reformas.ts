import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReformaService } from '../../../services/reforma.service';

@Component({
  selector: 'app-admin-reformas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-reformas.html',
  styleUrls: ['./admin-reformas.scss']
})
export class AdminReformas implements OnInit {

  solicitacoes: any[] = [];
  statusOptions: string[] = ['pendente', 'aceita', 'recusada', 'em_andamento', 'concluida'];

  constructor(private reformaService: ReformaService) { }

  ngOnInit(): void {
    this.carregarSolicitacoes();
  }

  carregarSolicitacoes(): void {
    this.reformaService.getAllSolicitacoes().subscribe({
      next: (data: any) => this.solicitacoes = data,
      error: (err: any) => console.error('Erro ao carregar solicitações', err)
    });
  }

  onStatusChange(event: any, solicitacaoId: string): void {
    const novoStatus = event.target.value;
    this.reformaService.responderSolicitacao(solicitacaoId, novoStatus).subscribe({
      next: (response: any) => {
        console.log('Status atualizado!', response);
        this.carregarSolicitacoes();
      },
      error: (err: any) => console.error('Erro ao atualizar status', err)
    });
  }
}