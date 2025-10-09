const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd, opts = {}) {
  console.log('> ' + cmd);
  return execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const distDir = path.join(repoRoot, 'dist');
  const worktreeDir = path.join(path.dirname(repoRoot), 'deliaxe-paint-gh-pages');

  if (!fs.existsSync(distDir)) {
    console.error('dist/ not found; run build first');
    process.exit(1);
  }

  // Ensure worktree exists and is on gh-pages
  try {
    sh(`git worktree add -B gh-pages "${worktreeDir}" origin/gh-pages`);
  } catch (e) {
    // ignore if already exists
  }

  // Clean worktree (remove everything except .git)
  sh(`powershell -Command "Get-ChildItem -Path '${worktreeDir}' -Force -Exclude '.git' | Remove-Item -Recurse -Force"`);

  // Copy dist files into worktree
  sh(`robocopy "${distDir}" "${worktreeDir}" /MIR /XD .git`);

  // Commit & push
  sh(`git -C "${worktreeDir}" add -A`);
  try {
    sh(`git -C "${worktreeDir}" commit -m "chore(gh-pages): publish dist from automated build"`);
  } catch (e) {
    console.log('No changes to commit in gh-pages worktree');
  }
  sh(`git -C "${worktreeDir}" push origin gh-pages`);

  // Start a local preview (vite preview serves dist at localhost)
  console.log('Starting local preview at http://localhost:4173 (vite preview)');
  sh(`cd "${repoRoot}" & npx vite preview --port 4173`);
}

main();
