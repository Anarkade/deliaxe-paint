const { execSync } = require('child_process');
function run(cmd) {
  console.log('$', cmd);
  execSync(cmd, { stdio: 'inherit' });
}
try {
  run('git add src/locales/translationsImportImage.csv');
  try {
    run('git commit -m "fix(translations): correct es-ES/es-LA for import image strings"');
  } catch (err) {
    console.log('No changes to commit or commit failed: ', err.message);
  }
  run('git push origin main');
  console.log('Done.');
} catch (err) {
  console.error('Error running git commands:', err.message);
  process.exit(1);
}
