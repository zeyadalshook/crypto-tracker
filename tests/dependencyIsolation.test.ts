import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Rule 0.1 Dependency Isolation Static Audit Test
 * STRICT REQUIREMENT:
 * No imports from 'fundamentals' are permitted in:
 * - Statistical Gateway (src/lib/gate/, src/lib/stats/, src/components/evidence/)
 * - Risk Layer (src/lib/risk/)
 * - Execution Engine (src/lib/execution/)
 * - Signal Summary Percentage (src/components/SignalScoreCard.tsx)
 */
test('Rule 0.1: Static Dependency Check - Fundamentals module must remain strictly isolated', () => {
  const restrictedPaths = [
    'src/lib/gate',
    'src/lib/risk',
    'src/lib/execution',
    'src/lib/stats',
    'src/components/evidence',
    'src/components/SignalScoreCard.tsx',
  ];

  const forbiddenImportPatterns = [
    /from\s+['"][^'"]*fundamentals[^'"]*['"]/g,
    /import\s+['"][^'"]*fundamentals[^'"]*['"]/g,
    /require\s*\(\s*['"][^'"]*fundamentals[^'"]*['"]\s*\)/g,
  ];

  const violations: string[] = [];

  function checkFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(filePath);
      for (const file of files) {
        checkFile(path.join(filePath, file));
      }
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenImportPatterns) {
        if (pattern.test(content)) {
          violations.push(`Violation in ${filePath}: matched ${pattern}`);
        }
      }
    }
  }

  for (const p of restrictedPaths) {
    checkFile(p);
  }

  assert.equal(
    violations.length,
    0,
    `Dependency isolation violated! Forbidden imports found:\n${violations.join('\n')}`
  );
});
