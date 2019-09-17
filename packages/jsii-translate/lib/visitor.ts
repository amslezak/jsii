import ts = require('typescript');
import { NO_SYNTAX, OTree, UnknownSyntax } from './o-tree';
import { extractComments, nodeChildren } from './typescript/ast-utils';
import { analyzeImportDeclaration, analyzeImportEquals, ImportStatement } from './typescript/imports';

export interface AstContext<C> {
  sourceFile: ts.SourceFile;
  currentContext: C;

  children(node: ts.Node, context?: C): OTree[];
  convert(node: ts.Node | undefined, context?: C): OTree;
  convertAll<A extends ts.Node>(nodes: ReadonlyArray<A>, context?: C): OTree[];
  textOf(node: ts.Node): string;
  textAt(pos: number, end: number): string;
  textBetween(node1: ts.Node, node2: ts.Node): string;
  textFromTo(node1: ts.Node, node2: ts.Node): string;
  report(node: ts.Node, message: string, category?: ts.DiagnosticCategory): void;
  attachComments(node: ts.Node, rendered: OTree): OTree;
  typeOfExpression(node: ts.Expression): ts.Type | undefined;
  typeOfType(node: ts.TypeNode): ts.Type;

  /**
   * Indicate that the returned node is a spot to render comments
   *
   * Can't properly do this generically as we don't know which nodes get rendered and which don't.
   */
//  includeComments(node: OTree): OTree;
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
}

export class VisualizeAstVisitor implements AstVisitor<void> {
  public readonly defaultContext: void = undefined;

  constructor(private readonly includeHandlerNames?: boolean) {
  }

  public mergeContext(_old: void, _update: void): void {
    return undefined;
  }

  public commentRange(node: ts.CommentRange, context: AstContext<void>): OTree {
    return new OTree(['(Comment', context.textAt(node.pos, node.end)], [], { suffix: ')' });
  }

  public jsDoc(_node: ts.JSDoc, _context: AstContext<void>): OTree {
    // Already handled by other doc handlers
    return new OTree([]);
  }

  public importStatement(node: ImportStatement, context: AstContext<void>): OTree {
    return this.defaultNode('importStatement', node.node, context);
  }

  public functionDeclaration(node: ts.FunctionDeclaration, children: AstContext<void>): OTree {
    return this.defaultNode('functionDeclaration', node, children);
  }

  public stringLiteral(node: ts.StringLiteral, children: AstContext<void>): OTree {
    return this.defaultNode('stringLiteral', node, children);
  }

  public identifier(node: ts.Identifier, children: AstContext<void>): OTree {
    return this.defaultNode('identifier', node, children);
  }

  public block(node: ts.Block, children: AstContext<void>): OTree {
    return this.defaultNode('block', node, children);
  }

  public parameterDeclaration(node: ts.ParameterDeclaration, children: AstContext<void>): OTree {
    return this.defaultNode('parameterDeclaration', node, children);
  }

  public returnStatement(node: ts.ReturnStatement, children: AstContext<void>): OTree {
    return this.defaultNode('returnStatement', node, children);
  }

  public binaryExpression(node: ts.BinaryExpression, children: AstContext<void>): OTree {
    return this.defaultNode('binaryExpression', node, children);
  }

  public ifStatement(node: ts.IfStatement, context: AstContext<void>): OTree {
    return this.defaultNode('ifStatement', node, context);
  }

  public propertyAccessExpression(node: ts.PropertyAccessExpression, context: AstContext<void>): OTree {
    return this.defaultNode('propertyAccessExpression', node, context);
  }

  public callExpression(node: ts.CallExpression, context: AstContext<void>): OTree {
    return this.defaultNode('callExpression', node, context);
  }

  public expressionStatement(node: ts.ExpressionStatement, context: AstContext<void>): OTree {
    return this.defaultNode('expressionStatement', node, context);
  }

  public token<A extends ts.SyntaxKind>(node: ts.Token<A>, context: AstContext<void>): OTree {
    return this.defaultNode('token', node, context);
  }

  public objectLiteralExpression(node: ts.ObjectLiteralExpression, context: AstContext<void>): OTree {
    return this.defaultNode('objectLiteralExpression', node, context);
  }

  public newExpression(node: ts.NewExpression, context: AstContext<void>): OTree {
    return this.defaultNode('newExpression', node, context);
  }

  public propertyAssignment(node: ts.PropertyAssignment, context: AstContext<void>): OTree {
    return this.defaultNode('propertyAssignment', node, context);
  }

  public variableStatement(node: ts.VariableStatement, context: AstContext<void>): OTree {
    return this.defaultNode('variableStatement', node, context);
  }

  public variableDeclarationList(node: ts.VariableDeclarationList, context: AstContext<void>): OTree {
    return this.defaultNode('variableDeclarationList', node, context);
  }

  public variableDeclaration(node: ts.VariableDeclaration, context: AstContext<void>): OTree {
    return this.defaultNode('variableDeclaration', node, context);
  }

