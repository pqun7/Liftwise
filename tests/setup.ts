import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

window.scrollTo = vi.fn();
// Async IndexedDB writes and lazy routes can exceed one second on release/CI runners.
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
});

HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};
