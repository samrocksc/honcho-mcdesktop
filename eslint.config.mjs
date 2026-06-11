import nextConfig from 'eslint-config-next'
import functional from 'eslint-plugin-functional'

const eslintConfig = [
  ...nextConfig,
  {
    files: ['lib/**/*.ts', 'scripts/**/*.ts'],
    plugins: { functional },
    rules: { ...functional.configs['lite'].rules },
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
