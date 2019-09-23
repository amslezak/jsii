# jsii-samples

Utility to transcribe example code snippets from TypeScript to other jsii-supported languages.
Knows about jsii conventions to do the translations.

## Compilability

In case of non-compiling samples, the translations will be based off of
grammatical parsing only. On the plus side, this means that snippets do not
have to compile, but on the downside this means we do not have the type
information available to the exact right thing in all instances.

If the samples don't compile or don't have full type information:

- No way to declare typed variables for Java and C#.
- Can only "see" the fields of structs as far as they are declared in the same
  snippet. Inherited fields or structs declared not in the same snippet are
  invisible.
- When we explode a struct parameter into keyword parameters and we pass it on
  to another callable, we can't know which keyword arguments the called function
  actually takes so we just pass all of them (might be too many).
- When structs contain nested structs, Python and other languages need to know
  the types of these fields to generate the right calls.
- Object literals are used both to represent structs as well as to represent
  dictionaries, and without type information it's impossible to determine
  which is which.

## Void masking

In order to make examples compile, boilerplate code may need to be added
that detracts from the example at hand (such as variable declarations
and imports).

This package supports hiding parts of the original source after
translation.

To mark special locations in the source tree, we use the `void`
expression keyword and or the `comma` operator feature to attach this
expression to another expression.  Both are little-used JavaScript
features that are reliably parsed by TypeScript and do not affect the
semantics of the application in which they appear (so the program
executes the same with or without them).

A handy mnemonic for this feature is that you can use it to "send your
code into the void".

### Hiding statements

Statement hiding looks like this:

```ts
before();    // will be shown

void 0;      // start hiding (the argument to 'void' doesn't matter)
middle();    // will not be shown
void 'show'; // stop hiding

after();     // will be shown again
```

Void masking only works to the end of the enclosing scope, so in some
cases you can omit the `void 'show'` directive to turn hiding back off.

To explicit show that code was hidden, pass `'block'` to the void
statement:


```ts
before();

void 'block'; // start hiding, will render a '# ...'
middle();
```

### Hiding expressions

For hiding expressions, we use `comma` expressions to attach a `void`
statement to an expression value without changing the meaning of the
code.

Example:

```ts
foo(1, 2, (void 1, 3));
```

Will render as

```
foo(1, 2)
```

Also supports a visible ellipsis:

```ts
const x = (void '...', 3);
```

Renders to:

```
x = ...
```
