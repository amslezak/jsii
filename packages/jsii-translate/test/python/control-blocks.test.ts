import { expectPython } from "./python";

test('if', async () => {
  await expectPython(`
  if (x == 3) {
    console.log('bye');
  }
  `, `
  if x == 3:
      print("bye")
  `);
});

test('if/then/else', async () => {
  await expectPython(`
  if (x == 3) {
    console.log('bye');
  } else {
    console.log('toodels');
  }
  `, `
  if x == 3:
      print("bye")
  else:
      print("toodels")
  `);
});

test('multiline if/then/else', async () => {
  await expectPython(`
  if (x == 3) {
    x += 1;
    console.log('bye');
  } else {
    console.log('toodels');
  }
  `, `
  if x == 3:
      x += 1
      print("bye")
  else:
      print("toodels")
  `);
});

test('empty control block', async () => {
  await expectPython(`
  if (x == 3) {
  }
  `, `
  if x == 3:
      pass
  `);
});

test('block without braces', async () => {
  await expectPython(`
  if (x == 3) console.log('hello');
  `, `
  if x == 3: print("hello")
  `);
});

test('for/of loop', async () => {
  await expectPython(`
  for (const x of xs) {
    console.log(x);
  }
  `, `
  for x in xs:
      print(x)
  `);
});