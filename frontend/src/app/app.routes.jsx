import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Dashboard from '../features/sandbox/pages/Dashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/sandbox" replace />,
  },
  {
    path: '/sandbox',
    element: <Dashboard />,
  },
  {
    path: '*',
    element: <Navigate to="/sandbox" replace />,
  }
]);

export default router;
