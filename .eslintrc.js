module.exports = {
  "env": {
      "browser": true
  },
  "extends": [
      "prettier",
      "prettier/@typescript-eslint"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
      "tsconfigRootDir": __dirname,
      "project": "**/tsconfig.json",
      "sourceType": "module"
  },
  "plugins": [
      "@typescript-eslint",
  ],
  "rules": {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": "enumMember",
          "format": ["PascalCase"]
        }
      ],
      "@typescript-eslint/indent": ["error", 2],
      "@typescript-eslint/member-delimiter-style": [
          "error",
          {
              "multiline": {
                  "delimiter": "semi",
                  "requireLast": true
              },
              "singleline": {
                  "delimiter": "semi",
                  "requireLast": false
              }
          }
      ],
      "@typescript-eslint/prefer-namespace-keyword": "error",
      "@typescript-eslint/quotes": [
          "error",
          "single", 
          { "allowTemplateLiterals": true }
      ],
      "@typescript-eslint/semi": [
          "error",
          "always"
      ],
      "@typescript-eslint/type-annotation-spacing": "error",
      "brace-style": [
          "error",
          "1tbs"
      ],
      "comma-dangle": [
          "error",
          {
              "arrays": "always-multiline",
              "exports": "always-multiline",
              "functions": "always-multiline",
              "imports": "always-multiline",
              "objects": "always-multiline"
          }
      ],
      "eqeqeq": [
          "error",
          "smart"
      ],
      "id-blacklist": [
          "error",
          "any",
          "Number",
          "number",
          "String",
          "string",
          "Boolean",
          "boolean",
          "Undefined",
          "undefined"
      ],
      "id-match": "error",
      "no-eval": "error",
      "no-redeclare": "error",
      "no-trailing-spaces": "error",
      "no-var": "off",
      "spaced-comment": [
          "error",
          "always",
          {
              "markers": [
                  "/"
              ]
          }
      ]
  }
};