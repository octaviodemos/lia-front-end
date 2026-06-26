export function usuarioDaEntidade(entidade: any): any {
  return entidade?.cliente || entidade?.usuario || null;
}

export function telefoneDoUsuario(entidade: any): string {
  const telefone = usuarioDaEntidade(entidade)?.telefone;
  return telefone ? String(telefone).trim() : '';
}

export function enderecosDoUsuario(entidade: any): any[] {
  const usuario = usuarioDaEntidade(entidade);
  const list = usuario?.enderecos_entrega;
  return Array.isArray(list) ? list : [];
}

export function formatarEndereco(endereco: any): string {
  if (!endereco) return '';

  const partes: string[] = [];
  const ruaNumero = [endereco.rua, endereco.numero].filter(Boolean).join(', ');
  if (ruaNumero) partes.push(ruaNumero);
  if (endereco.complemento) partes.push(String(endereco.complemento));
  if (endereco.bairro) partes.push(String(endereco.bairro));

  const cidadeEstado = [endereco.cidade, endereco.estado].filter(Boolean).join('/');
  if (cidadeEstado) partes.push(cidadeEstado);
  if (endereco.cep) partes.push(`CEP: ${endereco.cep}`);

  return partes.join(' — ');
}

export function formatarEnderecos(entidade: any): string[] {
  return enderecosDoUsuario(entidade)
    .map((endereco) => formatarEndereco(endereco))
    .filter((texto) => !!texto);
}
