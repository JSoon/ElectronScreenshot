module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es6: true,
    commonjs: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    // #region ESlint规则

    // https://eslint.org/docs/rules/
    // https://eslint.org/docs/user-guide/configuring#extending-configuration-files
    'comma-dangle': ['error', 'always-multiline'],
    'consistent-return': 'off',
    'func-names': 'off',
    'linebreak-style': 'off',
    'max-len': ['error', 200],
    'no-console': 'warn',
    'no-debugger': 'warn',
    'no-irregular-whitespace': 'off',
    'no-param-reassign': 'warn',
    'no-shadow': 'warn',
    'no-underscore-dangle': 'off',
    'no-unused-expressions': 'off',
    'no-unused-vars': 'warn',
    'no-use-before-define': ['error', 'nofunc'],
    'no-useless-return': 'warn',
    'prefer-destructuring': 'off',
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],

    // #endregion
  },
};