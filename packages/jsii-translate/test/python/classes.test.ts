import { expectPython } from "./python";

test('class declaration with fields and constructor', async () => {
  await expectPython(`
  class MyClass {
    private readonly x: string;

    constructor(y: string) {
      this.x = y;
    }
  }
  `, `
  class MyClass:
      def __init__(self, y):
          self.x = y
  `);
});

test.skip('class with implicit declaration', async () => {
  await expectPython(`
  class MyClass {
    private readonly x = 'bloep';
  }
  `, `
  class MyClass:
      def __init__(self):
          self.x = 'bloep'
  `);
});

test('class with inheritance', async () => {
  await expectPython(`
  class MyClass extends cdk.SomeOtherClass {
  }
  `, `
  class MyClass(cdk.SomeOtherClass):
      pass
  `);
});

test('class with inheritance and super class', async () => {
  await expectPython(`
  class MyClass extends cdk.SomeOtherClass {
    constructor(x: string, y: string) {
      super(x);
    }
  }
  `, `
  class MyClass(cdk.SomeOtherClass):
      def __init__(self, x, y):
          super().__init__(x)
  `);
});

test('class with method', async () => {
  await expectPython(`
  class MyClass extends cdk.SomeOtherClass {
    public someMethod(x: string) {
      console.log(x);
    }
  }
  `, `
  class MyClass(cdk.SomeOtherClass):
      def some_method(self, x):
          print(x)
  `);
});

test('class with props argument', async () => {
  await expectPython(`
  interface MyClassProps {
    readonly prop1: string;
    readonly prop2: number;
  }

  class MyClass extends cdk.SomeOtherClass {
    constructor(scope: cdk.Construct, id: string, props: MyClassProps) {
      super(scope, id, props);

      print(props.prop1);
    }
  }
  `, `
  class MyClass(cdk.SomeOtherClass):
      def __init__(self, scope, id, *, prop1, prop2):
          super().__init__(scope, id, prop1=prop1, prop2=prop2)
          print(prop1)
  `);
});