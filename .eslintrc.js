module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
  overrides: [
    {
      files: ["server.js"],
      env: {
        node: true,
      },
    },
    {
      files: ["public/**/*.js"],
      env: {
        browser: true,
      },
    },
  ],
};
