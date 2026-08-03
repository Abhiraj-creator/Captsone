import { configureStore } from '@reduxjs/toolkit';
import sandboxReducer from '../features/sandbox/state/sandbox.slice';

export const store = configureStore({
  reducer: {
    sandbox: sandboxReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Turn off for simpler date handling in messages
    }),
});

export default store;
