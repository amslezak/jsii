import ts = require('typescript');

export function isStructInterface(name: string) {
  return !name.startsWith('I');
}

export function isStructType(type: ts.Type) {
  return type.isClassOrInterface()
    && hasFlag(type.objectFlags, ts.ObjectFlags.Interface)
    && isStructInterface(type.symbol.name);
}

function hasFlag<A extends number>(flags: A, test: A) {
  // tslint:disable-next-line:no-bitwise
  return (flags & test) !== 0;
}

export function propertiesOfType(type: ts.Type): string[] {
  return type.isClassOrInterface() ? type.getProperties().map(s => s.name) : [];
}
