import { OTree, renderTree } from "../lib/o-tree";

test('test indentation', () => {
  const tree = new OTree(['{'],
    ['\na', '\nb', '\nc'],
    {
      separator: ', ',
      indent: 4,
      suffix: '\n}',
    });

  expect(renderTree(tree)).toEqual('{\n    a,\n    b,\n    c\n}');
});
