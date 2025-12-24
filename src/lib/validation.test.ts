import { describe, it, expect } from 'vitest';
import { validateAndNormalizeTrackId } from './validation';

describe('validateAndNormalizeTrackId', () => {
  it('should return success for valid numeric track_id', () => {
    const result = validateAndNormalizeTrackId({ track_id: 123 });
    expect(result).toEqual({ success: true, trackId: 123 });
  });

  it('should return success for valid string track_id', () => {
    const result = validateAndNormalizeTrackId({ track_id: '456' });
    expect(result).toEqual({ success: true, trackId: 456 });
  });

  it('should return error if body is missing', () => {
    const result = validateAndNormalizeTrackId(null);
    expect(result).toEqual({ success: false, error: 'track_id is required', status: 400 });
  });

  it('should return error if track_id is missing', () => {
    const result = validateAndNormalizeTrackId({});
    expect(result).toEqual({ success: false, error: 'track_id is required', status: 400 });
  });

  it('should return error for non-numeric track_id', () => {
    const result = validateAndNormalizeTrackId({ track_id: 'abc' });
    expect(result).toEqual({ success: false, error: 'track_id must be a valid positive integer', status: 400 });
  });

  it('should return error for negative track_id', () => {
    const result = validateAndNormalizeTrackId({ track_id: -1 });
    expect(result).toEqual({ success: false, error: 'track_id must be a valid positive integer', status: 400 });
  });

  it('should return error for float track_id', () => {
    const result = validateAndNormalizeTrackId({ track_id: 1.5 });
    expect(result).toEqual({ success: false, error: 'track_id must be a valid positive integer', status: 400 });
  });

  it('should return error for zero track_id', () => {
    const result = validateAndNormalizeTrackId({ track_id: 0 });
    expect(result).toEqual({ success: false, error: 'track_id must be a valid positive integer', status: 400 });
  });
});
