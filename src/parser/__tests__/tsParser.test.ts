import { describe, expect, it } from 'vitest';
import { parseFileComplete, parseFileSymbols } from '../tsParser.ts';

describe('TypeScript Parser', () => {
	describe('parseFileSymbols', () => {
		it('should extract function declarations', () => {
			const source = `
				function hello() {
					console.log('hello');
				}

				export function goodbye() {
					console.log('goodbye');
				}
			`;

			const symbols = parseFileSymbols('test.ts', source);
			expect(symbols).toHaveLength(2);
			expect(symbols[0].name).toBe('hello');
			expect(symbols[0].kind).toBe('function');
			expect(symbols[0].exported).toBe(false);
			expect(symbols[1].name).toBe('goodbye');
			expect(symbols[1].exported).toBe(true);
		});

		it('should extract class declarations', () => {
			const source = `
				class MyClass {
					method() {}
				}

				export class ExportedClass {
					anotherMethod() {}
				}
			`;

			const symbols = parseFileSymbols('test.ts', source);
			const classes = symbols.filter((s) => s.kind === 'class');
			expect(classes).toHaveLength(2);
			expect(classes[0].name).toBe('MyClass');
			expect(classes[1].name).toBe('ExportedClass');
			expect(classes[1].exported).toBe(true);
		});

		it('should extract arrow functions', () => {
			const source = `
				const myFunc = () => {};
				export const exportedFunc = () => {};
			`;

			const symbols = parseFileSymbols('test.ts', source);
			const functions = symbols.filter((s) => s.kind === 'function');
			expect(functions).toHaveLength(2);
			expect(functions[0].name).toBe('myFunc');
			expect(functions[1].name).toBe('exportedFunc');
			expect(functions[1].exported).toBe(true);
		});

		it('should extract interfaces and types', () => {
			const source = `
				interface MyInterface {
					prop: string;
				}

				type MyType = string | number;
			`;

			const symbols = parseFileSymbols('test.ts', source);
			expect(symbols).toHaveLength(2);
			expect(symbols[0].kind).toBe('interface');
			expect(symbols[0].name).toBe('MyInterface');
			expect(symbols[1].kind).toBe('type');
			expect(symbols[1].name).toBe('MyType');
		});
	});

	describe('parseFileComplete', () => {
		it('should extract imports', () => {
			const source = `
				import { foo } from './foo';
				import bar from './bar';
				import * as utils from './utils';
			`;

			const result = parseFileComplete('test.ts', source);
			expect(result.imports).toHaveLength(3); // foo, bar, utils namespace
			expect(result.imports[0].importedName).toBe('foo');
			expect(result.imports[0].modulePath).toBe('./foo');
			expect(result.imports[0].isDefault).toBe(false);
			expect(result.imports[1].importedName).toBe('bar');
			expect(result.imports[1].isDefault).toBe(true);
			expect(result.imports[2].importedName).toBe('utils');
			expect(result.imports[2].modulePath).toBe('./utils');
			expect(result.imports[2].isDefault).toBe(false);
		});

		it('should extract function calls', () => {
			const source = `
				function caller() {
					callee();
					obj.method();
				}
			`;

			const result = parseFileComplete('test.ts', source);
			expect(result.calls).toHaveLength(2);
			expect(result.calls[0].calleeName).toBe('callee');
			expect(result.calls[0].callerFunction).toBe('caller');
			expect(result.calls[1].calleeName).toBe('obj.method');
		});

		it('should track class methods correctly', () => {
			const source = `
				class MyClass {
					method1() {
						this.method2();
					}

					method2() {}
				}
			`;

			const result = parseFileComplete('test.ts', source);
			const methods = result.symbols.filter((s) => s.kind === 'function');
			expect(methods).toHaveLength(2);
			expect(methods[0].name).toBe('MyClass.method1');
			expect(methods[1].name).toBe('MyClass.method2');
		});
	});
});
