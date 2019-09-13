import ts = require('typescript');
import { isStructInterface } from '../jsii/jsii-utils';
import { NO_SYNTAX, OTree, renderTree } from "../o-tree";
import { matchAst, nodeOfType, stripCommentMarkers } from '../typescript/ast-utils';
import { ImportStatement } from '../typescript/imports';
import { startsWithUppercase } from "../util";
import { AstContext, DefaultVisitor, nimpl } from "../visitor";

interface StructVar {
  variableName: string;
  typeName: string;
}

export class PythonVisitor extends DefaultVisitor {
  private readonly structs = new Map<string, StructInformation>();
  private currentStruct: StructInformation | undefined;
  private currentMethod: string | undefined;
  private explodedStructVar: StructVar | undefined;

  public commentRange(node: ts.CommentRange, context: AstContext): OTree {
    const commentText = stripCommentMarkers(context.textAt(node.pos, node.end), node.kind === ts.SyntaxKind.MultiLineCommentTrivia);

    return new OTree([...commentText.split('\n').map(l => `# ${l}\n`)]);
  }

  public importStatement(node: ImportStatement, context: AstContext): OTree {
    const moduleName = this.convertModuleReference(node.packageName);
    if (node.imports.import === 'full') {
      return new OTree([`import ${moduleName} as ${mangleIdentifier(node.imports.alias)}`], [], {
        newline: true,
      });
    }
    if (node.imports.import === 'selective') {
      const imports = node.imports.elements.map(im =>
          im.alias
          ? `${mangleIdentifier(im.sourceName)} as ${mangleIdentifier(im.alias)}`
          : mangleIdentifier(im.sourceName));

      return new OTree([`from ${moduleName} import ${imports.join(', ')}`], [], {
        newline: true,
      });
    }

    return nimpl(node.node, context);
  }

  public token<A extends ts.SyntaxKind>(node: ts.Token<A>, context: AstContext): OTree {
    const text = context.textOf(node);
    if (text === 'this') { return new OTree(['self']); }
    return super.token(node, context);
  }

  public identifier(node: ts.Identifier, _context: AstContext) {
    const originalIdentifier = node.text;
    return new OTree([mangleIdentifier(originalIdentifier)]);
  }

  public functionDeclaration(node: ts.FunctionDeclaration, context: AstContext): OTree {
    return this.functionLike(node, context);
  }

  public constructorDeclaration(node: ts.ConstructorDeclaration, context: AstContext): OTree {
    return this.functionLike(node, context, { isConstructor: true, inClass: true });
  }

  public methodDeclaration(node: ts.MethodDeclaration, context: AstContext): OTree {
    return this.functionLike(node, context, { inClass: true });
  }

  public expressionStatement(node: ts.ExpressionStatement, context: AstContext): OTree {
    const text = context.textOf(node);
    if (text === 'true') { return new OTree(['True']); }
    if (text === 'false') { return new OTree(['False']); }

    return super.expressionStatement(node, context);
  }

  public functionLike(node: ts.FunctionLikeDeclarationBase, context: AstContext, opts: { isConstructor?: boolean, inClass?: boolean } = {}): OTree {
    const methodName = opts.isConstructor ? '__init__' : renderTree(context.convert(node.name));
    this.currentMethod = methodName;

    const [paramDecls, explodedVar] = this.convertFunctionCallParameters(node.parameters, context);
    this.explodedStructVar = explodedVar;

    const ret = new OTree([
      'def ',
      methodName,
      '(',
      new OTree([], [
        opts.inClass ? 'self' : undefined,
        ...paramDecls,
      ], {
        separator: ', ',
      }),
      '): ',
    ], [context.convert(node.body)], {
      suffix: '\n\n'
    });

    this.explodedStructVar = undefined;
    return ret;
  }

  public block(node: ts.Block, context: AstContext): OTree {
    const children = node.statements.length > 0
        ? context.convertAll(node.statements)
        : [new OTree(['pass'])];

    return new OTree([], children, {
      newline: true,
      indent: 4,
      separator: '\n',
    });
  }

  public callExpression(node: ts.CallExpression, context: AstContext): OTree {
    let expressionText: OTree | string = context.convert(node.expression);

    if (matchAst(node.expression, nodeOfType(ts.SyntaxKind.SuperKeyword)) && this.currentMethod) {
      expressionText = 'super().' + this.currentMethod;
    }

    return new OTree([
      expressionText,
      '(',
      this.convertFunctionCallArguments(node.arguments, context),
      ')']);
  }

