import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router'
import Homepage from './userInterfaceComponents/homePage'
import PlayingCard from './cardComponents/playingCard'
import Playingpage from './userInterfaceComponents/playingPage'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Homepage/>} />
          <Route path='/playingpage' element={<Playingpage/>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
