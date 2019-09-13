import fs = require('fs-extra');
import ts = require('typescript');
import { transformMarkdown } from './markdown/markdown';
import { MarkdownRenderer } from './markdown/markdown-renderer';
import { ReplaceCodeTransform } from './markdown/replace-code-renderer';
import { OTree, renderTree } from './o-tree';
import { TypeScriptCompiler } from './typescript/ts-compiler';
import { inTempDir } from './util';
import { AstVisitor, TranslateResult, VisitOptions, visitTree } from './visitor';

export interface Source {
  withFile<A>(fn: (fileName: string) => A): A;
  withContents<A>(fn: (fileName: string, contents: string) => A): A;
}

export class FileSource implements Source {
  constructor(private readonly fileName: string) { }

  public withFile<A>(fn: (fileName: string) => A): A {
    return fn(this.fileName);
  }

  public withContents<A>(fn: (fileName: string, contents: string) => A): A {
    const contents = fs.readFileSync(this.fileName, 'utf-8');
    return fn(this.fileName, contents);
  }
}

export class LiteralSource implements Source {
  constructor(private readonly source: string, private readonly filenameHint = 'index.ts') { }

  public withFile<A>(fn: (fileName: string) => A): A {
    return inTempDir(() => {
      fs.writeFileSync(this.filenameHint, this.source);
      return fn(this.filenameHint);
    });
  }

  public withContents<A>(fn: (fileName: string, contents: string) => A): A {
    return fn(this.filenameHint, this.source);
  }
}

export function translateMarkdown(markdown: Source, visitor: AstVisitor, options: TranslateOptions = {}): TranslateResult {
  const compiler = new TypeScriptCompiler();

  let index = 0;
  const diagnostics = new Array<ts.Diagnostic>();

  const translatedMarkdown = markdown.withContents((filename, contents) => {
    return transformMarkdown(contents, new MarkdownRenderer(), new ReplaceCodeTransform(code => {
      if (code.language === '' || code.language === 'typescript') { return code; }

      index += 1;
      const snippetSource = new LiteralSource(code.source, `${filename}-snippet${index}.ts`);
      const snippetTranslation = translateSnippet(snippetSource, compiler, visitor, options);

      diagnostics.push(...snippetTranslation.diagnostics);

      return { language: '', source: renderTree(snippetTranslation.tree) + '\n' };
    }));
  });

  return { tree: new OTree([translatedMarkdown]), diagnostics };
}

export type TranslateOptions = VisitOptions;

export function translateTypeScript(source: Source, visitor: AstVisitor, options: TranslateOptions = {}): TranslateResult {
  const compiler = new TypeScriptCompiler();

  return translateSnippet(source, compiler, visitor, options);
}

function translateSnippet(source: Source, compiler: TypeScriptCompiler, visitor: AstVisitor, options: TranslateOptions = {}): TranslateResult {
  return source.withContents((filename, contents) => {
    const result = compiler.compileInMemory(filename, contents);
    return visitTree(result.rootFile, result.rootFile, visitor, options);
  });
}

export function printDiagnostics(diags: ts.Diagnostic[], stream: NodeJS.WritableStream) {
  diags.forEach(d => printDiagnostic(d, stream));
}

export function printDiagnostic(diag: ts.Diagnostic, stream: NodeJS.WritableStream) {
  const host = {
    getCurrentDirectory() { return '.'; },
    getCanonicalFileName(fileName: string) { return fileName; },
    getNewLine() { return '\n'; }
  };

  const message = ts.formatDiagnosticsWithColorAndContext([diag], host);
  stream.write(message);
}

export function isErrorDiagnostic(diag: ts.Diagnostic) {
  return diag.category === ts.DiagnosticCategory.Error;
}