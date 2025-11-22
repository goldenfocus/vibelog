import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**",
    ],
  },
  {
    rules: {
      // Type safety and code quality (without type-aware rules that require parserOptions)
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn", // Relaxed for now
      // Disable type-aware rules that require parserOptions configuration
      // "@typescript-eslint/prefer-nullish-coalescing": "error",
      // "@typescript-eslint/prefer-optional-chain": "error",
      // "@typescript-eslint/no-unnecessary-condition": "warn",

      // React best practices
      "react/no-unescaped-entities": "error",
      "react-hooks/exhaustive-deps": "warn", // Relaxed to warning
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-uses-react": "off", // Not needed in React 17+
      "react/jsx-uses-vars": "error",
      "react/no-array-index-key": "warn",
      "react/no-children-prop": "error",
      "react/no-danger-with-children": "error",
      "react/no-deprecated": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-find-dom-node": "error",
      "react/no-render-return-value": "error",
      "react/no-string-refs": "error",
      "react/require-render-return": "error",

      // General code quality
      "no-console": "off", // Temporarily disabled for development
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],

      // Performance
      "no-loop-func": "error",
      "no-inner-declarations": "error",

      // Security
      "no-new-wrappers": "error",
      "no-proto": "error",
      "no-caller": "error",

      // Import organization
      "import/no-default-export": "off", // Next.js requires default exports for pages
      "import/order": ["error", {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }]
    },
  },
];

export default eslintConfig;
