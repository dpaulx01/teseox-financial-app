import '@testing-library/jest-dom';

// Mock window.localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.URL for file downloads
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(),
    revokeObjectURL: vi.fn(),
  },
});

// Mock Papa Parse
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
  },
}));