require('dotenv').config({path: '../../.env'});
require('child_process').execSync('npx tsx reset_user.ts', {stdio: 'inherit'});
