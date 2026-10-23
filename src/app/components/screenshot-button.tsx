'use client';

import * as stylex from '@stylexjs/stylex';
import { flushSync } from 'react-dom';
import { Button } from '@base-ui/react/button';
import { noop } from 'foxts/noop';
import { wait } from 'foxts/wait';
import { toast } from 'sonner';
import { menuStyles } from '../../styles/menu.stylex';
import { useCapturing, usePhase, useRedacted, useRoot, useSetCapturing, useSetRedacted } from '@/context/speedtest';

const RE_TIMESTAMP_SEPARATORS = /[:T]/g;
/** CSS px of page background kept around the captured block. */
const SCREENSHOT_MARGIN = 24;

/** Fallback when the clipboard refuses images: hand the file to the browser's download instead. */
function save(image: Promise<Blob>) {
  return image
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Modified by 烟雨: branded screenshot export filename.
      link.download = `Yanyu.Speed-${new Date().toISOString().slice(0, 19).replaceAll(RE_TIMESTAMP_SEPARATORS, '-')}.png`;
      link.click();
      void wait(1000).then(() => URL.revokeObjectURL(url));
      toast.success('Screenshot saved');
    })
    .catch(() => toast.error('Screenshot failed'));
}

/** Copies a picture of the finished result with personal details masked. */
export function ScreenshotButton({ children }: React.PropsWithChildren) {
  const phase = usePhase();
  const capturing = useCapturing();
  const setCapturing = useSetCapturing();
  const redacted = useRedacted();
  const setRedacted = useSetRedacted();
  const root = useRoot();

  const screenshot = () => {
    const node = root;
    if (node === null) return;
    const wasRedacted = redacted;
    // The clone below has to see the masked details, and Safari only honours clipboard writes
    // issued inside the click itself, so the DOM is updated now rather than after a re-render.
    // eslint-disable-next-line @eslint-react/dom-no-flush-sync -- one flush per click, see above
    flushSync(() => {
      setRedacted(true);
      setCapturing(true);
    });
    // The renderer is only ever needed here, long after load, so it ships as its own chunk.
    const image = import(/* webpackPrefetch: true */ 'modern-screenshot').then(({ domToBlob }) => domToBlob(node, {
      scale: 2,
      width: node.offsetWidth + SCREENSHOT_MARGIN * 2,
      height: node.offsetHeight + SCREENSHOT_MARGIN * 2,
      style: { padding: `${SCREENSHOT_MARGIN}px` },
      backgroundColor: getComputedStyle(document.documentElement).backgroundColor,
      filter: (el) => !(el instanceof HTMLElement) || el.dataset.screenshot !== 'hide'
    }));
    image.catch(noop).finally(() => {
      setRedacted(wasRedacted);
      setCapturing(false);
    });
    // eslint-disable-next-line vibe-proof/react-prefer-foxact-use-clipboard -- image clipboard is optional at runtime; foxact only handles text
    const clipboard = (navigator as { clipboard?: Clipboard }).clipboard;
    const copy = typeof ClipboardItem === 'undefined' || clipboard === undefined
      ? Promise.reject(new Error('Clipboard images are not supported'))

      : clipboard.write([new ClipboardItem({ 'image/png': image })]);
    copy
      .then(() => toast.success('Screenshot copied to clipboard'))
      .catch(() => save(image));
  };

  return (
    <Button
      disabled={phase !== 'done' || capturing}
      onClick={screenshot}
      {...stylex.props(menuStyles.trigger, menuStyles.labelled)}
    >
      {children}
    </Button>
  );
}
