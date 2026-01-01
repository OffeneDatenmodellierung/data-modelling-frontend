# Performance Guide

## Overview

This document outlines performance optimizations implemented in the data modelling application to ensure smooth user experience, especially with large models.

## Canvas Rendering

### ReactFlow Optimization
- **Virtualization**: Only visible nodes are rendered
- **Memoization**: Canvas nodes use `React.memo` to prevent unnecessary re-renders
- **Debouncing**: Canvas updates are debounced to reduce render frequency

### Large Model Handling
- **Domain-based Organization**: Models split into domains (Conceptual, Logical, Physical)
- **Lazy Loading**: Domains loaded on-demand when tab is selected
- **Pagination**: Large lists paginated (e.g., workspace list)

## State Management

### Zustand Optimization
- **Selective Subscriptions**: Components subscribe only to needed state slices
- **Immer Integration**: Immutable updates without performance penalty
- **Persistence**: State persisted to localStorage/IndexedDB efficiently

### React Query
- **Caching**: API responses cached with 5-minute stale time
- **Background Refetching**: Data refreshed in background
- **Optimistic Updates**: UI updates immediately, syncs in background

## Network Optimization

### WebSocket
- **Message Batching**: Multiple updates batched together
- **Throttling**: Presence updates throttled to reduce network traffic
- **Reconnection**: Exponential backoff prevents server overload

### API Calls
- **Request Debouncing**: Rapid requests debounced
- **Request Cancellation**: Cancelled requests don't process responses
- **Retry Logic**: Failed requests retried with exponential backoff

## Bundle Size

### Code Splitting
- **Route-based Splitting**: Routes loaded on-demand
- **Component Lazy Loading**: Heavy components loaded when needed
- **Dynamic Imports**: SDK and large dependencies loaded dynamically

### Tree Shaking
- **ES Modules**: All dependencies use ES modules
- **Unused Code Elimination**: Dead code removed during build
- **Minification**: Production builds minified

## Memory Management

### Cleanup
- **Event Listeners**: All listeners cleaned up on unmount
- **Timers**: Intervals and timeouts cleared
- **Subscriptions**: Zustand subscriptions unsubscribed

### Garbage Collection
- **Weak References**: Used where appropriate
- **Large Object Cleanup**: Large objects cleared when not needed
- **Array Pooling**: Reused arrays where possible

## Performance Monitoring

### Metrics Tracked
- **Time to Interactive (TTI)**: Target < 3 seconds
- **First Contentful Paint (FCP)**: Target < 1.5 seconds
- **Canvas Render Time**: Target < 16ms per frame
- **API Response Time**: Target < 200ms

### Tools
- **React DevTools Profiler**: Component render profiling
- **Chrome DevTools Performance**: Overall performance analysis
- **Lighthouse**: Performance audits

## Best Practices

### For Developers
1. Use `React.memo` for expensive components
2. Debounce user input handlers
3. Lazy load heavy dependencies
4. Monitor bundle size
5. Profile before optimizing

### For Users
1. Use domain tabs to organize large models
2. Close unused workspaces
3. Clear browser cache if experiencing slowdowns
4. Use offline mode for better performance

## Optimization Checklist

- [x] Canvas virtualization implemented
- [x] Component memoization applied
- [x] State subscriptions optimized
- [x] API caching configured
- [x] Code splitting implemented
- [x] Bundle size optimized
- [x] Memory leaks prevented
- [x] Performance monitoring in place

