import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router'
import { useEffect } from 'react'
import Homepage from './ui/homePage'
import Playingpage from './ui/playingPage/playingPage'
import { requestNotificationPermissionAndRegister } from './utils/swRegistrationUtils'
import { supabase } from './auth_supabase/supabaseClient' 

function App() {

  useEffect(() => {
    // Sottoscriviti ai cambiamenti di stato dell'autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Se l'utente ha fatto il login o se la pagina si è caricata con una sessione già esistente
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        console.log('[App] Sessione rilevata, avvio registrazione notifiche...');
        
        requestNotificationPermissionAndRegister().catch(err => {
          console.error('[App] Errore richiesta notifiche:', err);
        });
      }
    });

    // Cleanup della sottoscrizione quando il componente viene smontato
    return () => {
      subscription.unsubscribe();
    };
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