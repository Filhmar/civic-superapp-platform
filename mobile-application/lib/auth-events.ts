/**
 * Tiny event bus for auth lifecycle events (STACK_BASIS §8). The root layout
 * listens for "unauthenticated" to tear down session caches and redirect.
 */
export type AuthEvent = "unauthenticated";

type Listener = () => void;

class AuthEvents {
  private listeners = new Map<AuthEvent, Set<Listener>>();

  on(event: AuthEvent, listener: Listener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  emit(event: AuthEvent): void {
    this.listeners.get(event)?.forEach((listener) => listener());
  }
}

export const authEvents = new AuthEvents();
