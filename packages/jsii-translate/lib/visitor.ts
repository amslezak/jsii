import ts = require('typescript');
import { NO_SYNTAX, OTree, UnknownSyntax } from './o-tree';
import { nodeChildren } from './typescript/ast-utils';
import { analyzeImportDeclaration, analyzeImportEquals, ImportStatement } from './typescript/imports';

export interface AstContext {
  sourceFile: ts.SourceFile;

  children(node: ts.Node): OTree[];
  convert(node: ts.Node | undefined): OTree;
  convertAll<A extends ts.Node>(nodes: ReadonlyArray<A>): OTree[];
  textOf(node: ts.Node): string;
  textAt(pos: number, end: number): string;
  report(node: ts.Node, message: string, category?: ts.DiagnosticCategory): void;
}

export interface AstVisitor {
  commentRange(node: ts.CommentRange, context: AstContext): OTree;
  importStatement(node: ImportStatement, context: AstContext): OTree;
  stringLiteral(node: ts.StringLiteral, children: AstContext): OTree;
  functionDeclaration(node: ts.FunctionDeclaration, children: AstContext): OTree;
  identifier(node: ts.Identifier, children: AstContext): OTree;
  block(node: ts.Block, children: AstContext): OTree;
  parameterDeclaration(node: ts.ParameterDeclaration, children: AstContext): OTree;
  returnStatement(node: ts.ReturnStatement, context: AstContext): OTree;
  binaryExpression(node: ts.BinaryExpression, context: AstContext): OTree;
  ifStatement(node: ts.IfStatement, context: AstContext): OTree;
  propertyAccessExpression(node: ts.PropertyAccessExpression, context: AstContext): OTree;
  callExpression(node: ts.CallExpression, context: AstContext): OTree;
  expressionStatement(node: ts.ExpressionStatement, context: AstContext): OTree;
  token<A extends ts.SyntaxKind>(node: ts.Token<A>, context: AstContext): OTree;
  objectLiteralExpression(node: ts.ObjectLiteralExpression, context: AstContext): OTree;
  newExpression(node: ts.NewExpression, context: AstContext): OTree;
  propertyAssignment(node: ts.PropertyAssignment, context: AstContext): OTree;
  variableStatement(node: ts.VariableStatement, context: AstContext): OTree;
  variableDeclarationList(node: ts.VariableDeclarationList, context: AstContext): OTree;
  variableDeclaration(node: ts.VariableDeclaration, context: AstContext): OTree;
  jsDoc(node: ts.JSDoc, context: AstContext): OTree;
  arrayLiteralExpression(node: ts.ArrayLiteralExpression, context: AstContext): OTree;
  shorthandPropertyAssignment(node: ts.ShorthandPropertyAssignment, context: AstContext): OTree;
  forOfStatement(node: ts.ForOfStatement, context: AstContext): OTree;
  classDeclaration(node: ts.ClassDeclaration, context: AstContext): OTree;
  constructorDeclaration(node: ts.ConstructorDeclaration, context: AstContext): OTree;
  propertyDeclaration(node: ts.PropertyDeclaration, context: AstContext): OTree;
  methodDeclaration(node: ts.MethodDeclaration, context: AstContext): OTree;
  interfaceDeclaration(node: ts.InterfaceDeclaration, context: AstContext): OTree;
  propertySignature(node: ts.PropertySignature, context: AstContext): OTree;
}

export class VisualizeAstVisitor implements AstVisitor {
  constructor(private readonly includeHandlerNames?: boolean) {
  }

  public commentRange(node: ts.CommentRange, context: AstContext): OTree {
    return new OTree(['(Comment', context.textAt(node.pos, node.end)], [], { suffix: ')' });
  }

  public jsDoc(_node: ts.JSDoc, _context: AstContext): OTree {
    // Already handled by other doc handlers
    return new OTree([]);
  }

  public importStatement(node: ImportStatement, context: AstContext): OTree {
    return this.defaultNode('importStatement', node.node, context);
  }

  public functionDeclaration(node: ts.FunctionDeclaration, children: AstContext): OTree {
    return this.defaultNode('functionDeclaration', node, children);
  }

  public stringLiteral(node: ts.StringLiteral, children: AstContext): OTree {
    return this.defaultNode('stringLiteral', node, children);
  }

  public identifier(node: ts.Identifier, children: AstContext): OTree {
    return this.defaultNode('identifier', node, children);
  }

  public block(node: ts.Block, children: AstContext): OTree {
    return this.defaultNode('block', node, children);
  }

  public parameterDeclaration(node: ts.ParameterDeclaration, children: AstContext): OTree {
    return this.defaultNode('parameterDeclaration', node, children);
  }

  public returnStatement(node: ts.ReturnStatement, children: AstContext): OTree {
    return this.defaultNode('returnStatement', node, children);
  }