  public propertyAccessExpression(node: ts.PropertyAccessExpression, context: AstContext) {
    const fullText = context.textOf(node);
    if (fullText in BUILTIN_FUNCTIONS) {
      return new OTree([BUILTIN_FUNCTIONS[fullText]]);
    }

    // We might be in a context where we've exploded this struct into arguments,
    // in which case we will return just the accessed variable.
    if (this.explodedStructVar && context.textOf(node.expression) === this.explodedStructVar.variableName) {
      return context.convert(node.name);
    }

    return super.propertyAccessExpression(node, context);
  }

  public parameterDeclaration(node: ts.ParameterDeclaration, context: AstContext): OTree {
    return new OTree([context.convert(node.name)]);
  }

  public ifStatement(node: ts.IfStatement, context: AstContext): OTree {
    const ifStmt = new OTree(
      ['if ', context.convert(node.expression), ': '],
      [context.convert(node.thenStatement)]);
    const elseStmt = node.elseStatement ? new OTree([`else: `], [context.convert(node.elseStatement)]) : undefined;

    return elseStmt ? new OTree([], [ifStmt, elseStmt], {
      separator: '\n',
    }) : ifStmt;
  }

  public objectLiteralExpression(node: ts.ObjectLiteralExpression, context: AstContext): OTree {
    return new OTree(['{'],
      maybeNewlineSeparated(context.convertAll(node.properties), node, context),
      {
        separator: ', ',
        indent: 4,
        suffix: '}'
      },
    );
  }

  public propertyAssignment(node: ts.PropertyAssignment, context: AstContext): OTree {
    return new OTree([
      '"',
      context.convert(node.name),
      '": ',
      context.convert(node.initializer)
    ]);
  }

  public newExpression(node: ts.NewExpression, context: AstContext): OTree {
    return new OTree([
      context.convert(node.expression),
      '(',
      this.convertFunctionCallArguments(node.arguments, context),
      ')'
    ]);
  }

  public variableDeclaration(node: ts.VariableDeclaration, context: AstContext): OTree {
    return new OTree([
      context.convert(node.name),
      ' = ',
      context.convert(node.initializer)
    ]);
  }

  public thisKeyword() {
    return new OTree(['self']);
  }

  public shorthandPropertyAssignment(node: ts.ShorthandPropertyAssignment, context: AstContext): OTree {
    return new OTree([
      '"',
      context.convert(node.name),
      '": ',
      context.convert(node.name)
    ]);
  }

  public forOfStatement(node: ts.ForOfStatement, context: AstContext): OTree {
    // This is what a "for (const x of ...)" looks like in the AST
    let variableName = '???';

    matchAst(node.initializer,
      nodeOfType(ts.SyntaxKind.VariableDeclarationList,
        nodeOfType('var', ts.SyntaxKind.VariableDeclaration)),
      bindings => {
        variableName = mangleIdentifier(context.textOf(bindings.var.name));
      });

    return new OTree([
      'for ',
      variableName,
      ' in ',
      context.convert(node.expression),
      ': '
    ], [context.convert(node.statement)]);
  }

  public classDeclaration(node: ts.ClassDeclaration, context: AstContext): OTree {
    const heritage = flat(Array.from(node.heritageClauses || []).map(h => Array.from(h.types))).map(t => context.convert(t.expression));
    const hasHeritage = heritage.length > 0;

    const members = context.convertAll(node.members);
    if (members.length === 0) {
      members.push(new OTree(['pass']));
    }

    return new OTree([
      'class ',
      node.name ? context.textOf(node.name) : '???',
      hasHeritage ? '(' : '',
      ...heritage,
      hasHeritage ? ')' : '',
      ': ',
    ], members, {
      separator: '\n\n',
      newline: true,
      indent: 4,
      suffix: '\n\n',
    });
  }

  public propertyDeclaration(_node: ts.PropertyDeclaration, _context: AstContext): OTree {
    return new OTree([]);
  }

  /**
   * We have to do something special here
   *
   * Best-effort, we remember the fields of struct interfaces and keep track of
   * them. Fortunately we can determine from the name whether what to do.
   */
  public interfaceDeclaration(node: ts.InterfaceDeclaration, context: AstContext): OTree {
    const name = context.textOf(node.name);
    if (isStructInterface(name)) {
      this.currentStruct = new StructInformation();

      // Evaluate for side effect
      context.convertAll(node.members);

      this.structs.set(name, this.currentStruct);
      this.currentStruct = undefined;
    }

    // Whatever we do, nothing here will have a representation
    return NO_SYNTAX;
  }

