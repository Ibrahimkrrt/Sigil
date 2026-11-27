import { PreviewDevice } from './preview-device';

export const PREVIEW_DEVICES: Readonly<Record<string, PreviewDevice>> = {
  desktop: { width: 1440, height: 900, label: 'Desktop' },
  tablet: { width: 820, height: 1100, label: 'Tablet' },
  mobile: { width: 390, height: 844, label: 'Mobile' },
};
