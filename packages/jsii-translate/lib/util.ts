import fs = require('fs-extra');
import os = require('os');
import path = require('path');
import { renderTree, Source, translateTypeScript } from '.';
import { VisualizeAstVisitor } from './visitor';

export function startsWithUppercase(x: string) {
  return x.match(/^[A-Z]/);
}

export function inTempDir<T>(block: () => T): T {
  const origDir = process.cwd();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsii'));
  process.chdir(tmpDir);
  const ret = block();
  process.chdir(origDir);
  fs.removeSync(tmpDir);
  return ret;
}

export function visualizeTypeScriptAst(source: Source) {
  const vis = translateTypeScript(source, new VisualizeAstVisitor(true), );
  return renderTree(vis.tree) + '\n';
}
