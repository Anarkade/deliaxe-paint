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
  // Prune stale worktrees first
  try {
    sh('git worktree prune');
  } catch (e) {
    console.warn('git worktree prune failed (non-fatal):', e && e.message);
  }

  let added = false;
  try {
    if (!fs.existsSync(worktreeDir)) {
      sh(`git worktree add -B gh-pages "${worktreeDir}" origin/gh-pages`);
      added = true;
    } else {
      console.log('Worktree exists:', worktreeDir);
    }
  } catch (e) {
    console.warn('Initial git worktree add failed, trying prune+retry:', e && e.message);
    try {
      sh('git worktree prune');
      if (!fs.existsSync(worktreeDir)) {
        sh(`git worktree add -B gh-pages "${worktreeDir}" origin/gh-pages`);
        added = true;
      }
    } catch (e2) {
      console.error('Failed to ensure worktree exists:', e2 && e2.message);
    }
  }

  // If the dir exists but somehow lacks git metadata, attempt to recreate via prune/remove
  const gitMarker = path.join(worktreeDir, '.git');
  if (!fs.existsSync(gitMarker)) {
    console.log('.git not found in worktree — attempting to remove stale worktree entry and recreate');
    try {
      // Try to remove registered worktree first
      sh(`git worktree remove "${worktreeDir}"`);
    } catch (e) {
      console.warn('git worktree remove failed (will attempt prune):', e && e.message);
      try { sh('git worktree prune'); } catch (e3) { /* ignore */ }
    }
    // Attempt to add again
    try {
      sh(`git worktree add -B gh-pages "${worktreeDir}" origin/gh-pages`);
    } catch (e) {
      console.error('Final attempt to add worktree failed:', e && e.message);
    }
  }

  // Re-check git marker
  if (!fs.existsSync(gitMarker)) {
    console.error('Worktree is not a valid git worktree (no .git). Aborting publish to gh-pages.');
    process.exit(1);
  }

  // Clean worktree (remove everything except .git)
  try {
    sh(`powershell -Command "Get-ChildItem -Path '${worktreeDir}' -Force -Exclude '.git' | Remove-Item -Recurse -Force"`);
  } catch (e) {
    console.warn('Clean worktree step failed (non-fatal):', e && e.message);
  }

  // Copy dist files into worktree using robocopy. robocopy returns non-zero on many non-fatal outcomes,
  // treat exit codes < 8 as success. We'll run it and catch errors.
  try {
    sh(`robocopy "${distDir}" "${worktreeDir}" /MIR /XD .git`);
  } catch (e) {
    // execSync throws when robocopy returns non-zero. Inspect exit code in e.status
    const code = (e && e.status) || 1;
    console.log('robocopy exit code:', code);
    if (code >= 8) {
      console.error('robocopy failed with error code >= 8. Aborting.');
      process.exit(code);
    }
    console.log('robocopy returned non-fatal code (<8), continuing.');
  }

  // Commit & push
  sh(`git -C "${worktreeDir}" add -A`);
  try {
    sh(`git -C "${worktreeDir}" commit -m "chore(gh-pages): publish dist from automated build"`);
  } catch (e) {
    console.log('No changes to commit in gh-pages worktree');
  }
  sh(`git -C "${worktreeDir}" push origin gh-pages`);

  // Print helpful links and start a local preview (vite preview serves dist at localhost)
  console.log('\nPublished to gh-pages. Useful URLs:');
  console.log(`- Local preview: http://localhost:4173/`);
  console.log(`- Production (gh-pages): https://deliaxe-paint.anarka.de/`);
  console.log(`- Production (gh-pages alternate): https://deliaxe-paint.anarka.de/`);

  console.log('\nStarting local preview at http://localhost:4173 (vite preview)');
  try {
    sh(`cd "${repoRoot}" & npx vite preview --port 4173`);
  } catch (e) {
    console.error('Failed to start vite preview (non-fatal):', e && e.message);
  }
}

main();
