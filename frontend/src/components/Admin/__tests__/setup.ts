import '@testing-library/jest-dom';
import { expect, vi } from 'vitest';
import { configure } from '@testing-library/react';

// テストのタイムアウトを設定
vi.setConfig({ testTimeout: 10000 });

// テストライブラリの設定
configure({
  testIdAttribute: 'data-testid',
});

// グローバルモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Date.toLocaleStringのモック
const originalToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  if (locales === 'ja-JP') {
    return '2025-02-19 19:42:53';
  }
  return originalToLocaleString.call(this, locales, options);
};
