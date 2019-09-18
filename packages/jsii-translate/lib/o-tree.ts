
export interface OTreeOptions {
  /**
   * Add a newline at the end of the prefix.
   *
   * Newline is subject to new indentation.
   */
  newline?: boolean;

  /**
   * Adjust indentation with the given number
   */
  indent?: number;

  /**
   * Separate children with the given string
   */
  separator?: string;

  /**
   * Suffix the token after outdenting
   */
  suffix?: string;

  /**
   * Whether this part of the generated syntax is okay to attach a comment to
   */
  attachComment?: boolean;

  /**
   * If set, a unique key which will cause only one node with the given key to be rendered.
   *
   * The outermost key is the one that will be rendered.
   *
   * Used to make it easier to keep the state necessary to render comments
   * only once in the output tree, rather than keep the state in the
   * language rendered.
   */
  renderOnce?: string;
}

export class OTree {
  public static simplify(xs: Array<OTree | string | undefined>): Array<OTree | string> {
    return xs.filter(notUndefined).filter(notEmpty);
  }

  public readonly attachComment: boolean;

  private readonly prefix: Array<OTree | string>;
  private readonly children: Array<OTree | string>;

  constructor(
    prefix: Array<OTree | string | undefined>,
    children?: Array<OTree | string | undefined>,
    private readonly options: OTreeOptions = {}) {

    this.prefix = OTree.simplify(prefix);
    this.children = OTree.simplify(children || []);
    this.attachComment = !!options.attachComment;
  }

  public write(sink: OTreeSink) {
    if (!sink.tagOnce(this.options.renderOnce)) { return; }

    for (const x of this.prefix) {
      sink.write(x);
    }

    const popIndent = sink.requestIndentChange(this.options.indent || 0);
    if (this.options.newline) { sink.newline(); }

    let mark = sink.mark();
    for (const child of this.children || []) {
      if (this.options.separator && mark.wroteNonWhitespaceSinceMark) { sink.write(this.options.separator); }
      mark = sink.mark();

      sink.write(child);
    }

    popIndent();

    if (this.options.suffix) {
      sink.write(this.options.suffix);
    }
  }

  public get isEmpty() {
    return this.prefix.length + this.children.length === 0;
  }

  public toString() {
    return `<INCORRECTLY STRINGIFIED ${this.prefix}>`;
  }
}

export const NO_SYNTAX = new OTree([]);

export class UnknownSyntax extends OTree {
}

export interface SinkMark {
  readonly wroteNonWhitespaceSinceMark: boolean;
}

export class OTreeSink {
  private readonly indentLevels: number[] = [0];
  private readonly fragments = new Array<string>();
  private singletonsRendered = new Set<string>();
  private pendingIndentChange = 0;

  public tagOnce(key: string | undefined): boolean {
    if (key === undefined) { return true; }
    if (this.singletonsRendered.has(key)) { return false; }
    this.singletonsRendered.add(key);
    return true;
  }

  public mark(): SinkMark {
    const self = this;
    const markIndex = this.fragments.length;

    return {
      get wroteNonWhitespaceSinceMark(): boolean {
        return self.fragments.slice(markIndex).some(s => s.match(/[^\s]/));
      }
    };
  }

  public write(text: string | OTree) {
    if (text instanceof OTree) {
      text.write(this);
    } else {
      if (containsNewline(text)) {
        this.applyPendingIndentChange();
      }
      this.append(text.replace(/\n/g, '\n' + ' '.repeat(this.currentIndent)));
    }
  }

  public newline() {
    this.write('\n');
  }

  public requestIndentChange(x: number): () => void {
    if (x === 0) { return () => undefined; }

    this.pendingIndentChange = x;
    const currentIndentState = this.indentLevels.length;
    const self = this;

    // Return a pop function which will reset to the current indent state,
    // regardless of whether the indent was actually applied or not.
    return () => {
      self.indentLevels.splice(currentIndentState);
      self.pendingIndentChange = 0;
    };
  }

  public toString() {
    // Strip trailing whitespace from every line
    return this.fragments.join('').replace(/[ \t]+$/gm, '');
  }

  private append(x: string) {
    this.fragments.push(x);
  }

  private applyPendingIndentChange() {
    if (this.pendingIndentChange !== 0) {
      this.indentLevels.push(this.currentIndent + this.pendingIndentChange);
      this.pendingIndentChange = 0;
    }
  }

  private get currentIndent() {
    return this.indentLevels[this.indentLevels.length - 1];
  }
}

function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

function notEmpty(x: OTree | string) {
  return x instanceof OTree ? !x.isEmpty : x !== '';
}

export function renderTree(tree: OTree): string {
  const sink = new OTreeSink();
  tree.write(sink);
  return sink.toString();
}

function containsNewline(x: string) {
  return x.indexOf('\n') !== -1;
}
