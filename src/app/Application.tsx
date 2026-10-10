import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import '../styles/index.css';

export function Application() {
  return <RouterProvider router={router} />;
}
