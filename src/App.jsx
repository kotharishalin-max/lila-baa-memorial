import { useState, useMemo, createContext } from 'react'
import tracks from './data/besnu-tracks.json'
import { bio } from './data/bio.js'
import { children as familyChildren, namedInEulogies } from './data/family.js'

import Hero from './components/Hero.jsx'
import AboutBaa from './components/AboutBaa.jsx'
import FamilyTree from './components/FamilyTree.jsx'
import BesnuSection from './components/BesnuSection.jsx'
import PhotoGallery from './components/PhotoGallery.jsx'
import Footer from './components/Footer.jsx'

export const BesnuContext = createContext({
  currentTrackNumber: null,
  setCurrentTrackNumber: () => {},
})

export default function App() {
  const [currentTrackNumber, setCurrentTrackNumber] = useState(null)
  const ctxValue = useMemo(
    () => ({ currentTrackNumber, setCurrentTrackNumber }),
    [currentTrackNumber],
  )

  return (
    <BesnuContext.Provider value={ctxValue}>
      <Hero bio={bio} />
      <AboutBaa bio={bio} />
      <FamilyTree childrenList={familyChildren} namedInEulogies={namedInEulogies} />
      <BesnuSection tracks={tracks} />
      <PhotoGallery />
      <Footer />
    </BesnuContext.Provider>
  )
}
