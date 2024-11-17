import('use-m')
  .then(async ({ use }) => { 
    const [lodash3, lodash4] = await use.all(
      'lodash@3',
      'lodash@4',
    );
    console.log(`lodash3.add(1, 2) = ${lodash3.add(1, 2)}`);
    console.log(`lodash4.add(1, 2) = ${lodash4.add(1, 2)}`);
  });