import { flags } from '@/lib/flags';
import { bump } from '@/lib/counter';
import { HelloButton } from './hello-button';

export default async function Home() {
  const [visits, greetingV2] = await Promise.all([bump('home_visits'), flags.isOn('release_greeting_v2', 'anonymous')]);
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px', lineHeight: 1.5 }}>
      <h1 data-testid="greeting">{greetingV2 ? 'Привет из нового приветствия!' : 'Привет! Это hello.'}</h1>
      <p>Идея из лаборатории: код, проверки и выкатка — через агента.</p>
      <p data-testid="visits">{visits === null ? 'База не подключена' : `Визитов: ${visits}`}</p>
      <HelloButton />
    </main>
  );
}
