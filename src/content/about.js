import portuguese from './pt-BR/about'
import english from './en/about'
import { isLanguageBuild } from '../i18n/routes'

const anchors = [
  "o-que-e-o-prodforge",
  "por-que-ele-existe",
  "para-quem-foi-criado",
  "como-a-ia-ajuda",
  "o-que-o-prodforge-nao-substitui",
  "nossa-visao",
  "proximos-passos-do-produto"
]

export function getAboutContent(language) {
  const content = isLanguageBuild(import.meta.env.MODE) && language === 'en' ? english : portuguese
  return {
    ...content,
    aboutSections: content.aboutSections.map((section, index) => ({
      ...section,
      id: anchors[index],
    })),
  }
}
