// Modified by 烟雨: minimal layout without an operator footer.
import * as stylex from '@stylexjs/stylex';
import { Speedtest } from './components/speedtest';
import { loadTargets } from '@/lib/targets';

const PAGE_PADDING = 'clamp(20px, 4vw, 40px)';

const styles = stylex.create({
  main: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: PAGE_PADDING,
    paddingRight: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingLeft: PAGE_PADDING
  }
});

export default function Home() {
  const targets = loadTargets();

  return (
    <main {...stylex.props(styles.main)}>
      <Speedtest targets={targets} />
    </main>
  );
}
