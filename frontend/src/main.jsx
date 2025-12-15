import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Lobby from './pages/Lobby.jsx'

const router = createBrowserRouter([
    { path: '/', element: <Landing /> },
    { path: '/lobby', element: <Lobby /> }
])

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode >,
)
