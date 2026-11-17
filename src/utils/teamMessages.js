const knownErrors = new Map(Object.entries({
  "Usuário não autenticado.": "errors.signInRequired",
  "Projeto não informado.": "errors.missingProject",
  "Time não informado.": "errors.missingTeam",
  "Membro não informado.": "errors.missingMember",
  "Informe um nome para o time.": "errors.missingName",
  "Informe o e-mail do membro.": "errors.missingEmail",
  "Papel de membro inválido.": "errors.invalidRole",
  "Papel inválido para membro do time.": "errors.invalidTeamRole",
  "Usuário não encontrado para esse e-mail.": "errors.userNotFound",
  "Membro não encontrado neste time.": "errors.memberNotFound",
  "Acesso negado ao time informado.": "errors.teamAccessDenied",
  "Apenas administradores do projeto ou do time podem adicionar membros.": "addPermission",
  "Apenas administradores do projeto ou do time podem alterar papéis.": "editPermission",
  "Apenas administradores do projeto ou do time podem remover membros.": "removePermission",
  "O owner do time não pode ter o papel alterado por aqui.": "editOwner",
  "Você não pode alterar seu próprio papel por aqui.": "editSelf",
  "O owner do time não pode ser removido por aqui.": "removeOwner",
  "Você não pode remover seu próprio acesso por aqui.": "removeSelf"
}))

export function teamOperationMessage(error, fallback) {
  const original = typeof error?.message === 'string' ? error.message : ''
  return { key: knownErrors.get(original) ?? fallback, original }
}

export function renderTeamMessage(t, message, language) {
  // Keep the established Portuguese feedback. The English preview uses localized errors.
  if (message.original && language === 'pt-BR') return message.original
  return t(message.key)
}
