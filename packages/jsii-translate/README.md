# jsii-translate

Utility to transcribe example code snippets from TypeScript to other jsii-supported languages.
Knows about jsii conventions to do the translations.

## Limitations

The translations are currently based off of grammatical parsing only. On the plus side, this
means that snippets do not have to compile, but on the downside this means we do not have the
type information available to the exact right thing in all instances.

Known limitations of the current approach:

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
