import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/index'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your actual client ID

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </StrictMode>,
)