  public binaryExpression(node: ts.BinaryExpression, children: AstContext): OTree {
    return this.defaultNode('binaryExpression', node, children);
  }

  public ifStatement(node: ts.IfStatement, context: AstContext): OTree {
    return this.defaultNode('ifStatement', node, context);
  }

  public propertyAccessExpression(node: ts.PropertyAccessExpression, context: AstContext): OTree {
    return this.defaultNode('propertyAccessExpression', node, context);
  }

  public callExpression(node: ts.CallExpression, context: AstContext): OTree {
    return this.defaultNode('callExpression', node, context);
  }

  public expressionStatement(node: ts.ExpressionStatement, context: AstContext): OTree {
    return this.defaultNode('expressionStatement', node, context);
  }

  public token<A extends ts.SyntaxKind>(node: ts.Token<A>, context: AstContext): OTree {
    return this.defaultNode('token', node, context);
  }

  public objectLiteralExpression(node: ts.ObjectLiteralExpression, context: AstContext): OTree {
    return this.defaultNode('objectLiteralExpression', node, context);
  }

  public newExpression(node: ts.NewExpression, context: AstContext): OTree {
    return this.defaultNode('newExpression', node, context);
  }

  public propertyAssignment(node: ts.PropertyAssignment, context: AstContext): OTree {
    return this.defaultNode('propertyAssignment', node, context);
  }

  public variableStatement(node: ts.VariableStatement, context: AstContext): OTree {
    return this.defaultNode('variableStatement', node, context);
  }

  public variableDeclarationList(node: ts.VariableDeclarationList, context: AstContext): OTree {
    return this.defaultNode('variableDeclarationList', node, context);
  }

  public variableDeclaration(node: ts.VariableDeclaration, context: AstContext): OTree {
    return this.defaultNode('variableDeclaration', node, context);
  }

  public arrayLiteralExpression(node: ts.ArrayLiteralExpression, context: AstContext): OTree {
    return this.defaultNode('arrayLiteralExpression', node, context);
  }

  public shorthandPropertyAssignment(node: ts.ShorthandPropertyAssignment, context: AstContext): OTree {
    return this.defaultNode('shorthandPropertyAssignment', node, context);
  }

  public forOfStatement(node: ts.ForOfStatement, context: AstContext): OTree {
    return this.defaultNode('forOfStatement', node, context);
  }

  public classDeclaration(node: ts.ClassDeclaration, context: AstContext): OTree {
    return this.defaultNode('classDeclaration', node, context);
  }

  public constructorDeclaration(node: ts.ConstructorDeclaration, context: AstContext): OTree {
    return this.defaultNode('constructorDeclaration', node, context);
  }

  public propertyDeclaration(node: ts.PropertyDeclaration, context: AstContext): OTree {
    return this.defaultNode('propertyDeclaration', node, context);
  }

  public methodDeclaration(node: ts.MethodDeclaration, context: AstContext): OTree {
    return this.defaultNode('methodDeclaration', node, context);
  }

  public interfaceDeclaration(node: ts.InterfaceDeclaration, context: AstContext): OTree {
    return this.defaultNode('interfaceDeclaration', node, context);
  }

  public propertySignature(node: ts.PropertySignature, context: AstContext): OTree {
    return this.defaultNode('propertySignature', node, context);
  }

  private defaultNode(handlerName: string, node: ts.Node, context: AstContext): OTree {
    return nimpl(node, context, {
      additionalInfo: this.includeHandlerNames ? handlerName : ''
    });
  }
}

/**
 * A basic visitor that applies for most curly-braces-based languages
 */
export class DefaultVisitor implements AstVisitor {
  public commentRange(node: ts.CommentRange, context: AstContext): OTree {
    return new OTree([
      context.textAt(node.pos, node.end),
      node.hasTrailingNewLine ? '\n' : ''
    ]);
  }

  public jsDoc(_node: ts.JSDoc, _context: AstContext): OTree {
    // Already handled by other doc handlers
    return new OTree([]);
  }

  public importStatement(node: ImportStatement, context: AstContext): OTree {
    return nimpl(node.node, context);
  }

  public functionDeclaration(node: ts.FunctionDeclaration, children: AstContext): OTree {
    return nimpl(node, children);
  }

  public stringLiteral(node: ts.StringLiteral, _children: AstContext): OTree {
    return new OTree([JSON.stringify(node.text)]);
  }

  public identifier(node: ts.Identifier, _children: AstContext): OTree {
    return new OTree([node.text]);
  }

  public block(node: ts.Block, children: AstContext): OTree {
    return new OTree(['{'], children.children(node), {
      newline: true,
      indent: 4,
      suffix: '}',
    });
  }

  public parameterDeclaration(node: ts.ParameterDeclaration, children: AstContext): OTree {
    return nimpl(node, children);
  }

  public returnStatement(node: ts.ReturnStatement, children: AstContext): OTree {
    return new OTree(['return ', children.convert(node.expression)]);
  }

