import ts = require('typescript');
import { NO_SYNTAX, OTree, UnknownSyntax } from './o-tree';
import { commentRangeFromTextRange, nodeChildren, repeatNewlines, scanText } from './typescript/ast-utils';
import { analyzeImportDeclaration, analyzeImportEquals, ImportStatement } from './typescript/imports';

export interface AstContext<C> {
  sourceFile: ts.SourceFile;
  typeChecker: ts.TypeChecker;
  currentContext: C;

  convert(node: ts.Node | undefined, context?: C): OTree;
  convertAll<A extends ts.Node>(nodes: ReadonlyArray<A>, context?: C): OTree[];
  textOf(node: ts.Node): string;
  textAt(pos: number, end: number): string;
  textBetween(node1: ts.Node, node2: ts.Node): string;
  textFromTo(node1: ts.Node, node2: ts.Node): string;
  report(node: ts.Node, message: string, category?: ts.DiagnosticCategory): void;
  reportUnsupported(node: ts.Node): void;
  attachLeadingTrivia(node: ts.Node, rendered: OTree): OTree;
  typeOfExpression(node: ts.Expression): ts.Type | undefined;
  typeOfType(node: ts.TypeNode): ts.Type;
  mirrorNewlineBefore(viz?: ts.Node, suffix?: string): string;
}

export interface AstVisitor<C> {
  readonly defaultContext: C;

  mergeContext(old: C, update: C): C;

  commentRange(node: ts.CommentRange, context: AstContext<C>): OTree;
  importStatement(node: ImportStatement, context: AstContext<C>): OTree;
  stringLiteral(node: ts.StringLiteral, children: AstContext<C>): OTree;
  functionDeclaration(node: ts.FunctionDeclaration, children: AstContext<C>): OTree;
  identifier(node: ts.Identifier, children: AstContext<C>): OTree;
  block(node: ts.Block, children: AstContext<C>): OTree;
  parameterDeclaration(node: ts.ParameterDeclaration, children: AstContext<C>): OTree;
  returnStatement(node: ts.ReturnStatement, context: AstContext<C>): OTree;
  binaryExpression(node: ts.BinaryExpression, context: AstContext<C>): OTree;
  ifStatement(node: ts.IfStatement, context: AstContext<C>): OTree;
  propertyAccessExpression(node: ts.PropertyAccessExpression, context: AstContext<C>): OTree;
  callExpression(node: ts.CallExpression, context: AstContext<C>): OTree;
  expressionStatement(node: ts.ExpressionStatement, context: AstContext<C>): OTree;
  token<A extends ts.SyntaxKind>(node: ts.Token<A>, context: AstContext<C>): OTree;
  objectLiteralExpression(node: ts.ObjectLiteralExpression, context: AstContext<C>): OTree;
  newExpression(node: ts.NewExpression, context: AstContext<C>): OTree;
  propertyAssignment(node: ts.PropertyAssignment, context: AstContext<C>): OTree;
  variableStatement(node: ts.VariableStatement, context: AstContext<C>): OTree;
  variableDeclarationList(node: ts.VariableDeclarationList, context: AstContext<C>): OTree;
  variableDeclaration(node: ts.VariableDeclaration, context: AstContext<C>): OTree;
  jsDoc(node: ts.JSDoc, context: AstContext<C>): OTree;
  arrayLiteralExpression(node: ts.ArrayLiteralExpression, context: AstContext<C>): OTree;
  shorthandPropertyAssignment(node: ts.ShorthandPropertyAssignment, context: AstContext<C>): OTree;
  forOfStatement(node: ts.ForOfStatement, context: AstContext<C>): OTree;
  classDeclaration(node: ts.ClassDeclaration, context: AstContext<C>): OTree;
  constructorDeclaration(node: ts.ConstructorDeclaration, context: AstContext<C>): OTree;
  propertyDeclaration(node: ts.PropertyDeclaration, context: AstContext<C>): OTree;
  methodDeclaration(node: ts.MethodDeclaration, context: AstContext<C>): OTree;
  interfaceDeclaration(node: ts.InterfaceDeclaration, context: AstContext<C>): OTree;
  propertySignature(node: ts.PropertySignature, context: AstContext<C>): OTree;
  asExpression(node: ts.AsExpression, context: AstContext<C>): OTree;
  prefixUnaryExpression(node: ts.PrefixUnaryExpression, context: AstContext<C>): OTree;
  spreadElement(node: ts.SpreadElement, context: AstContext<C>): OTree;
  spreadAssignment(node: ts.SpreadAssignment, context: AstContext<C>): OTree;
  templateExpression(node: ts.TemplateExpression, context: AstContext<C>): OTree;
  nonNullExpression(node: ts.NonNullExpression, context: AstContext<C>): OTree;
  parenthesizedExpression(node: ts.ParenthesizedExpression, context: AstContext<C>): OTree;

