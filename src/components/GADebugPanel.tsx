// GADebugPanel removed — replaced with a no-op export to avoid breaking
// any remaining imports during cleanup. The Google Analytics implementation
// continues to live in `src/lib/ga.ts` and is unaffected by this change.
import React from 'react';

export default function GADebugPanel(): JSX.Element | null {
  // Intentionally return null — debug panel removed in production.
  return null;
}
