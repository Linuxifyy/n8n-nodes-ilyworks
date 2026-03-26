module.exports = {
  root: true,
  env: { node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { project: ['./tsconfig.json'], sourceType: 'module' },
  plugins: ['eslint-plugin-n8n-nodes-base'],
  extends: ['plugin:eslint-plugin-n8n-nodes-base/nodes'],
  rules: {
    'n8n-nodes-base/node-dirname-against-convention': 'error',
  },
}
