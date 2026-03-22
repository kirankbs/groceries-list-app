const NetInfo = {
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
  addEventListener: jest.fn(() => jest.fn()),
};

export default NetInfo;
