import ts = require('typescript');
import { OTree } from '../o-tree';
import { AstContext } from '../visitor';

export function stripCommentMarkers(comment: string, multiline: boolean) {
  if (multiline) {
    return comment
      .replace(/^\/(\*)+( )?/gm, '')
      .replace(/\*\/\s*$/gm, '')
      .replace(/^ \*( )?/gm, '');
  } else {
    return comment.replace(/^\/\/\s?/gm, '');
  }
}

export function stringFromLiteral(expr: ts.Expression) {
  if (ts.isStringLiteral(expr)) {
    return expr.text;
  }
  return '???';
}

/**
 * All types of nodes that can be captured using `nodeOfType`, and the type of Node they map to
 */
export type CapturableNodes = {
  [ts.SyntaxKind.ImportDeclaration]: ts.ImportDeclaration,
  [ts.SyntaxKind.VariableDeclaration]: ts.VariableDeclaration,
  [ts.SyntaxKind.ExternalModuleReference]: ts.ExternalModuleReference,
  [ts.SyntaxKind.NamespaceImport]: ts.NamespaceImport,
  [ts.SyntaxKind.NamedImports]: ts.NamedImports,
  [ts.SyntaxKind.ImportSpecifier]: ts.ImportSpecifier,
};

export type AstMatcher<A> = (nodes?: ts.Node[]) => A | undefined;

/**
 * Return AST children of the given node
 *
 * Difference with node.getChildren():
 *
 * - node.getChildren() must take a SourceFile (will fail if it doesn't get it)
 *   and returns a mix of abstract and concrete syntax nodes.
 * - This function function will ONLY return abstract syntax nodes.
 */
export function nodeChildren(node: ts.Node): ts.Node[] {
  const ret = new Array<ts.Node>();
  node.forEachChild(n => { ret.push(n); });
  return ret;
}

/**
 * Match a single node of a given type
 *
 * Capture name is first so that the IDE can detect eagerly that we're falling into
 * that overload and properly autocomplete the recognized node types from CapturableNodes.
 *
 * Looks like SyntaxList nodes appear in the printed AST, but they don't actually appear
 */
export function nodeOfType<A>(syntaxKind: ts.SyntaxKind, children?: AstMatcher<A>): AstMatcher<A>;
// tslint:disable-next-line:max-line-length
export function nodeOfType<S extends keyof CapturableNodes, N extends string, A>(capture: N, capturableNodeType: S, children?: AstMatcher<A>): AstMatcher<A & {[key in N]: CapturableNodes[S]}>;
// tslint:disable-next-line:max-line-length
export function nodeOfType<S extends keyof CapturableNodes, N extends string, A>(syntaxKindOrCaptureName: ts.SyntaxKind | N, nodeTypeOrChildren?: S | AstMatcher<A>, children?: AstMatcher<A>): AstMatcher<A> | AstMatcher<A & {[key in N]: CapturableNodes[S]}> {
  const capturing = typeof syntaxKindOrCaptureName === 'string';  // Determine which overload we're in (SyntaxKind is a number)

  const realNext = (capturing ? children : nodeTypeOrChildren as AstMatcher<A>) || DONE;
  const realCapture = capturing ? syntaxKindOrCaptureName as N : undefined;
  const realSyntaxKind = capturing ? nodeTypeOrChildren : syntaxKindOrCaptureName;

  return (nodes) => {
    for (const node of nodes || []) {
      if (node.kind === realSyntaxKind) {
        const ret = realNext(nodeChildren(node));
        if (!ret) { continue; }

        if (realCapture) {
          return Object.assign(ret, { [realCapture]: node as CapturableNodes[S] }) as any;
        }
        return ret;
      }
    }
    return undefined;
  };
}

export function anyNode(): AstMatcher<{}>;
export function anyNode<A>(children: AstMatcher<A>): AstMatcher<A>;
export function anyNode<A>(children?: AstMatcher<A>): AstMatcher<A> | AstMatcher<{}> {
  const realNext = children || DONE;
  return nodes => {
    for (const node of nodes || []) {
      const m = realNext(nodeChildren(node));
      if (m) { return m; }
    }
    return undefined;
  };
}

// Does not capture deeper because how would we even represent that?
// tslint:disable-next-line:max-line-length
export function allOfType<S extends keyof CapturableNodes, N extends string, A>(s: S, name: N, children?: AstMatcher<A>): AstMatcher<{[key in N]: Array<CapturableNodes[S]>}> {
  type ArrayType = Array<CapturableNodes[S]>;
  type ReturnType = {[key in N]: ArrayType};
  const realNext = children || DONE;

  return nodes => {
    let ret: ReturnType | undefined;
    for (const node of nodes || []) {
      if (node.kind === s) {
        if (realNext(nodeChildren(node))) {
          if (!ret) { ret = { [name]: new Array<CapturableNodes[S]>() } as ReturnType; }
          ret[name].push(node as any);
        }
      }
    }
    return ret;
  };
}

export const DONE: AstMatcher<{}> = () => ({});

/**
 * Run a matcher against a node and return (or invoke a callback with) the accumulated bindings
 */
export function matchAst<A>(node: ts.Node, matcher: AstMatcher<A>): A | undefined;
export function matchAst<A>(node: ts.Node, matcher: AstMatcher<A>, cb: (bindings: A) => void): boolean;
export function matchAst<A>(node: ts.Node, matcher: AstMatcher<A>, cb?: (bindings: A) => void): boolean | A | undefined {
  const matched = matcher([node]);
  if (cb) {
    if (matched) { cb(matched); }
    return !!matched;
  }
  return matched;
}

