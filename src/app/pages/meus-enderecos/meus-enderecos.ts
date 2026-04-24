import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EnderecoService } from '../../services/endereco.service';
import { EnderecoUtilsService, Estado, Municipio } from '../../services/endereco-utils.service';

@Component({
  selector: 'app-meus-enderecos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './meus-enderecos.html',
  styleUrls: ['./meus-enderecos.scss']
})
export class MeusEnderecos implements OnInit {

  enderecos: any[] = [];
  enderecoForm!: FormGroup;
  estados: Estado[] = [];
  municipios: Municipio[] = [];
  buscandoCep = false;
  carregandoMunicipios = false;

  constructor(
    private fb: FormBuilder,
    private enderecoService: EnderecoService,
    private enderecoUtilsService: EnderecoUtilsService
  ) {}

  ngOnInit(): void {
    this.enderecoForm = this.fb.group({
      rua: ['', Validators.required],
      numero: ['', Validators.required],
      complemento: [''],
      cep: ['', [Validators.required, this.cepValidator.bind(this)]],
      cidade: ['', Validators.required],
      estado: ['', Validators.required],
      bairro: ['']
    });

    this.carregarEnderecos();
    this.carregarEstados();
    
    this.enderecoForm.get('cep')?.valueChanges.subscribe(cep => {
      if (cep && this.enderecoUtilsService.validarCep(cep)) {
        this.buscarEnderecoPorCep(cep);
      }
    });
    
    this.enderecoForm.get('estado')?.valueChanges.subscribe(uf => {
      if (uf) {
        this.carregarMunicipios(uf);
      }
    });
  }

  carregarEnderecos(): void {
    this.enderecoService.getEnderecos().subscribe({
      next: (data: any) => this.enderecos = data,
      error: (err: any) => console.error('Erro ao carregar endereços', err)
    });
  }

  carregarEstados(): void {
    this.enderecoUtilsService.listarEstados().subscribe({
      next: (estados) => this.estados = estados,
      error: (err) => console.error('Erro ao carregar estados', err)
    });
  }

  carregarMunicipios(uf: string): void {
    this.carregandoMunicipios = true;
    this.enderecoUtilsService.listarMunicipios(uf).subscribe({
      next: (municipios) => {
        this.municipios = municipios;
        this.carregandoMunicipios = false;
      },
      error: (err) => {
        console.error('Erro ao carregar municípios', err);
        this.carregandoMunicipios = false;
      }
    });
  }

  buscarEnderecoPorCep(cep: string): void {
    this.buscandoCep = true;
    this.enderecoUtilsService.buscarCep(cep).subscribe({
      next: (endereco) => {
        const localidade = (endereco?.localidade || '').toString().trim();
        const ufBruto = (endereco?.uf || '').toString().trim();
        if (!localidade || !ufBruto) {
          this.buscandoCep = false;
          return;
        }

        const uf = ufBruto.toUpperCase().slice(0, 2);

        this.enderecoForm.patchValue(
          {
            rua: (endereco.logradouro || '').toString(),
            bairro: (endereco.bairro || '').toString()
          },
          { emitEvent: false }
        );

        const avisarCamposLinha = () => {
          const faltas: string[] = [];
          if (!endereco.logradouro) faltas.push('logradouro');
          if (!endereco.bairro) faltas.push('bairro');
          if (faltas.length > 0) {
            this.mostrarAvisoCepIncompleto(faltas);
          }
        };

        const aplicarUfMunicipioECidade = () => {
          if (!this.estados.some((e) => e.sigla === uf)) {
            this.buscandoCep = false;
            return;
          }
          this.enderecoForm.get('estado')?.setValue(uf, { emitEvent: false });
          this.carregandoMunicipios = true;
          this.municipios = [];
          this.enderecoUtilsService.listarMunicipios(uf).subscribe({
            next: (lista) => {
              this.municipios = lista;
              this.carregandoMunicipios = false;
              const localNorm = (s: string) => s.trim().toLowerCase();
              const municipioExato = lista.find(
                (m) => localNorm(m.nome) === localNorm(localidade)
              );
              const municipioAfin =
                municipioExato ||
                lista.find(
                  (m) =>
                    m.nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() ===
                    localidade
                      .normalize('NFD')
                      .replace(/\p{M}/gu, '')
                      .toLowerCase()
                ) ||
                null;
              const nomeCidade = municipioAfin ? municipioAfin.nome : localidade;
              this.enderecoForm.patchValue(
                { estado: uf, cidade: nomeCidade },
                { emitEvent: false }
              );
              avisarCamposLinha();
              this.buscandoCep = false;
            },
            error: (err) => {
              console.error('Erro ao listar municípios após CEP', err);
              this.carregandoMunicipios = false;
              this.municipios = [];
              this.enderecoForm.patchValue(
                { estado: uf, cidade: localidade },
                { emitEvent: false }
              );
              this.buscandoCep = false;
            }
          });
        };

        if (this.estados.length) {
          aplicarUfMunicipioECidade();
        } else {
          this.enderecoUtilsService.listarEstados().subscribe({
            next: (es) => {
              this.estados = es;
              aplicarUfMunicipioECidade();
            },
            error: () => {
              this.buscandoCep = false;
            }
          });
        }
      },
      error: () => {
        this.buscandoCep = false;
        this.municipios = [];
        this.enderecoForm.patchValue(
          { rua: '', bairro: '', cidade: '', estado: '' },
          { emitEvent: false }
        );
      }
    });
  }

  mostrarAvisoCepIncompleto(camposVazios: string[]): void {
    // Implementar notificação para o usuário
    const mensagem = `CEP encontrado! Por favor, preencha manualmente: ${camposVazios.join(' e ')}.`;
    // Por enquanto só console, mas pode implementar toast/alert depois
    console.info(mensagem);
  }

  cepValidator(control: any) {
    const cep = control.value;
    if (!cep) return null;
    return this.enderecoUtilsService.validarCep(cep) ? null : { cepInvalido: true };
  }

  onSubmit(): void {
    if (this.enderecoForm.valid) {
      this.enderecoService.addEndereco(this.enderecoForm.value).subscribe({
        next: (response: any) => {
          // endereço salvo com sucesso
          this.carregarEnderecos();
          this.enderecoForm.reset();
          this.municipios = [];
        },
        error: (err: any) => console.error('Erro ao salvar endereço', err)
      });
    }
  }
}