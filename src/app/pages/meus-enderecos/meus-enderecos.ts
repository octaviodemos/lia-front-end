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
        console.log('Resposta da API de CEP:', endereco);
        
        // Verifica se tem dados básicos (cidade/estado)
        const temDadosBasicos = endereco.localidade && endereco.uf;
        
        if (temDadosBasicos) {
          this.enderecoForm.patchValue({
            rua: endereco.logradouro || '',
            bairro: endereco.bairro || '',
            cidade: endereco.localidade || '',
            estado: endereco.uf || ''
          });
          
          // Alerta se alguns campos estão vazios
          const camposVazios = [];
          if (!endereco.logradouro) camposVazios.push('logradouro');
          if (!endereco.bairro) camposVazios.push('bairro');
          
          if (camposVazios.length > 0) {
            console.warn(`CEP encontrado, mas ${camposVazios.join(' e ')} não disponível(is). Preencha manualmente.`);
            // Você pode mostrar uma mensagem na tela também
            this.mostrarAvisoCepIncompleto(camposVazios);
          }
        } else {
          console.error('CEP encontrado mas sem dados de localização');
        }
        
        this.buscandoCep = false;
      },
      error: (err) => {
        console.error('CEP não encontrado', err);
        this.buscandoCep = false;
        // Limpa os campos se houve erro
        this.enderecoForm.patchValue({
          rua: '',
          bairro: '',
          cidade: '',
          estado: ''
        });
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
          console.log('Endereço salvo!', response);
          this.carregarEnderecos();
          this.enderecoForm.reset();
          this.municipios = [];
        },
        error: (err: any) => console.error('Erro ao salvar endereço', err)
      });
    }
  }
}