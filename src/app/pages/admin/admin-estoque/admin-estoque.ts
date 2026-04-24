import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { LivroService } from '../../../services/livro.service';
import { EstoqueService } from '../../../services/estoque.service';
import { LIVRO_IMAGEM_FORM_SLOTS, LivroImagemFormFieldName } from '../../../models/livro-imagem';
import { anexarImagensLivroNoFormData, mensagemErroArquivoImagem } from '../../../utils/livro-imagem-helpers';
import { resolverUrlMidiaApi } from '../../../utils/media-url';

const TIPO_IMAGEM_PARA_CAMPO: Record<string, LivroImagemFormFieldName> = {
  Capa: 'imagem_Capa',
  Contracapa: 'imagem_Contracapa',
  Lombada: 'imagem_Lombada',
  MioloPaginas: 'imagem_MioloPaginas',
  DetalhesAvarias: 'imagem_DetalhesAvarias',
};

@Component({
  selector: 'app-admin-estoque',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-estoque.html',
  styleUrls: ['./admin-estoque.scss'],
})
export class AdminEstoque implements OnInit {
  readonly notasConservacao = [1, 2, 3, 4, 5] as const;
  readonly slotsImagens = LIVRO_IMAGEM_FORM_SLOTS;

  estoqueForm!: FormGroup;
  livrosDoCatalogo: any[] = [];
  itensLista: any[] = [];
  mensagemSucesso: string = '';
  modoEdicao = false;
  idEstoqueEdicao: number | null = null;

  private readonly tamanhoMaxArquivo = 5 * 1024 * 1024;
  arquivosPorTipo: Partial<Record<LivroImagemFormFieldName, File | null>> = {};
  nomesArquivos: Partial<Record<LivroImagemFormFieldName, string>> = {};
  previewsPorTipo: Partial<Record<LivroImagemFormFieldName, string | null>> = {};
  imagemExistenteUrl: Partial<Record<LivroImagemFormFieldName, string | null>> = {};

  constructor(
    private fb: FormBuilder,
    private livroService: LivroService,
    private estoqueService: EstoqueService
  ) {}

  ngOnInit(): void {
    this.carregarLivrosDoCatalogo();
    this.carregarListaEstoque();

    this.estoqueForm = this.fb.group({
      id_livro: [null, Validators.required],
      titulo: ['', Validators.required],
      sinopse: [''],
      editora: [''],
      ano_publicacao: [null as number | null],
      isbn: [''],
      descricao_conservacao: [''],
      destaque_vitrine: [false],
      preco: [null, [Validators.required, Validators.min(0)]],
      nota_conservacao: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      disponivel: [true],
    });

    this.estoqueForm.get('id_livro')?.valueChanges.subscribe((id) => {
      if (this.modoEdicao) {
        return;
      }
      if (id) {
        this.livroService.getLivroById(String(id)).subscribe({
          next: (livroDetalhe: any) => {
            this.preencherDadosDoLivroNoFormulario(livroDetalhe, true);
          },
        });
      } else {
        this.limparDadosCatalogoEImagens();
        this.estoqueForm.patchValue(
          { preco: null, nota_conservacao: 5, disponivel: true },
          { emitEvent: false }
        );
      }
    });
  }

  idInputArquivo(campo: LivroImagemFormFieldName): string {
    return `arquivo-estoque-${campo}`;
  }

