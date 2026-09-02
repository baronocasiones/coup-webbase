import '@testing-library/jest-dom'
import { vi } from 'vitest'

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

  constructor(url) {
    this.url = url
    this.readyState = MockWebSocket.OPEN
    this.onopen = null
    this.onclose = null
    this.onmessage = null
    this.onerror = null
    this._sent = []
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
