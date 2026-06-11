import { FlatCompat } from '@eslint/eslintrc'
import functional from 'eslint-plugin-functional'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['lib/**/*.ts', 'scripts/**/*.ts'],
    plugins: { functional },
    rules: {
      ...functional.configs['lite'].rules,
    },
  },
  {
    files: ['app/**/*.tsx', 'app/**/*.ts'],
    plugins: { functional },
    rules: {
      'functional/prefer-readonly-type': 'warn',
      'functional/no-mixed-types': 'off',
    },
  },
]

export default eslintConfig
