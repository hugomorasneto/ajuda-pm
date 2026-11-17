import portuguese from './pt-BR/about'
import english from './en/about'

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
  const content = import.meta.env.MODE === 'i18n-preview' && language === 'en' ? english : portuguese
  return {
    ...content,
    aboutSections: content.aboutSections.map((section, index) => ({
      ...section,
      id: anchors[index],
    })),
  }
}
