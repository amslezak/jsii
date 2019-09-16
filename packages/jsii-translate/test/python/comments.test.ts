import { expectPython } from "./python";

test('interleave single line comments with function call', () => {
  expectPython(`
  someFunction(arg1, {
    // A comment before arg2
    arg2: 'string',

    // A comment before arg3
    arg3: 'boo'
  });
  `, `
  some_function(arg1,
      # A comment before arg2
      arg2="string",
      # A comment before arg3
      arg3="boo")
  `);
});

test('interleave multiline comments with function call', () => {
  expectPython(`
  someFunction(arg1, {
    /* A comment before arg2 */
    arg2: 'string',

    /* A comment before arg3 */
    arg3: 'boo'
  });
  `, `
  some_function(arg1,
      # A comment before arg2
      arg2="string",
      # A comment before arg3
      arg3="boo")
  `);
});

test('no duplication of comments', () => {
  expectPython(`
  // Here's a comment
  object.member.functionCall(new Class(), "argument");
  `, `
  # Here's a comment
  object.member.function_call(Class(), "argument")
  `);
});