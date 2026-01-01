import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Loader from './components/Loader.jsx'

const Landing = lazy(() => import('./pages/Landing.jsx'))
const Lobby = lazy(() => import('./pages/Lobby.jsx'))
const PlayRoom = lazy(() => import('./pages/PlayRoom.jsx'))

const router = createBrowserRouter([
    { path: '/', element: <Suspense fallback={<Loader/>}><Landing/></Suspense> },
    { path: '/lobby', element: <Suspense fallback={<Loader/>}><Lobby/></Suspense > },
    { path: '/playroom', element: <Suspense fallback={<Loader/>}><PlayRoom/></Suspense > },
])

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    </StrictMode >,
)
