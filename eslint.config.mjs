import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

export default defineConfig([
	{ files: ['**/*.{js,mjs,cjs,ts,mts,cts}'], plugins: { js }, extends: ['js/recommended'], languageOptions: { globals: globals.node } },
	tseslint.configs.recommended,
	{
		files: ['**/*.{ts,mts,cts,js,mjs,cjs}'],
		rules: {
			semi: ['error', 'never'],
			quotes: ['error', 'single'],
			indent: ['error', 'tab'],
		},
	}
])
