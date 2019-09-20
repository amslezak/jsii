import ts = require('typescript');
import { OTree } from '../o-tree';
import { ImportStatement } from '../typescript/imports';
import { AstContext, AstVisitor, nimpl } from "../visitor";

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

  public asExpression(node: ts.AsExpression, context: AstContext<void>): OTree {
    return this.defaultNode('asExpression', node, context);
  }

  public prefixUnaryExpression(node: ts.PrefixUnaryExpression, context: AstContext<void>): OTree {
    return this.defaultNode('prefixUnaryExpression', node, context);
  }

  public spreadElement(node: ts.SpreadElement, context: AstContext<void>): OTree {
    return this.defaultNode('spreadElement', node, context);
  }

  public spreadAssignment(node: ts.SpreadAssignment, context: AstContext<void>): OTree {
    return this.defaultNode('spreadAssignment', node, context);
  }

  public ellipsis(node: ts.SpreadAssignment | ts.SpreadElement, context: AstContext<void>): OTree {
    return this.defaultNode('ellipsis', node, context);
  }

  public templateExpression(node: ts.TemplateExpression, context: AstContext<void>): OTree {
    return this.defaultNode('templateExpression', node, context);
  }

  public nonNullExpression(node: ts.NonNullExpression, context: AstContext<void>): OTree {
    return this.defaultNode('nonNullExpression', node, context);
  }

  public parenthesizedExpression(node: ts.ParenthesizedExpression, context: AstContext<void>): OTree {
    return this.defaultNode('parenthesizedExpression', node, context);
  }

  public maskingVoidExpression(node: ts.VoidExpression, context: AstContext<void>): OTree {
    return this.defaultNode('maskingVoidExpression', node, context);
  }

  private defaultNode(handlerName: string, node: ts.Node, context: AstContext<void>): OTree {
    return nimpl(node, context, {
      additionalInfo: this.includeHandlerNames ? handlerName : ''
    });
  }
}