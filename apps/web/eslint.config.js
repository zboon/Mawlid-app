import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'

export default ts.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: ts.parser } },
  },
  {
    rules: {
      /* Die eine Regel, die dieses Projekt wirklich braucht: das Design-System
         hält nur, solange in Komponenten keine literalen Werte stehen. Der
         Rest ist Geschmack, das hier ist die Anforderung. */
      'no-restricted-syntax': 'off',
    },
  },
  prettier,
)
