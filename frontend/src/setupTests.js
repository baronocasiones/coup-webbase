import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Reset the socket registry between tests so one test's frames cannot be
// asserted by the next. Registered before the WebSocket is installed below;
// the hook body runs at test time, by which point the class is in place.
beforeEach(() => {
  if (window.WebSocket) window.WebSocket.instances.length = 0
})

// Mock sessionStorage
const storageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index) => Object.keys(store)[index] || null,
  }
})()

Object.defineProperty(window, 'sessionStorage', { value: storageMock })

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  // Every socket built during a test, oldest first.
  //
  // Without this the frames a component sends are unreachable: `new
  // WebSocket(...)` is constructed inside the component and never returned, so
  // `_sent` was write-only. That is how the Exchange bug shipped — the payload
  // went out as `["CONTESSA0"]`, the backend's `Influence[...]` lookup raised,
  // and nothing in the suite ever held the frame that would have shown it.
  static instances = []

  constructor(url) {
    this.url = url
    this.readyState = MockWebSocket.OPEN
    this.onopen = null
    this.onclose = null
    this.onmessage = null
    this.onerror = null
    this._sent = []
    MockWebSocket.instances.push(this)
  }

  /** Parsed frames this socket has sent. Convenience over `_sent`. */
  get sentMessages() {
    return this._sent.map((raw) => JSON.parse(raw))
  }

  send(data) {
    this._sent.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) this.onclose({ code: 1000, reason: '' })
  }

  // Test helper to simulate incoming messages
  _simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: typeof data === 'string' ? data : JSON.stringify(data) })
    }
  }
}

Object.defineProperty(window, 'WebSocket', { value: MockWebSocket })

// Mock window.location
delete window.location
window.location = { href: '', assign: vi.fn(), replace: vi.fn() }

// Mock matchMedia — jsdom ships without it, and the motion layer
// (utils/motion.js -> prefersReducedMotion) reads it on every animation.
// Defaults to "motion allowed" so tests exercise the animated code paths.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
