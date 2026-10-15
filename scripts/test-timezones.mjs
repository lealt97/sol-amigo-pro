import { spawnSync } from 'node:child_process';
for (const timezone of ['UTC','America/Sao_Paulo','Pacific/Auckland']) {
  const result=spawnSync(process.execPath,['--import','tsx','--test','tests/calendar.test.ts','tests/dashboard.test.ts'],{env:{...process.env,TZ:timezone},encoding:'utf8'});
  if(result.status!==0){process.stderr.write(result.stdout+result.stderr);process.exit(result.status||1);}
  console.log(`PASS calendar/dashboard in ${timezone}`);
}
