import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
});

HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};
