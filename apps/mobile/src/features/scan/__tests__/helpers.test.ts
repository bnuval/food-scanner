import { describe, expect, it } from '@jest/globals';

import { isPermanentDocScanError, isPictureSize, stepZoom, ZOOM_BUTTON_STEP } from '../helpers';
import { scanStrings } from '../strings';

describe('stepZoom', () => {
  it('moves one step in each direction', () => {
    expect(stepZoom(0, 1)).toBe(ZOOM_BUTTON_STEP);
    expect(stepZoom(0.5, -1)).toBeCloseTo(0.5 - ZOOM_BUTTON_STEP, 5);
  });

  it('clamps to 0..1 and reaches both ends exactly', () => {
    let zoom = 0;
    for (let i = 0; i < 20; i += 1) zoom = stepZoom(zoom, 1);
    expect(zoom).toBe(1);
    for (let i = 0; i < 20; i += 1) zoom = stepZoom(zoom, -1);
    expect(zoom).toBe(0);
  });

  it('continues from a pinch-set value', () => {
    expect(stepZoom(0.37, 1)).toBeCloseTo(0.52, 5);
    expect(stepZoom(0.05, -1)).toBe(0);
  });
});

describe('isPermanentDocScanError', () => {
  it('latches only for a missing scanner module or Play services', () => {
    expect(isPermanentDocScanError({ code: 'ERR_DOCUMENT_SCANNER_UNAVAILABLE' })).toBe(true);
    expect(isPermanentDocScanError({ code: 'ERR_GOOGLE_PLAY_SERVICES_UNAVAILABLE' })).toBe(true);
  });

  it('treats other failures as transient', () => {
    expect(isPermanentDocScanError({ code: 'ERR_DOCUMENT_SCANNING_FAILED' })).toBe(false);
    expect(isPermanentDocScanError({ code: 'ERR_MISSING_ACTIVITY' })).toBe(false);
    expect(isPermanentDocScanError(new Error('Document scanning failed: waiting for module'))).toBe(false);
    expect(isPermanentDocScanError(null)).toBe(false);
    expect(isPermanentDocScanError('ERR_DOCUMENT_SCANNER_UNAVAILABLE')).toBe(false);
  });
});

describe('isPictureSize', () => {
  it('accepts camera WxH sizes only', () => {
    expect(isPictureSize('1920x1440')).toBe(true);
    expect(isPictureSize('640x480')).toBe(true);
    expect(isPictureSize('Photo')).toBe(false);
    expect(isPictureSize('0x0')).toBe(false);
    expect(isPictureSize('1920x1440 ')).toBe(false);
    expect(isPictureSize(null)).toBe(false);
  });
});

describe('Hindi counts', () => {
  it('never uses a slash pair that TTS reads as a fraction', () => {
    expect(scanStrings.hi.shutter).not.toMatch(/\{n\}\/\{total\}/);
    expect(scanStrings.hi.stepChip).not.toMatch(/\{n\}\/\{total\}/);
  });
});