  public binaryExpression(node: ts.BinaryExpression, context: AstContext): OTree {
    return new OTree([
      context.convert(node.left),
      ' ',
      context.textOf(node.operatorToken),
      ' ',
      context.convert(node.right)
    ]);
  }

  public ifStatement(node: ts.IfStatement, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public propertyAccessExpression(node: ts.PropertyAccessExpression, context: AstContext): OTree {
    return new OTree([context.convert(node.expression), '.', context.convert(node.name)]);
  }

  public callExpression(node: ts.CallExpression, context: AstContext): OTree {
    return new OTree([
      context.convert(node.expression),
      '(',
      new OTree([], context.convertAll(node.arguments), { separator: ', ' }),
      ')']);
  }

  public expressionStatement(node: ts.ExpressionStatement, context: AstContext): OTree {
    return context.convert(node.expression);
  }

  public token<A extends ts.SyntaxKind>(node: ts.Token<A>, context: AstContext): OTree {
    return new OTree([context.textOf(node)]);
  }

  public objectLiteralExpression(node: ts.ObjectLiteralExpression, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public newExpression(node: ts.NewExpression, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public propertyAssignment(node: ts.PropertyAssignment, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public variableStatement(node: ts.VariableStatement, context: AstContext): OTree {
    return context.convert(node.declarationList);
  }

  public variableDeclarationList(node: ts.VariableDeclarationList, context: AstContext): OTree {
    return new OTree([], context.convertAll(node.declarations), {
      separator: '\n'
    });
  }

  public variableDeclaration(node: ts.VariableDeclaration, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public arrayLiteralExpression(node: ts.ArrayLiteralExpression, context: AstContext): OTree {
    return new OTree(['['], context.convertAll(node.elements), {
      separator: ',\n',
      suffix: ']',
    });
  }

  public shorthandPropertyAssignment(node: ts.ShorthandPropertyAssignment, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public forOfStatement(node: ts.ForOfStatement, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public classDeclaration(node: ts.ClassDeclaration, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public constructorDeclaration(node: ts.ConstructorDeclaration, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public propertyDeclaration(node: ts.PropertyDeclaration, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public methodDeclaration(node: ts.MethodDeclaration, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public interfaceDeclaration(node: ts.InterfaceDeclaration, context: AstContext): OTree {
    return nimpl(node, context);
  }

  public propertySignature(node: ts.PropertySignature, context: AstContext): OTree {
    return nimpl(node, context);
  }
}

export function nimpl(node: ts.Node, context: AstContext, options: { additionalInfo?: string} = {}) {
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
    separator: '\n'
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

export function visitTree(file: ts.SourceFile, root: ts.Node, visitor: AstVisitor, options: VisitOptions = {}): TranslateResult {
  const diagnostics = new Array<ts.Diagnostic>();

  const context: AstContext = {
    sourceFile: file,
    children(node: ts.Node) {
      return nodeChildren(node).map(recurse);
    },
    convert(node: ts.Node | undefined): OTree {
      if (node === undefined) { return NO_SYNTAX; }
      return recurse(node);
    },
    convertAll<A extends ts.Node>(nodes: ReadonlyArray<A>): OTree[] {
      return nodes.map(recurse);
    },
    textOf(node: ts.Node): string {
      return node.getText(file);
    },
    textAt(pos: number, end: number): string {
      return file.text.substring(pos, end);
    },
    report(node: ts.Node, messageText: string, category: ts.DiagnosticCategory = ts.DiagnosticCategory.Error) {
      diagnostics.push({
        category, code: 0,
        messageText,
        file,
        start: node.getStart(file),
        length: node.getWidth(file)
      });
    }
  };

  const scannedForComments = new Set<number>();

  // Return leading comments, making sure to never return anything for a given
  // starting position more than once. Multiple nodes in the tree may have the
  // same "fullStart" which would return the same comments.
  function getLeadingComments(start: number) {
    if (scannedForComments.has(start)) { return []; }
    scannedForComments.add(start);
    return ts.getLeadingCommentRanges(file.getText(), start) || [];
  }

  return {
    tree: recurse(root),
    diagnostics
  };

  function recurse(tree: ts.Node) {
    // Basic transform of node
    const transformed = transformNode(tree);

    // Add comments
    const leadingComments = getLeadingComments(tree.getFullStart());
    const trailingComments = ts.getTrailingCommentRanges(file.getText(), tree.getEnd()) || [];

    if (leadingComments.length + trailingComments.length > 0) {
      // Combine into a new node
      return new OTree([
        ...leadingComments.map(c => visitor.commentRange(c, context)),
        transformed,
        ...trailingComments.map(c => visitor.commentRange(c, context)),
      ]);
    } else {
      // Let's not unnecessarily complicate the tree with additional levels, just
      // return transformed
      return transformed;
    }
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
