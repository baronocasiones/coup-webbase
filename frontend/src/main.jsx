import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Lobby from './pages/Lobby.jsx'
import PlayRoom from './pages/PlayRoom.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const router = createBrowserRouter([
    { path: '/', element: <Landing /> },
    { path: '/lobby', element: <Lobby /> },
    { path: '/playroom', element: <PlayRoom /> }
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