  public arrayLiteralExpression(node: ts.ArrayLiteralExpression, context: AstContext<void>): OTree {
    return this.defaultNode('arrayLiteralExpression', node, context);
  }

  public shorthandPropertyAssignment(node: ts.ShorthandPropertyAssignment, context: AstContext<void>): OTree {
    return this.defaultNode('shorthandPropertyAssignment', node, context);
  }

  public forOfStatement(node: ts.ForOfStatement, context: AstContext<void>): OTree {
    return this.defaultNode('forOfStatement', node, context);
  }

  public classDeclaration(node: ts.ClassDeclaration, context: AstContext<void>): OTree {
    return this.defaultNode('classDeclaration', node, context);
  }

  public constructorDeclaration(node: ts.ConstructorDeclaration, context: AstContext<void>): OTree {
    return this.defaultNode('constructorDeclaration', node, context);
  }

  public propertyDeclaration(node: ts.PropertyDeclaration, context: AstContext<void>): OTree {
    return this.defaultNode('propertyDeclaration', node, context);
  }

  public methodDeclaration(node: ts.MethodDeclaration, context: AstContext<void>): OTree {
    return this.defaultNode('methodDeclaration', node, context);
  }

  public interfaceDeclaration(node: ts.InterfaceDeclaration, context: AstContext<void>): OTree {
    return this.defaultNode('interfaceDeclaration', node, context);
  }

  public propertySignature(node: ts.PropertySignature, context: AstContext<void>): OTree {
    return this.defaultNode('propertySignature', node, context);
  }

  private defaultNode(handlerName: string, node: ts.Node, context: AstContext<void>): OTree {
    return nimpl(node, context, {
      additionalInfo: this.includeHandlerNames ? handlerName : ''
    });
  }
}

/**
 * A basic visitor that applies for most curly-braces-based languages
 */
export abstract class DefaultVisitor<C> implements AstVisitor<C> {
  public abstract readonly defaultContext: C;

  public abstract mergeContext(old: C, update: C): C;

  public commentRange(node: ts.CommentRange, context: AstContext<C>): OTree {
    return new OTree([
      context.textAt(node.pos, node.end),
      node.hasTrailingNewLine ? '\n' : ''
    ]);
  }

  public jsDoc(_node: ts.JSDoc, _context: AstContext<C>): OTree {
    // Already handled by other doc handlers
    return new OTree([]);
  }

  public importStatement(node: ImportStatement, context: AstContext<C>): OTree {
    return nimpl(node.node, context);
  }

  public functionDeclaration(node: ts.FunctionDeclaration, children: AstContext<C>): OTree {
    return nimpl(node, children);
  }

  public stringLiteral(node: ts.StringLiteral, _children: AstContext<C>): OTree {
    return new OTree([JSON.stringify(node.text)]);
  }

  public identifier(node: ts.Identifier, _children: AstContext<C>): OTree {
    return new OTree([node.text]);
  }

  public block(node: ts.Block, children: AstContext<C>): OTree {
    return new OTree(['{'], children.children(node), {
      newline: true,
      indent: 4,
      suffix: '}',
    });
  }

  public parameterDeclaration(node: ts.ParameterDeclaration, children: AstContext<C>): OTree {
    return nimpl(node, children);
  }

  public returnStatement(node: ts.ReturnStatement, children: AstContext<C>): OTree {
    return new OTree(['return ', children.convert(node.expression)]);
  }

  public binaryExpression(node: ts.BinaryExpression, context: AstContext<C>): OTree {
    return new OTree([
      context.convert(node.left),
      ' ',
      context.textOf(node.operatorToken),
      ' ',
      context.convert(node.right)
    ]);
  }

