import type { Metadata, Viewport } from 'next';
import type { WebApplication, WithContext } from 'schema-dts';
import { Barlow, Barlow_Semi_Condensed } from 'next/font/google';
import * as stylex from '@stylexjs/stylex';
import { stylexPropsWithClassName } from 'stylex-webpack/utils';
import 'minireset.css';
import '@/styles/globals.css';
import 'stylex-webpack/stylex.css';
import { colors, fonts } from '../styles/tokens.stylex';
import { ThemeScript } from '@/components/theme-script';
import { ColorSchemeProvider } from '@/context/color-scheme-provider';
import { Toasts } from '@/components/toasts';

const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-barlow', display: 'swap' });
const barlowSemiCondensed = Barlow_Semi_Condensed({ subsets: ['latin'], weight: ['500'], variable: '--font-barlow-semi-condensed', display: 'swap' });

const styles = stylex.create({
  html: {
    backgroundColor: colors.surface
  },
  body: {
    minHeight: '100dvh',
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: fonts.sans
  }
});

// Modified by 烟雨: derivative branding, operator metadata and local icon.
const SITE_NAME = 'Yanyu.Speed';
const APP_NAME = 'Yanyu.Speed';
const DESCRIPTION = '测量当前设备到 Cloudflare 的下载、上传速度、延迟与抖动。';

const jsonLd: WithContext<WebApplication> = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: APP_NAME,
  description: DESCRIPTION,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  isAccessibleForFree: true,
  publisher: {
    '@type': 'Organization',
    name: '烟雨'
  },
  isBasedOn: 'https://github.com/SukkaW/speed.skk.moe'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export const metadata: Metadata = {
  title: SITE_NAME,
  description: DESCRIPTION,
  applicationName: APP_NAME,
  publisher: '烟雨',
  icons: {
    icon: { type: 'image/svg+xml', url: '/icon.svg' },
    shortcut: '/icon.svg'
  },
  formatDetection: {
    telephone: false
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'default'
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    title: SITE_NAME,
    siteName: APP_NAME,
    description: DESCRIPTION
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: DESCRIPTION
  },
  robots: {
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1
  }
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning {...stylexPropsWithClassName(stylex.props(styles.html), barlow.variable, barlowSemiCondensed.variable)}>
      <body suppressHydrationWarning {...stylex.props(styles.body)}>
        <ThemeScript />
        <ColorSchemeProvider>
          {children}
          <Toasts />
        </ColorSchemeProvider>
        <script
          type="application/ld+json"
          // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- json ld
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
