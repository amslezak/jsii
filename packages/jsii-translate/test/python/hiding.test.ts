import { expectPython } from "./python";

test('hide top level statements using void directive', () => {
  expectPython(`
  void 'hide';
  function foo(x: number) {
  }
  void 'show';
  foo(3);
  `, `
  foo(3)
  `);
});

test('hide block level statements using void directive', () => {
  expectPython(`
  if (true) {
    console.log('everything is well');
    void 'hide';
    subprocess.exec('rm -rf /');
    void 'show';
  }

  onlyToEndOfBlock();
  `, `
  if True:
      print("everything is well")


  only_to_end_of_block()
  `);
});

test.only('hide parameter sequence', () => {
  expectPython(`
  foo(3, (void 'hide', 4), 5, 6, (void 'show', 7), 8);
  `, `
  foo(3, 8)
  `);
});