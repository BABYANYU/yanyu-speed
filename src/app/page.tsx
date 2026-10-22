// Modified by 烟雨: operator footer and accessible license link.
import * as stylex from '@stylexjs/stylex';
import { Speedtest } from './components/speedtest';
import { loadTargets } from '@/lib/targets';
import { bp } from '../styles/breakpoints.stylex';
import { colors } from '../styles/tokens.stylex';

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
  },
  // Aligns with the info row above it.
  footer: {
    width: '100%',
    maxWidth: 1120,
    marginTop: { default: 24, [bp.mobile]: 16, [bp.large]: 32 },
    paddingInline: { default: 16, [bp.mobile]: 12, [bp.large]: 24 },
    fontSize: { default: 13, [bp.large]: 14 },
    lineHeight: 1.3,
    color: colors.inkMuted
  },
  separator: {
    marginInline: 8,
    color: colors.inkFaint
  },
  footerLink: {
    color: colors.ink,
    textDecorationLine: 'underline',
    textDecorationColor: { default: colors.line, ':hover': colors.ink },
    textUnderlineOffset: 3,
    transitionProperty: 'text-decoration-color',
    transitionDuration: '150ms'
  }
});

export default function Home() {
  const targets = loadTargets();

  return (
    <main {...stylex.props(styles.main)}>
      <Speedtest targets={targets} />
      <footer {...stylex.props(styles.footer)}>
        烟雨测速 · 由烟雨定制与运营
        <span aria-hidden {...stylex.props(styles.separator)}>|</span>
        <a href="/licenses.html" {...stylex.props(styles.footerLink)}>开源许可与原作署名</a>
      </footer>
    </main>
  );
}