/*
function zip<A, B>(xs: Iterable<A>, ys: Iterable<B>): IterableIterator<[A, B | undefined]>;
function zip<A, B, C>(xs: Iterable<A>, ys: Iterable<B>, defY: C): IterableIterator<[A, B | C]>;
function* zip<A, B, C>(xs: Iterable<A>, ys: Iterable<B>, defY?: C): IterableIterator<[A, B | C]> {
  const iterX = xs[Symbol.iterator]();
  const iterY = ys[Symbol.iterator]();

  let x = iterX.next();
  let y = iterY.next();
  while (!x.done) {
    yield [x.value, !y.done ? y.value : defY as any];

    x = iterX.next();
    if (!y.done) { y = iterY.next(); }
  }
}
*/

/**
 * Count the newlines in a given piece of string that aren't in comment blocks
 */
export function countNakedNewlines(str: string) {
  let ret = 0;
  scanText(str, 0, str.length)
      .filter(s => s.type === 'other' || s.type === 'blockcomment')
      .forEach(s => {
        if (s.type === 'other') {
          // Count newlines in non-comments
          for (let i = s.pos; i < s.end; i++) {
            if (str[i] === '\n') { ret++; }
          }
        } else {
          // Discount newlines at the end of block comments
          if (s.hasTrailingNewLine) { ret--; }
        }
      });
  return ret;
}

export function repeatNewlines(str: string) {
  return '\n'.repeat(countNakedNewlines(str));
}

const WHITESPACE = [' ', '\t', '\r', '\n'];

/**
 * Extract single-line and multi-line comments from the given string
 *
 * Rewritten because I can't get ts.getLeadingComments and ts.getTrailingComments to do what I want.
 */
export function extractComments(text: string, start: number): ts.CommentRange[] {
  return scanText(text, start)
      .filter(s => s.type === 'blockcomment' || s.type === 'linecomment')
      .map(s => ({
        kind: s.type === 'blockcomment' ? ts.SyntaxKind.MultiLineCommentTrivia : ts.SyntaxKind.SingleLineCommentTrivia,
        pos: s.pos,
        end: s.end,
        hasTrailingNewLine: s.hasTrailingNewLine
      } as ts.CommentRange));
}

interface TextRange {
  pos: number;
  end: number;
  type: 'linecomment' | 'blockcomment' | 'other';
  hasTrailingNewLine: boolean;
}

/**
 * Extract spans of comments and non-comments out of the string
 *
 * Stop at 'end' when given, or the first non-whitespace character in a
 * non-comment if not given.
 */
function scanText(text: string, start: number, end?: number): TextRange[] {
  const ret: TextRange[] = [];

  let pos = start;
  const stopAtCode = end === undefined;
  if (end === undefined) { end = text.length; }
  while (pos < end) {
    const ch = text[pos];

    if (WHITESPACE.includes(ch)) { pos++; continue; }

    if (ch === '/' && text[pos + 1] === '/') {
      accumulateTextBlock();
      scanSinglelineComment();
      continue;
    }

    if (ch === '/' && text[pos + 1] === '*') {
      accumulateTextBlock();
      scanMultilineComment();
      continue;
    }

    // Non-whitespace, non-comment, must be regular token. End if we're not scanning
    // to a particular location, otherwise continue.
    if (stopAtCode) {
      break;
    }

    pos++;
  }

  accumulateTextBlock();

  return ret;

  function scanMultilineComment() {
    const endOfComment = findNext('*/', pos + 2);
    ret.push({
      type: 'blockcomment',
      hasTrailingNewLine: ['\n', '\r'].includes(text[endOfComment + 2]),
      pos,
      end: endOfComment
    });
    pos = endOfComment + 2;
    start = pos;
  }

  function scanSinglelineComment() {
    const nl = Math.min(findNext('\r', pos + 2), findNext('\n', pos + 2));
    ret.push({
      type: 'linecomment',
      hasTrailingNewLine: true,
      pos,
      end: nl
    });
    pos = nl + 1;
    start = pos;
  }

  function accumulateTextBlock() {
    if (pos - start > 0) {
      ret.push({
        type: 'other',
        hasTrailingNewLine: false,
        pos: start,
        end: pos
      });
      start = pos;
    }
  }

  function findNext(sub: string, startPos: number) {
    const f = text.indexOf(sub, startPos);
    if (f === -1) { return text.length; }
    return f;
  }
}

interface ConvertWithNewlineOptions<C> {
  pushContext?: C;
  prefix?: string;
  suffix?: string;
  indent?: number;

  /**
   * Separator
   *
   * @default ', '
   */
  separator?: string;
}

/**
 * Convert a set children of a parent node, trying to preserve newlines from the original source
 */
export function convertChildrenWithNewlines<C>(
    parentNode: ts.Node,
    childNodes: ReadonlyArray<ts.Node>,
    context: AstContext<C>,
    options: ConvertWithNewlineOptions<C> = {}) {

  const ret = new Array<OTree>();

  const initialNewlines = parentNode && childNodes.length > 0 ? repeatNewlines(context.textFromTo(parentNode, childNodes[0])) : '';

  let separators = initialNewlines;
  let lastNode;
  for (const node of childNodes) {
    const converted = context.convert(node, options.pushContext);

    if (lastNode) { separators = repeatNewlines(context.textBetween(lastNode, node)); }
    lastNode = node;

    if (!converted.isEmpty) {
      ret.push(separators.length > 0 ? new OTree([separators, converted]) : converted);
    }
  }

  return new OTree([options.prefix || ''], ret, {
    indent: options.indent,
    // As a general rule, if you can insert newlines you can attach comments
    attachComment: true,
    separator: options.separator !== undefined ? options.separator : ', ',
    suffix: (initialNewlines.length > 0 ? '\n' : '') + (options.suffix || '')
  });
}
