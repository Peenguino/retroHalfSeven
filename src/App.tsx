import './App.css'
import PlayingCard from './cardComponents/playingCard'

function App() {

  return (
    <div style={{ display: 'flex', 
    flexWrap: 'wrap', // Permette agli elementi di andare a capo
    gap: '20px', 
    padding: '10px', 
    backgroundColor: '#2e7d32', 
    minHeight: '100vh',
    minWidth: '100vh',

     }}>

      <PlayingCard rank="1" suit="denari" />
      <PlayingCard rank="2" suit="denari" />
      <PlayingCard rank="3" suit="denari" />
      <PlayingCard rank="4" suit="denari" />
      <PlayingCard rank="5" suit="denari" />
      <PlayingCard rank="6" suit="denari" />
      <PlayingCard rank="7" suit="denari" />
      <PlayingCard rank="8" suit="denari" />
      <PlayingCard rank="10" suit="denari" />


      <PlayingCard rank="1" suit="spade" />
      <PlayingCard rank="2" suit="spade" />
      <PlayingCard rank="3" suit="spade" />
      <PlayingCard rank="4" suit="spade" />
      <PlayingCard rank="5" suit="spade" />
      <PlayingCard rank="6" suit="spade" />
      <PlayingCard rank="7" suit="spade" />
      <PlayingCard rank="8" suit="spade" />

      <PlayingCard rank="1" suit="bastoni" />
      <PlayingCard rank="2" suit="bastoni" />
      <PlayingCard rank="3" suit="bastoni" />
      <PlayingCard rank="4" suit="bastoni" />
      <PlayingCard rank="5" suit="bastoni" />
      <PlayingCard rank="6" suit="bastoni" />
      <PlayingCard rank="7" suit="bastoni" />
      <PlayingCard rank="8" suit="bastoni" />

      <PlayingCard rank="1" suit="coppe" />
      <PlayingCard rank="2" suit="coppe" />
      <PlayingCard rank="3" suit="coppe" />
      <PlayingCard rank="4" suit="coppe" />
      <PlayingCard rank="5" suit="coppe" />
      <PlayingCard rank="6" suit="coppe" />
      <PlayingCard rank="7" suit="coppe" />
      <PlayingCard rank="8" suit="coppe" />

    </div>
  )
}

export default App