  public propertySignature(node: ts.PropertySignature, context: AstContext): OTree {
    if (this.currentStruct) {
      this.currentStruct.addProperty(mangleIdentifier(context.textOf(node.name)));
    }

    return NO_SYNTAX;
  }

  protected convertModuleReference(ref: string) {
    return ref.replace(/^@/, '').replace(/\//g, '.').replace(/-/g, '_');
  }

  /**
   * Convert parameters
   *
   * If the last one has the type of a known struct, explode to keyword-only arguments.
   *
   * Returns a pair of [decls, excploded-var-name].
   */
  // tslint:disable-next-line:max-line-length
  private convertFunctionCallParameters(params: ts.NodeArray<ts.ParameterDeclaration> | undefined, context: AstContext): [Array<string | OTree>, StructVar | undefined] {
    if (!params || params.length === 0) { return [[], undefined]; }
    const converted: Array<string | OTree> = context.convertAll(params);

    const lastParam = params[params.length - 1];
    const lastParamType = lastParam.type ? context.textOf(lastParam.type) : '';
    const lastParamStruct = this.structs.get(lastParamType);
    if (lastParamStruct) {
      converted.pop();
      converted.push('*', ...lastParamStruct.properties);
    }

    return [converted, lastParam &&  { variableName: context.textOf(lastParam.name), typeName: lastParamType }];
  }

  /**
   * Convert arguments.
   *
   * If the last argument:
   *
   * - is an object literal, explode it.
   * - is itself an exploded
   */
  private convertFunctionCallArguments(args: ts.NodeArray<ts.Expression> | undefined, context: AstContext) {
    if (!args) { return NO_SYNTAX; }
    const converted: Array<OTree | string> = context.convertAll(args);

    if (args.length > 0) {
      const lastArg = args[args.length - 1];
      if (ts.isObjectLiteralExpression(lastArg)) {
        // Object literal, render as keyword arguments
        converted.pop();
        converted.push(...maybeNewlineSeparated(lastArg.properties.map(convertProp), lastArg, context));
      }
      if (this.explodedStructVar && ts.isIdentifier(lastArg) && lastArg.text === this.explodedStructVar.variableName) {
        // Exploded struct, render fields as keyword arguments
        const struct = this.structs.get(this.explodedStructVar.typeName);
        if (struct) {
          converted.pop();
          converted.push(...maybeNewlineSeparated(struct.properties.map(name => new OTree([name, '=', name])), lastArg, context));
        }
      }
    }

    return new OTree([], converted, { separator: ', ', indent: 4 });

    function convertProp(prop: ts.ObjectLiteralElementLike) {
      if (ts.isPropertyAssignment(prop)) {
        return new OTree([context.convert(prop.name), '=', context.convert(prop.initializer)]);
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        return new OTree([context.convert(prop.name), '=', context.convert(prop.name)]);
      } else {
        return new OTree(['???']);
      }
    }
  }
}

/**
 * Try to render an element group as they were in the original source, either by ',' on the same line, or by comma-newline.
 */
function maybeNewlineSeparated(what: Array<OTree | string>, originalNode: ts.Node, context: AstContext) {
  // Simplified newline detection. If there are any newlines, we'll assume the newline use is consistent and
  // we will render the output with newline separation.
  const containsNewline = context.textOf(originalNode).indexOf('\n') !== -1;
  if (!containsNewline) { return what; }

  return [new OTree(['\n'], what, { separator: ',\n' })];
}

function mangleIdentifier(originalIdentifier: string) {
  if (startsWithUppercase(originalIdentifier)) {
    // Probably a class, leave as-is
    return originalIdentifier;
  } else {
    // Turn into snake-case
    return originalIdentifier.replace(/[^A-Z][A-Z]/g, m => m[0].substr(0, 1) + '_' + m.substr(1).toLowerCase());
  }
}

const BUILTIN_FUNCTIONS: {[key: string]: string} = {
  'console.log': 'print',
  'console.error': 'sys.stderr.write',
  'Math.random': 'random.random'
};

function flat<A>(xs: A[][]): A[] {
  return Array.prototype.concat.apply([], xs);
}

class StructInformation {
  public readonly properties: string[] = [];

  public addProperty(name: string) {
    this.properties.push(name);
  }
}