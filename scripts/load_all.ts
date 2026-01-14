/**
 * Saarthi-Net Data Ingestion
 * Run all data loaders in sequence
 *
 * Usage: npx ts-node scripts/load_all.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';

const scriptsDir = __dirname;

const loaders = [
  { name: 'Migration Flows', script: 'load_migration.ts' },
  { name: 'Growth Zones', script: 'load_growth.ts' },
  { name: 'Digital Risk', script: 'load_digital_risk.ts' },
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          Saarthi-Net Data Ingestion Pipeline               ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log();

let hasErrors = false;

for (const loader of loaders) {
  console.log(`\n▶ Running: ${loader.name}`);
  console.log('─'.repeat(60));

  try {
    const scriptPath = path.join(scriptsDir, loader.script);
    execSync(`npx ts-node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(scriptsDir, '..'),
    });
    console.log(`✅ ${loader.name} completed successfully\n`);
  } catch (error) {
    console.error(`❌ ${loader.name} failed\n`);
    hasErrors = true;
  }
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
if (hasErrors) {
  console.log('║          ❌ Ingestion completed with errors                ║');
} else {
  console.log('║          ✅ All data ingestion completed                   ║');
}
console.log('╚════════════════════════════════════════════════════════════╝');

process.exit(hasErrors ? 1 : 0);
