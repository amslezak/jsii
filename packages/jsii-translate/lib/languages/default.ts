import ts = require('typescript');
import { OTree } from '../o-tree';
import { ImportStatement } from '../typescript/imports';
import { AstContext, AstVisitor, nimpl } from "../visitor";

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
    return this.notImplemented(node.node, context);
  }

  public functionDeclaration(node: ts.FunctionDeclaration, children: AstContext<C>): OTree {
    return this.notImplemented(node, children);
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
    return this.notImplemented(node, children);
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

  public prefixUnaryExpression(node: ts.PrefixUnaryExpression, context: AstContext<C>): OTree {

    return new OTree([
      UNARY_OPS[node.operator],
      context.convert(node.operand)
    ]);
  }

  public ifStatement(node: ts.IfStatement, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
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
    return this.notImplemented(node, context);
  }

  public newExpression(node: ts.NewExpression, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public propertyAssignment(node: ts.PropertyAssignment, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
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
    return this.notImplemented(node, context);
  }

  public arrayLiteralExpression(node: ts.ArrayLiteralExpression, context: AstContext<C>): OTree {
    return new OTree(['['], context.convertAll(node.elements), {
      separator: ',\n',
      suffix: ']',
    });
  }

  public shorthandPropertyAssignment(node: ts.ShorthandPropertyAssignment, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public forOfStatement(node: ts.ForOfStatement, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public classDeclaration(node: ts.ClassDeclaration, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public constructorDeclaration(node: ts.ConstructorDeclaration, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public propertyDeclaration(node: ts.PropertyDeclaration, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public methodDeclaration(node: ts.MethodDeclaration, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public interfaceDeclaration(node: ts.InterfaceDeclaration, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public propertySignature(node: ts.PropertySignature, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public asExpression(node: ts.AsExpression, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public spreadElement(node: ts.SpreadElement, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public spreadAssignment(node: ts.SpreadAssignment, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public ellipsis(_node: ts.SpreadElement | ts.SpreadAssignment, _context: AstContext<C>): OTree {
    return new OTree(['...']);
  }

  public templateExpression(node: ts.TemplateExpression, context: AstContext<C>): OTree {
    return this.notImplemented(node, context);
  }

  public nonNullExpression(node: ts.NonNullExpression, context: AstContext<C>): OTree {
    // We default we drop the non-null assertion
    return context.convert(node.expression);
  }

  private notImplemented(node: ts.Node, context: AstContext<C>) {
    context.reportUnsupported(node);
    return nimpl(node, context);
  }
}

const UNARY_OPS: {[op in ts.PrefixUnaryOperator]: string} = {
  [ts.SyntaxKind.PlusPlusToken]: '++',
  [ts.SyntaxKind.MinusMinusToken]: '--',
  [ts.SyntaxKind.PlusToken]: '+',
  [ts.SyntaxKind.MinusToken]: '-',
  [ts.SyntaxKind.TildeToken]: '~',
  [ts.SyntaxKind.ExclamationToken]: '~',
};
