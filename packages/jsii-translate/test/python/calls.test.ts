import { expectPython } from "./python";

test('function call', async () => {
  await expectPython(`
  callSomeFunction(1, 2, 3);
  `, `
  call_some_function(1, 2, 3)
  `);
});

test('method call', async () => {
  await expectPython(`
  someObject.callSomeFunction(1, 2, 3);
  `, `
  some_object.call_some_function(1, 2, 3)
  `);
});

test('static function call', async () => {
  await expectPython(`
  SomeObject.callSomeFunction(1, 2, 3);
  `, `
  SomeObject.call_some_function(1, 2, 3)
  `);
});

test('translate this to self when calling', async () => {
  await expectPython(`
  callSomeFunction(this, 25);
  `, `
  call_some_function(self, 25)
  `);
});

test('translate this to self on LHS of object accessor', async () => {
  await expectPython(`
  this.callSomeFunction(25);
  `, `
  self.call_some_function(25)
  `);
});

test('translate object literals in function call', async () => {
  await expectPython(`
  foo(25, { foo: 3, banana: "hello"  });
  `, `
  foo(25, foo=3, banana="hello")
  `);
});

test('translate object literals with newlines', async () => {
  await expectPython(`
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
  await expectPython(`
  foo(25, { foo: 3, deeper: { a: 1, b: 2 });
  `, `
  foo(25, foo=3, deeper={"a": 1, "b": 2})
  `);
});

test('translate object literals second level with newlinesk', async () => {
  await expectPython(`
  foo(25, { foo: 3, deeper: {
    a: 1,
    b: 2
  });
  `, `
  foo(25,
      foo=3,
      deeper={
          "a": 1,
          "b": 2})
  `);
});