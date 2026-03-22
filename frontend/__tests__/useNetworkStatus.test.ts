import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

// Capture the addEventListener listener so tests can trigger network changes
let capturedListener: ((state: any) => void) | null = null;

function triggerNetworkChange(isConnected: boolean, isInternetReachable: boolean = true) {
  if (capturedListener) {
    act(() => {
      capturedListener!({ isConnected, isInternetReachable });
    });
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedListener = null;

  // Default: online
  mockNetInfo.fetch.mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  } as any);

  (mockNetInfo.addEventListener as jest.Mock).mockImplementation((listener) => {
    capturedListener = listener;
    return jest.fn(); // unsubscribe
  });
});

describe('useNetworkStatus', () => {
  it('starts online by default', async () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Wait for the fetch() promise to resolve
    await act(async () => {});

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('reflects offline state when connection drops', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => {});

    triggerNetworkChange(false, false);

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('sets wasOffline=true for one render cycle after coming back online', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => {});

    // Go offline
    triggerNetworkChange(false, false);
    expect(result.current.isOnline).toBe(false);

    // Come back online
    triggerNetworkChange(true, true);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it('wasOffline resets to false after a subsequent state change', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => {});

    // offline → online (wasOffline becomes true)
    triggerNetworkChange(false, false);
    triggerNetworkChange(true, true);
    expect(result.current.wasOffline).toBe(true);

    // Another event (still online) should clear wasOffline
    triggerNetworkChange(true, true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('wasOffline stays false when going from online to offline (not a recovery)', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => {});

    triggerNetworkChange(false, false);

    expect(result.current.wasOffline).toBe(false);
  });

  it('subscribes to NetInfo and unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    (mockNetInfo.addEventListener as jest.Mock).mockReturnValueOnce(unsubscribe);

    const { unmount } = renderHook(() => useNetworkStatus());
    await act(async () => {});

    expect(mockNetInfo.addEventListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('treats isInternetReachable=false as offline even if isConnected=true', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    await act(async () => {});

    triggerNetworkChange(true, false);

    expect(result.current.isOnline).toBe(false);
  });
});
