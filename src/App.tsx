import { useEffect } from 'react';
import { useJoc } from './store/joc';
import Ulita from './components/Ulita';
import Masa from './components/Masa';
import Anunturi from './components/Anunturi';
import DefinitieFoaie from './components/DefinitieFoaie';

export default function App() {
  const initializeaza = useJoc((s) => s.initializeaza);
  const laMasa = useJoc((s) => s.joc !== null);
  useEffect(() => {
    initializeaza();
  }, [initializeaza]);
  return (
    <main className="app">
      {laMasa ? <Masa /> : <Ulita />}
      <DefinitieFoaie />
      <Anunturi />
    </main>
  );
}
