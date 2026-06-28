# Summary

The mini cart count is derived from guest cart data in `localStorage`, which is unavailable during SSR. The provider now exposes a hydration-stable count of `0` until it has mounted and loaded browser storage, preventing the server HTML and first client render from disagreeing.
