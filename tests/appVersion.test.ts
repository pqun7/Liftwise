import { expect, it } from 'vitest';
import packageMetadata from '../package.json';
import { APP_VERSION } from '../src/app/version';

it('keeps the displayed and backup application version aligned with package release metadata', () => {
  expect(APP_VERSION).toBe(packageMetadata.version);
});