  aoSelecionarArquivo(campo: LivroImagemFormFieldName, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) {
      return;
    }
    const arquivo = input.files[0];
    const erro = mensagemErroArquivoImagem(arquivo, this.tamanhoMaxArquivo);
    if (erro) {
      this.mensagemSucesso = erro;
      input.value = '';
      return;
    }
    this.arquivosPorTipo = { ...this.arquivosPorTipo, [campo]: arquivo };
    this.nomesArquivos = { ...this.nomesArquivos, [campo]: arquivo.name };
    const leitor = new FileReader();
    leitor.onload = (e: ProgressEvent<FileReader>) => {
      this.previewsPorTipo = { ...this.previewsPorTipo, [campo]: String(e.target?.result ?? '') };
    };
    leitor.readAsDataURL(arquivo);
  }

  limparArquivo(campo: LivroImagemFormFieldName): void {
    const proximoArquivos = { ...this.arquivosPorTipo };
    delete proximoArquivos[campo];
    this.arquivosPorTipo = proximoArquivos;
    const proximoNomes = { ...this.nomesArquivos };
    delete proximoNomes[campo];
    this.nomesArquivos = proximoNomes;
    const ex = this.imagemExistenteUrl[campo];
    this.previewsPorTipo = { ...this.previewsPorTipo, [campo]: ex != null && ex.length > 0 ? ex : null };
    const el = document.getElementById(this.idInputArquivo(campo)) as HTMLInputElement | null;
    if (el) {
      el.value = '';
    }
  }

  private campoImagemPorTipo(tipo: string | null | undefined): LivroImagemFormFieldName | null {
    if (tipo == null) {
      return null;
    }
    const s = String(tipo).trim();
    if (s in TIPO_IMAGEM_PARA_CAMPO) {
      return TIPO_IMAGEM_PARA_CAMPO[s];
    }
    const t = s.replace(/\s|\/|_/g, '').toLowerCase();
    if (t === 'capa') {
      return 'imagem_Capa';
    }
    if (t === 'contracapa') {
      return 'imagem_Contracapa';
    }
    if (t === 'lombada') {
      return 'imagem_Lombada';
    }
    if (t === 'miolopaginas' || t === 'miolo') {
      return 'imagem_MioloPaginas';
    }
    if (t === 'detalhesavarias' || t === 'detalhes') {
      return 'imagem_DetalhesAvarias';
    }
    return null;
  }

  private limparDadosCatalogoEImagens(): void {
    this.arquivosPorTipo = {};
    this.nomesArquivos = {};
    this.previewsPorTipo = {};
    this.imagemExistenteUrl = {};
    this.slotsImagens.forEach((s) => {
      const el = document.getElementById(this.idInputArquivo(s.formFieldName)) as HTMLInputElement | null;
      if (el) {
        el.value = '';
      }
    });
  }

  private preencherDadosDoLivroNoFormulario(livroDetalhe: any, preencherPrecoEstoque: boolean): void {
    const nota = livroDetalhe.nota_conservacao != null ? Number(livroDetalhe.nota_conservacao) : 5;
    this.estoqueForm.patchValue(
      {
        titulo: livroDetalhe.titulo ?? '',
        sinopse: livroDetalhe.sinopse ?? '',
        editora: livroDetalhe.editora ?? '',
        ano_publicacao: livroDetalhe.ano_publicacao ?? null,
        isbn: livroDetalhe.isbn ?? '',
        descricao_conservacao: livroDetalhe.descricao_conservacao ?? '',
        destaque_vitrine: livroDetalhe.destaque_vitrine === true,
        nota_conservacao: nota,
        disponivel: true,
      },
      { emitEvent: false }
    );
    this.limparDadosCatalogoEImagens();
    const imagens = livroDetalhe.imagens;
    if (Array.isArray(imagens)) {
      for (const im of imagens) {
        const campo = this.campoImagemPorTipo(String(im.tipo_imagem ?? ''));
        if (!campo || !im?.url_imagem) {
          continue;
        }
        const u = resolverUrlMidiaApi(String(im.url_imagem));
        this.imagemExistenteUrl = { ...this.imagemExistenteUrl, [campo]: u };
        this.previewsPorTipo = { ...this.previewsPorTipo, [campo]: u };
      }
    }
    if (preencherPrecoEstoque) {
      this.aplicarPrecoEstoqueSelecionado(livroDetalhe);
    }
  }

  private precoParaInput(v: any): number | null {
    if (v == null || v === '') {
      return null;
    }
    const s = String(v).replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  private aplicarPrecoEstoqueSelecionado(livroDetalhe: any): void {
    const estoques = livroDetalhe.estoques;
    const prim = livroDetalhe.estoque;
    let precoVal: number | null = null;
    if (Array.isArray(estoques) && estoques.length > 0) {
      const last = estoques[estoques.length - 1];
      precoVal = this.precoParaInput(last?.preco);
    }
    if (precoVal == null && prim?.preco != null) {
      precoVal = this.precoParaInput(prim.preco);
    }
    this.estoqueForm.patchValue(
      { preco: precoVal, nota_conservacao: this.estoqueForm.get('nota_conservacao')?.value, disponivel: true },
      { emitEvent: false }
    );
  }

  private montarFormDataLivro(raw: Record<string, any>): FormData {
    const formData = new FormData();
    Object.keys(raw).forEach((key) => {
      const value = raw[key];
      if (key === 'descricao_conservacao') {
        if (typeof value !== 'string') {
          return;
        }
        const cortado = value.trim();
        if (!cortado) {
          return;
        }
        formData.append(key, cortado);
        return;
      }
      if (key === 'destaque_vitrine') {
        formData.append(key, value === true || value === 'true' ? 'true' : 'false');
        return;
      }
      if (key === 'ano_publicacao') {
        if (value == null || value === '') {
          return;
        }
        formData.append(key, String(value));
        return;
      }
      if (key === 'sinopse' || key === 'editora' || key === 'isbn' || key === 'titulo') {
        if (value == null || value === '') {
          return;
        }
        formData.append(key, String(value));
        return;
      }
      if (key === 'nota_conservacao') {
        formData.append(key, String(value));
        return;
      }
    });
    anexarImagensLivroNoFormData(formData, this.arquivosPorTipo);
    return formData;
  }

  carregarLivrosDoCatalogo(): void {
    this.livroService.getLivros().subscribe({
      next: (data: any) => (this.livrosDoCatalogo = data),
      error: (err: any) => console.error('Erro ao carregar livros', err),
    });
  }

  carregarListaEstoque(): void {
    this.estoqueService.listarEstoque().subscribe({
      next: (res: any) => {
        const arr = Array.isArray(res) ? res : res?.data ?? res?.items ?? res?.estoques ?? [];
        this.itensLista = Array.isArray(arr) ? arr : [];
      },
      error: () => {
        this.itensLista = [];
      },
    });
  }

  iniciarEdicao(item: any): void {
    const idE = item.id_estoque ?? item.id;
    if (idE == null) {
      return;
    }
    this.modoEdicao = true;
    this.idEstoqueEdicao = idE;
    this.estoqueForm.get('id_livro')?.disable({ emitEvent: false });
    const idL = item.id_livro;
    this.mensagemSucesso = '';
    if (idL == null) {
      this.estoqueForm.patchValue(
        {
          preco: this.precoParaInput(item.preco),
          nota_conservacao: item.livro?.nota_conservacao != null ? Number(item.livro.nota_conservacao) : 5,
          disponivel: this.itemDisponivel(item),
        },
        { emitEvent: false }
      );
      return;
    }
    this.livroService.getLivroById(String(idL)).subscribe({
      next: (livro) => {
        this.preencherDadosDoLivroNoFormulario(livro, false);
        this.estoqueForm.patchValue(
          {
            id_livro: idL,
            preco: this.precoParaInput(item.preco),
            nota_conservacao: item.livro?.nota_conservacao != null ? Number(item.livro.nota_conservacao) : 5,
            disponivel: this.itemDisponivel(item),
          },
          { emitEvent: false }
        );
      },
    });
  }

  cancelarEdicao(): void {
    this.modoEdicao = false;
    this.idEstoqueEdicao = null;
    this.estoqueForm.get('id_livro')?.enable({ emitEvent: false });
    this.limparDadosCatalogoEImagens();
    this.estoqueForm.reset(
      {
        id_livro: null,
        titulo: '',
        sinopse: '',
        editora: '',
        ano_publicacao: null,
        isbn: '',
        descricao_conservacao: '',
        destaque_vitrine: false,
        preco: null,
        nota_conservacao: 5,
        disponivel: true,
      },
      { emitEvent: false }
    );
  }

  onSubmit(): void {
    if (this.estoqueForm.invalid) {
      return;
    }
    const formValue = this.estoqueForm.getRawValue();
    const precoStr = parseFloat(String(formValue.preco).replace(',', '.')).toFixed(2);
    const idLivro = formValue.id_livro;
    if (idLivro == null) {
      return;
    }
    const payloadLivro: Record<string, any> = {
      titulo: formValue.titulo,
      sinopse: formValue.sinopse,
      editora: formValue.editora,
      ano_publicacao: formValue.ano_publicacao,
      isbn: formValue.isbn,
      nota_conservacao: formValue.nota_conservacao,
      descricao_conservacao: formValue.descricao_conservacao,
      destaque_vitrine: formValue.destaque_vitrine === true,
    };
    const formDataLivro = this.montarFormDataLivro(payloadLivro);

    if (this.modoEdicao && this.idEstoqueEdicao != null) {
      this.livroService
        .atualizarLivro(idLivro, formDataLivro)
        .pipe(
          switchMap(() =>
            this.estoqueService.atualizarItemEstoque(this.idEstoqueEdicao as number, {
              preco: precoStr,
              nota_conservacao: Number(formValue.nota_conservacao),
              disponivel: formValue.disponivel === true,
            })
          )
        )
        .subscribe({
          next: () => {
            this.mensagemSucesso = 'Livro e item de estoque atualizados.';
            this.cancelarEdicao();
            this.carregarListaEstoque();
            this.carregarLivrosDoCatalogo();
          },
          error: (err: any) => {
            this.mensagemSucesso = err.error?.message || 'Erro ao atualizar.';
          },
        });
      return;
    }

    this.livroService
      .atualizarLivro(idLivro, formDataLivro)
      .pipe(
        switchMap(() =>
          this.estoqueService.adicionarItemEstoque({
            id_livro: idLivro,
            preco: precoStr,
            nota_conservacao: Number(formValue.nota_conservacao),
          })
        )
      )
      .subscribe({
        next: () => {
          this.mensagemSucesso = 'Catálogo e novo item de estoque salvos.';
          this.cancelarEdicao();
          this.carregarListaEstoque();
          this.carregarLivrosDoCatalogo();
        },
        error: (err: any) => {
          if (Array.isArray(err.error?.message)) {
            this.mensagemSucesso = err.error.message.join(', ');
          } else {
            this.mensagemSucesso = err.error?.message || 'Erro ao salvar.';
          }
        },
      });
  }

  confirmarExcluir(item: any): void {
    const id = item.id_estoque ?? item.id;
    if (id == null) {
      return;
    }
    const t = this.tituloLivroNaLista(item);
    if (!window.confirm(`Excluir o estoque do item #${id} — ${t}?`)) {
      return;
    }
    this.estoqueService.excluirItemEstoque(id).subscribe({
      next: () => {
        this.mensagemSucesso = 'Item removido do estoque.';
        this.carregarListaEstoque();
        if (this.modoEdicao && this.idEstoqueEdicao === id) {
          this.cancelarEdicao();
        }
      },
      error: (err: any) => {
        this.mensagemSucesso = err.error?.message || 'Não foi possível excluir o item.';
      },
    });
  }

  tituloLivroNaLista(item: any): string {
    return (
      item?.livro?.titulo ||
      item?.titulo_livro ||
      item?.livro_titulo ||
      `Livro #${item?.id_livro ?? '—'}`
    );
  }

  notaLivroNaLista(item: any): string {
    const n = item?.livro?.nota_conservacao;
    if (n == null) {
      return '—';
    }
    return String(n);
  }

  rotuloNota(n: number): string {
    const map: Record<number, string> = {
      1: 'Danos severos ou faltantes',
      2: 'Danos na capa ou lombada',
      3: 'Marcas de uso visíveis',
      4: 'Leves marcas',
      5: 'Perfeito / Novo',
    };
    return map[n] ?? '—';
  }

  itemDisponivel(item: any): boolean {
    const v = item?.disponivel;
    return v === true || v === 'true' || v === 1 || v === '1';
  }
}
