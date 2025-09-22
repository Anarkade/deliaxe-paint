const { execSync } = require('child_process');

function run(cmd) {
  console.log('$', cmd);
  return execSync(cmd, { stdio: 'inherit' });
}

try {
  run('git add -A');
  try {
    run('git commit -m "chore(build,tools): add preview/inspector scripts and force single vendor chunk"');
  } catch (err) {
    console.log('No changes to commit (git commit returned non-zero).');
  }
  run('git push origin main');
  console.log('Done.');
} catch (err) {
  console.error('Failed to run git commands:', err.message);
  process.exit(1);
}
