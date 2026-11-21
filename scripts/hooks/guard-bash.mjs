#!/usr/bin/env node
// PreToolUse(Bash): блокирует опасные команды. Код выхода 2 = отказ, причина уходит агенту.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
const cmd = String(input?.tool_input?.command ?? '');

const rules = [
  [/\bgit\s+push\b[^\n]*(\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S+)/, 'force-push запрещён: ошибки исправляются новым коммитом или git revert.'],
  [/--no-verify\b/, '--no-verify запрещён: проверки не обходим.'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard стирает работу. Если правда нужно — спроси владельца.'],
  [/\bgit\s+(branch\s+-D|push\s+\S+\s+--delete|push\s+\S+\s+:)\s*main\b/, 'Удалять main нельзя.'],
  [/\brm\s+-[a-z]*r[a-z]*f?[a-z]*\s+(\/|~|\$HOME|\.\.)(\s|$|\/\s*$)/, 'rm -rf за пределами рабочей папки запрещён.'],
  [/\b(cat|less|more|head|tail|bat|printenv)\b[^\n|]*(\.env\b|\/etc\/lab\/)/, 'Не выводи секреты (.env, /etc/lab) в лог сессии.'],
  [/\b(drop\s+database|dropdb\b)/i, 'Удаление базы — только с явного «да» владельца и через ops.yml.'],
];

for (const [re, why] of rules) {
  if (re.test(cmd)) {
    console.error(`Заблокировано хуком guard-bash: ${why}`);
    process.exit(2);
  }
}

// --amend уже запушенного коммита переписывает историю main
if (/\bgit\s+commit\b.*--amend\b/.test(cmd)) {
  try {
    const remotes = execSync('git branch -r --contains HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (remotes) {
      console.error('Заблокировано хуком guard-bash: HEAD уже запушен — не --amend, а новый коммит.');
      process.exit(2);
    }
  } catch {
    // нет git — пропускаем
  }
}
process.exit(0);
