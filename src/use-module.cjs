const path = require('path');
const fs = require('fs');
const code = fs.readFileSync(path.join(__dirname, 'use.cjs'), 'utf8');
const use = eval(code);
module.exports = { use }