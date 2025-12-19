import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Lobby from './pages/Lobby.jsx'
import PlayRoom from './pages/PlayRoom.jsx'

const router = createBrowserRouter([
    { path: '/', element: <Landing /> },
    { path: '/lobby', element: <Lobby /> },
    { path: '/playroom', element: <PlayRoom /> }
])

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode >,
)
