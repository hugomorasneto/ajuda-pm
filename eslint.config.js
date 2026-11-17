import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-i18n-preview', 'temp', 'artifacts', 'test-results', 'playwright-report']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: [
      'src/pages/{AboutPage,TimesPage}.jsx',
      'src/components/projects/TeamMembersPanel.jsx',
      'src/components/navigation/Public{Header,Footer}.jsx',
      'src/components/workspace/Workspace{Topbar,Sidebar}.jsx',
      'src/components/privacy/PrivacyConsentBanner.jsx',
    ],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: 'JSXText[value=/[a-zA-ZÀ-ÿ]/]',
          message: 'Mova o texto visível para o catálogo do idioma.',
        },
        {
          selector: 'JSXAttribute[name.name=/^(aria-label|alt|placeholder|title)$/] > Literal[value=/[a-zA-ZÀ-ÿ]/]',
          message: 'Use o catálogo do idioma em atributos visíveis e acessíveis.',
        },
      ],
    },
  },
])
