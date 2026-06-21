import { HexApiError } from './HexApiError';

describe('HexApiError', () => {
  it('is an instance of Error', () => {
    const err = new HexApiError(404, 'Not Found');

    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of HexApiError', () => {
    const err = new HexApiError(404, 'Not Found');

    expect(err).toBeInstanceOf(HexApiError);
  });

  it('has the correct name', () => {
    const err = new HexApiError(404, 'Not Found');

    expect(err.name).toBe('HexApiError');
  });

  it('exposes status and statusText', () => {
    const err = new HexApiError(404, 'Not Found');

    expect(err.status).toBe(404);
    expect(err.statusText).toBe('Not Found');
  });

  it('message includes status and statusText', () => {
    const err = new HexApiError(404, 'Not Found');

    expect(err.message).toContain('404');
    expect(err.message).toContain('Not Found');
  });

  it('can be caught as Error', () => {
    const throwIt = () => {
      throw new HexApiError(500, 'Internal Server Error');
    };

    expect(throwIt).toThrow(Error);
  });

  it('instanceof works after being thrown and caught', () => {
    let caught: unknown;

    try {
      throw new HexApiError(403, 'Forbidden');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(HexApiError);
    expect(caught).toBeInstanceOf(Error);
  });
});
