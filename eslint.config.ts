// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import globals from "globals";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  js.configs.recommended,

  ...tseslint.configs.recommended,
  react.configs.recommended,

  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    rules: {
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "react/react-in-jsx-scope": "off", // Required only in pre-React 17
      "react/prop-types": "off", // Not needed with TypeScript
    },

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
];