  // Not a node, called when we recognize a spread element/assignment that is only
  // '...' and nothing else.
  ellipsis(node: ts.SpreadElement | ts.SpreadAssignment, context: AstContext<C>): OTree;
}

export function nimpl<C>(node: ts.Node, context: AstContext<C>, options: { additionalInfo?: string} = {}) {
  const children = nodeChildren(node).map(c => context.convert(c));

  let syntaxKind = ts.SyntaxKind[node.kind];
  if (syntaxKind === 'FirstPunctuation') {
    // These have the same identifier but this name is more descriptive
    syntaxKind = 'OpenBraceToken';
  }

  const parts = [`(${syntaxKind}`];
  if (options.additionalInfo) { parts.push(`{${options.additionalInfo}}`); }
  parts.push(context.textOf(node));

  return new UnknownSyntax([parts.join(' ')], children.length > 0 ? ['\n', ...children] : [], {
    indent: 2,
    suffix: ')',
    separator: '\n',
    canBreakLine: true
  });
}

export interface TranslateResult {
  tree: OTree;
  diagnostics: ts.Diagnostic[];
}

export interface VisitOptions {
  /**
   * If enabled, don't translate the text of unknown nodes
   *
   * @default true
   */
  bestEffort?: boolean;
}

class ContextStack<C> {
  private readonly contextStack = new Array<C>();

  constructor(initial: C, private readonly merge: (a: C, b: C) => C) {
    this.contextStack.push(initial);
  }

  public get top(): C  {
    return this.contextStack[this.contextStack.length - 1];
  }

  public push(contextUpdate?: C): () => void {
    if (contextUpdate === undefined) { return () => undefined; }

    const updated = this.merge(this.top, contextUpdate);
    this.contextStack.push(updated);

    const self = this;
    return () => {
      if (self.top !== updated) {
        throw new Error('Oops -- ordering mistake push and popping context');
      }
      self.contextStack.pop();
    };
  }
}

