const { use, freeze } = require('../../use.cjs');

(async () => {
  console.log('Testing freeze with CommonJS and chalk...');
  
  // This should get frozen to the latest version
  const chalk = await use('chalk@5.6.2');
  
  console.log('Successfully loaded chalk:', typeof chalk);
  console.log('chalk has red method:', typeof chalk.red === 'function');
})().catch(console.error);