  public ifStatement(node: ts.IfStatement, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public propertyAccessExpression(node: ts.PropertyAccessExpression, context: AstContext<C>): OTree {
    return new OTree([context.convert(node.expression), '.', context.convert(node.name)]);
  }

  public callExpression(node: ts.CallExpression, context: AstContext<C>): OTree {
    return new OTree([
      context.convert(node.expression),
      '(',
      new OTree([], context.convertAll(node.arguments), { separator: ', ' }),
      ')']);
  }

  public expressionStatement(node: ts.ExpressionStatement, context: AstContext<C>): OTree {
    return context.convert(node.expression);
  }

  public token<A extends ts.SyntaxKind>(node: ts.Token<A>, context: AstContext<C>): OTree {
    return new OTree([context.textOf(node)]);
  }

  public objectLiteralExpression(node: ts.ObjectLiteralExpression, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public newExpression(node: ts.NewExpression, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public propertyAssignment(node: ts.PropertyAssignment, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public variableStatement(node: ts.VariableStatement, context: AstContext<C>): OTree {
    return context.convert(node.declarationList);
  }

  public variableDeclarationList(node: ts.VariableDeclarationList, context: AstContext<C>): OTree {
    return new OTree([], context.convertAll(node.declarations), {
      separator: '\n'
    });
  }

  public variableDeclaration(node: ts.VariableDeclaration, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public arrayLiteralExpression(node: ts.ArrayLiteralExpression, context: AstContext<C>): OTree {
    return new OTree(['['], context.convertAll(node.elements), {
      separator: ',\n',
      suffix: ']',
    });
  }

  public shorthandPropertyAssignment(node: ts.ShorthandPropertyAssignment, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public forOfStatement(node: ts.ForOfStatement, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public classDeclaration(node: ts.ClassDeclaration, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public constructorDeclaration(node: ts.ConstructorDeclaration, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public propertyDeclaration(node: ts.PropertyDeclaration, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public methodDeclaration(node: ts.MethodDeclaration, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public interfaceDeclaration(node: ts.InterfaceDeclaration, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }

  public propertySignature(node: ts.PropertySignature, context: AstContext<C>): OTree {
    return nimpl(node, context);
  }
}

export function nimpl<C>(node: ts.Node, context: AstContext<C>, options: { additionalInfo?: string} = {}) {
  const children = context.children(node);

  let syntaxKind = ts.SyntaxKind[node.kind];
  if (syntaxKind === 'FirstPunctuation') {
    // These have the same identifier but this name is more descriptive
    syntaxKind = 'OpenBraceToken';
  }

  const parts = [`(${syntaxKind}`];
  if (options.additionalInfo) { parts.push(`{${options.additionalInfo}}`); }
  parts.push(context.textOf(node));

  return new UnknownSyntax([parts.join(' ')], children, {
    newline: children.length > 0,
    indent: 2,
    suffix: ')',
    separator: '\n',
    attachComment: true
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

export function visitTree<C>(
      file: ts.SourceFile, root: ts.Node, typeChecker: ts.TypeChecker,
      visitor: AstVisitor<C>, options: VisitOptions = {}): TranslateResult {
  const diagnostics = new Array<ts.Diagnostic>();

  const contextStack: C[] = [ visitor.defaultContext ];

  const context: AstContext<C> = {
    sourceFile: file,

    get currentContext(): C {
      return contextStack[contextStack.length - 1];
    },

    children(node: ts.Node, pushContext?: C) {
      if (pushContext !== undefined) { contextStack.push(visitor.mergeContext(context.currentContext, pushContext)); }
      const ret = nodeChildren(node).map(recurse);
      if (pushContext !== undefined) { contextStack.pop(); }
      return ret;
    },
    convert(node: ts.Node | undefined, pushContext?: C): OTree {
      if (node === undefined) { return NO_SYNTAX; }

      if (pushContext !== undefined) { contextStack.push(visitor.mergeContext(context.currentContext, pushContext)); }
      const ret = recurse(node);
      if (pushContext !== undefined) { contextStack.pop(); }
      return ret;
    },
    convertAll<A extends ts.Node>(nodes: ReadonlyArray<A>, pushContext?: C): OTree[] {
      if (pushContext !== undefined) { contextStack.push(visitor.mergeContext(context.currentContext, pushContext)); }
      const ret = nodes.map(recurse);
      if (pushContext !== undefined) { contextStack.pop(); }
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
    textBetween(node1: ts.Node, node2: ts.Node): string {
      return file.text.substring(node1.getEnd(), node2.getStart(file));
    },
    textFromTo(node1: ts.Node, node2: ts.Node): string {
      return file.text.substring(node1.getStart(file), node2.getStart(file));
    },
    attachComments(node: ts.Node, transformed: OTree): OTree {
      // Add comments

      const leadingComments = extractComments(file.text, node.getFullStart());

      // FIXME: No trailing comments for now, they're too tricky
      // const trailingComments = extractComments(file.getText(), tree.getEnd()) || [];
      const trailingComments: ts.CommentRange[] = [];

      if (leadingComments.length + trailingComments.length > 0) {
        // Combine into a new node
        return new OTree([
          ...leadingComments.map(c => visitor.commentRange(c, context)),
          transformed,
          ...trailingComments.map(c => visitor.commentRange(c, context)),
        ], [], { attachComment: true });
      } else {
        // Let's not unnecessarily complicate the tree with additional levels, just
        // return transformed
        return transformed;
      }
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

    return context.attachComments(tree, transformed);
  }

  function transformNode(tree: ts.Node): OTree {
    // Weird nodes
    if (ts.isSourceFile(tree))  {
      return new OTree([], context.convertAll(tree.statements), {
        separator: '\n'
      });
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

    const nodeKind = ts.SyntaxKind[tree.kind];

    // tslint:disable-next-line:max-line-length
    context.report(tree, `This TypeScript language feature (${nodeKind}) is not supported in examples because we cannot translate it. Please rewrite this example.`);

    if (options.bestEffort !== false) {
      // When doing best-effort conversion and we don't understand the node type, just return the complete text of it as-is
      return new OTree([context.textOf(tree)]);
    } else {
      // Otherwise, show a placeholder indicating we don't recognize the type
      return new UnknownSyntax([`<${nodeKind} ${context.textOf(tree)}>`], context.children(tree), {
        newline: true,
        indent: 2,
      });
    }
  }
}