export function visitTree<C>(
      file: ts.SourceFile, root: ts.Node, typeChecker: ts.TypeChecker,
      visitor: AstVisitor<C>, options: VisitOptions = {}): TranslateResult {
  const diagnostics = new Array<ts.Diagnostic>();

  const contextStack = new ContextStack<C>(visitor.defaultContext, visitor.mergeContext.bind(visitor));

  const context: AstContext<C> = {
    typeChecker,
    sourceFile: file,

    get currentContext(): C {
      return contextStack.top;
    },

    convert(node: ts.Node | undefined, contextUpdate?: C): OTree {
      if (node === undefined) { return NO_SYNTAX; }

      const pop = contextStack.push(contextUpdate);
      const ret = recurse(node);
      pop();
      return ret;
    },
    convertAll<A extends ts.Node>(nodes: ReadonlyArray<A>, contextUpdate?: C): OTree[] {
      const pop = contextStack.push(contextUpdate);
      const ret = nodes.map(recurse);
      pop();
      return ret;
    },
    textOf(node: ts.Node): string {
      return node.getText(file);
    },
    textAt(pos: number, end: number): string {
      return file.text.substring(pos, end);
    },
    typeOfExpression(node: ts.Expression) {
      return typeChecker.getContextualType(node);
    },
    typeOfType(node: ts.TypeNode): ts.Type {
      return typeChecker.getTypeFromTypeNode(node);
    },
    report(node: ts.Node, messageText: string, category: ts.DiagnosticCategory = ts.DiagnosticCategory.Error) {
      diagnostics.push({
        category, code: 0,
        messageText,
        file,
        start: node.getStart(file),
        length: node.getWidth(file)
      });
    },
    reportUnsupported(node: ts.Node): void {
      const nodeKind = ts.SyntaxKind[node.kind];
      // tslint:disable-next-line:max-line-length
      context.report(node, `This TypeScript language feature (${nodeKind}) is not supported in examples because we cannot translate it. Please rewrite this example.`);
    },
    textBetween(node1: ts.Node, node2: ts.Node): string {
      return file.text.substring(node1.getEnd(), node2.getStart(file));
    },
    textFromTo(node1: ts.Node, node2: ts.Node): string {
      return file.text.substring(node1.getStart(file), node2.getStart(file));
    },
    attachLeadingTrivia(node: ts.Node, transformed: OTree): OTree {
      // Add comments and leading whitespace
      const leadingRanges = scanText(file.text, node.getFullStart(), node.getStart(file));

      // console.log(JSON.stringify(node.getFullText(file)));
      // console.log(JSON.stringify(file.text.substring(node.getFullStart(), node.getStart(file))));

      const precede: OTree[] = [];
      for (const range of leadingRanges) {
        switch (range.type) {
          case 'other':
            precede.push(new OTree([repeatNewlines(file.text.substring(range.pos, range.end))], [], {
              renderOnce: `ws-${range.pos}`
            }));
            break;
          case 'linecomment':
          case 'blockcomment':
            precede.push(visitor.commentRange(commentRangeFromTextRange(range), context));
            break;
        }
      }

      // FIXME: No trailing comments for now, they're too tricky

      if (precede.length > 0 && !transformed.isEmpty) {
        return new OTree([...precede, transformed], [], { canBreakLine: true });
      } else {
        return transformed;
      }
    },
    mirrorNewlineBefore(viz?: ts.Node, suffix: string = ''): string {
      if (viz === undefined) { return suffix; }

      // Return a newline if the given node is preceded by newlines
      const leadingRanges = scanText(file.text, viz.getFullStart(), viz.getStart(file));
      const newlines = [];

      for (const range of leadingRanges) {
        if (range.type === 'other') {
          newlines.push(repeatNewlines(file.text.substring(range.pos, range.end)));
        }
      }

      return (newlines.join('').length > 0 ? '\n' : '') + suffix;
    }
  };

  return {
    tree: recurse(root),
    diagnostics
  };

  function recurse(tree: ts.Node) {
    // Basic transform of node
    const transformed = transformNode(tree);
    if (!transformed.attachComment) { return transformed; }

    return context.attachLeadingTrivia(tree, transformed);
  }

  function transformNode(tree: ts.Node): OTree {
    // Special nodes
    if (ts.isSourceFile(tree))  {
      return new OTree(context.convertAll(tree.statements));
    }
    if (ts.isEmptyStatement(tree)) {
      // Additional semicolon where it doesn't belong.
      return NO_SYNTAX;
    }

    // Nodes with meaning
    if (ts.isImportEqualsDeclaration(tree)) { return visitor.importStatement(analyzeImportEquals(tree, context), context); }
    if (ts.isImportDeclaration(tree)) { return visitor.importStatement(analyzeImportDeclaration(tree, context), context); }
    if (ts.isStringLiteral(tree)) { return visitor.stringLiteral(tree, context); }
    if (ts.isFunctionDeclaration(tree)) { return visitor.functionDeclaration(tree, context); }
    if (ts.isIdentifier(tree)) { return visitor.identifier(tree, context); }
    if (ts.isBlock(tree)) { return visitor.block(tree, context); }
    if (ts.isParameter(tree)) { return visitor.parameterDeclaration(tree, context); }
    if (ts.isReturnStatement(tree)) { return visitor.returnStatement(tree, context); }
    if (ts.isBinaryExpression(tree)) { return visitor.binaryExpression(tree, context); }
    if (ts.isIfStatement(tree)) { return visitor.ifStatement(tree, context); }
    if (ts.isPropertyAccessExpression(tree)) { return visitor.propertyAccessExpression(tree, context); }
    if (ts.isCallExpression(tree)) { return visitor.callExpression(tree, context); }
    if (ts.isExpressionStatement(tree)) { return visitor.expressionStatement(tree, context); }
    if (ts.isToken(tree)) { return visitor.token(tree, context); }
    if (ts.isObjectLiteralExpression(tree)) { return visitor.objectLiteralExpression(tree, context); }
    if (ts.isNewExpression(tree)) { return visitor.newExpression(tree, context); }
    if (ts.isPropertyAssignment(tree)) { return visitor.propertyAssignment(tree, context); }
    if (ts.isVariableStatement(tree)) { return visitor.variableStatement(tree, context); }
    if (ts.isVariableDeclarationList(tree)) { return visitor.variableDeclarationList(tree, context); }
    if (ts.isVariableDeclaration(tree)) { return visitor.variableDeclaration(tree, context); }
    if (ts.isJSDoc(tree)) { return visitor.jsDoc(tree, context); }
    if (ts.isArrayLiteralExpression(tree)) { return visitor.arrayLiteralExpression(tree, context); }
    if (ts.isShorthandPropertyAssignment(tree)) { return visitor.shorthandPropertyAssignment(tree, context); }
    if (ts.isForOfStatement(tree)) { return visitor.forOfStatement(tree, context); }
    if (ts.isClassDeclaration(tree)) { return visitor.classDeclaration(tree, context); }
    if (ts.isConstructorDeclaration(tree)) { return visitor.constructorDeclaration(tree, context); }
    if (ts.isPropertyDeclaration(tree)) { return visitor.propertyDeclaration(tree, context); }
    if (ts.isMethodDeclaration(tree)) { return visitor.methodDeclaration(tree, context); }
    if (ts.isInterfaceDeclaration(tree)) { return visitor.interfaceDeclaration(tree, context); }
    if (ts.isPropertySignature(tree)) { return visitor.propertySignature(tree, context); }
    if (ts.isAsExpression(tree)) { return visitor.asExpression(tree, context); }
    if (ts.isPrefixUnaryExpression(tree)) { return visitor.prefixUnaryExpression(tree, context); }
    if (ts.isSpreadAssignment(tree)) {
       if (context.textOf(tree) === '...') { return visitor.ellipsis(tree, context); }
       return visitor.spreadAssignment(tree, context);
    }
    if (ts.isSpreadElement(tree)) {
      if (context.textOf(tree) === '...') { return visitor.ellipsis(tree, context); }
      return visitor.spreadElement(tree, context);
    }
    if (ts.isTemplateExpression(tree)) { return visitor.templateExpression(tree, context); }
    if (ts.isNonNullExpression(tree)) { return visitor.nonNullExpression(tree, context); }
    if (ts.isParenthesizedExpression(tree)) { return visitor.parenthesizedExpression(tree, context); }

    context.reportUnsupported(tree);

    if (options.bestEffort !== false) {
      // When doing best-effort conversion and we don't understand the node type, just return the complete text of it as-is
      return new OTree([context.textOf(tree)]);
    } else {
      // Otherwise, show a placeholder indicating we don't recognize the type
      const nodeKind = ts.SyntaxKind[tree.kind];
      return new UnknownSyntax([`<${nodeKind} ${context.textOf(tree)}>`], ['\n', ...nodeChildren(tree).map(recurse)], {
        indent: 2,
      });
    }
  }
}