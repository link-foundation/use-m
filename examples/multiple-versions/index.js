import('use-m')
  .then(async ({ use }) => { 
    const [lodash3, lodash4] = await Promise.all([
      use('lodash@3'),
      use('lodash@4'),
    ]);
    console.log(`lodash3.add(1, 2) = ${lodash3.add(1, 2)}`);
    console.log(`lodash4.add(1, 2) = ${lodash4.add(1, 2)}`);
  });