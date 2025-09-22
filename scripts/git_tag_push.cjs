const { execSync } = require('child_process');
function run(cmd) {
  console.log('$', cmd);
  return execSync(cmd, { stdio: 'inherit' });
}
try {
  run('git tag -a website-revived -m "Website revived!"');
  run('git push origin website-revived');
  run('git tag --list');
  run('git ls-remote --tags origin');
  console.log('Tag created and pushed.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
