import { expectPython } from "./python";

test('function call', async () => {
  expectPython(`
  callSomeFunction(1, 2, 3);
  `, `
  call_some_function(1, 2, 3)
  `);
});

test('method call', async () => {
  expectPython(`
  someObject.callSomeFunction(1, 2, 3);
  `, `
  some_object.call_some_function(1, 2, 3)
  `);
});

test('static function call', async () => {
  expectPython(`
  SomeObject.callSomeFunction(1, 2, 3);
  `, `
  SomeObject.call_some_function(1, 2, 3)
  `);
});

test('translate this to self when calling', async () => {
  expectPython(`
  callSomeFunction(this, 25);
  `, `
  call_some_function(self, 25)
  `);
});

test('translate this to self on LHS of object accessor', async () => {
  expectPython(`
  this.callSomeFunction(25);
  `, `
  self.call_some_function(25)
  `);
});

test('translate object literals in function call', async () => {
  expectPython(`
  foo(25, { foo: 3, banana: "hello"  });
  `, `
  foo(25, foo=3, banana="hello")
  `);
});

test('translate object literals with newlines', async () => {
  expectPython(`
  foo(25, {
    foo: 3,
    banana: "hello"
  });
  `, `
  foo(25,
      foo=3,
      banana="hello")
  `);
});

test('translate object literals only one level deep', async () => {
  // FIXME: This is wrong! We need the types here!
  expectPython(`
  foo(25, { foo: 3, deeper: { a: 1, b: 2 });
  `, `
  foo(25, foo=3, deeper={"a": 1, "b": 2})
  `);
});

test('translate object literals second level with newlines', async () => {
  expectPython(`
  foo(25, { foo: 3, deeper: {
    a: 1,
    b: 2
  });
  `, `
  foo(25, foo=3, deeper={
          "a": 1,
          "b": 2})
  `);
});

test('will type deep structs directly if type info is available', () => {
  expectPython(`
  interface BaseDeeperStruct {
    a: number;
  }
  interface DeeperStruct extends BaseDeeperStruct {
    b: number;
  }

  interface OuterStruct {
    foo: number;
    deeper: DeeperStruct;
  }

  function foo(x: number, outer: OuterStruct) { }

  foo(25, { foo: 3, deeper: {
    a: 1,
    b: 2
  });
  `, `
  def foo(x, *, foo, deeper):
      pass


  foo(25, foo=3, deeper=DeeperStruct(
          a=1,
          b=2))
  `);
});