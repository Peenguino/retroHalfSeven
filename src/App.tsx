import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router'
import { useEffect } from 'react'
import Homepage from './userInterfaceComponents/homePage'
import Playingpage from './userInterfaceComponents/playingPage/playingPage'
import { requestNotificationPermissionAndRegister } from './utils/swRegistrationUtils'

function App() {

  // Hook per richiesta permessi notifiche
  useEffect(() => {
    // Richiedi permesso notifiche push e registra subscription
    requestNotificationPermissionAndRegister().catch(err => {
      console.error('[App] Errore richiesta notifiche:', err);
    });
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Homepage/>} />
          <Route path='/playingpage/:gameId' element={<Playingpage/>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
