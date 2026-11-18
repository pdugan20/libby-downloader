/**
 * Tests for the libby download autostart marker
 */

import { AUTOSTART_HASH, consumeAutostartRequest } from '../../shared/autostart';

function fakeHistory() {
  return { state: { route: 'loan' }, replaceState: jest.fn() };
}

describe('consumeAutostartRequest', () => {
  it('reports the request and removes the marker from the address', () => {
    const history = fakeHistory();

    const requested = consumeAutostartRequest(
      { hash: AUTOSTART_HASH, pathname: '/open/loan/1/2', search: '' },
      history
    );

    expect(requested).toBe(true);
    expect(history.replaceState).toHaveBeenCalledWith({ route: 'loan' }, '', '/open/loan/1/2');
  });

  it('ignores pages opened without the marker', () => {
    const history = fakeHistory();

    expect(
      consumeAutostartRequest(
        { hash: '#main-menu', pathname: '/open/loan/1/2', search: '' },
        history
      )
    ).toBe(false);
    expect(history.replaceState).not.toHaveBeenCalled();
  });
});
