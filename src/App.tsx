import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MapTool from './components/MapTool'
import ProfitCalculator from './components/ProfitCalculator'
import ETAPredictor from './components/ETAPredictor'
import ZoneTool from './components/ZoneTool'
import { SharedRoute, MultiStopRouteData } from './types'

type View = 'map' | 'profit' | 'eta' | 'zones'

export default function App() {
  const [active, setActive]               = useState<View>('profit')
  const [sharedRoute,    setSharedRoute]  = useState<SharedRoute | null>(null)
  const [multiStopRoute, setMultiStopRoute] = useState<MultiStopRouteData | null>(null)
  /** Miles from the last Map Tool route calculation → auto-fills Profit Calculator */
  const [mapMiles, setMapMiles]           = useState<number | null>(null)

  const handleSendToETA = (route: MultiStopRouteData) => {
    setMultiStopRoute(route)
    setActive('eta')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a192f' }}>
      <Sidebar active={active} setActive={setActive} />
      <main style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto', minWidth: 0 }}>
        {active === 'map' && (
          <MapTool
            sharedRoute={sharedRoute}
            onSendToETA={handleSendToETA}
            onMilesReady={setMapMiles}
          />
        )}
        {active === 'profit' && (
          <ProfitCalculator mapMiles={mapMiles} />
        )}
        {active === 'eta' && (
          <ETAPredictor
            multiStopRoute={multiStopRoute}
            onClearMultiStop={() => setMultiStopRoute(null)}
            onRouteCalculated={setSharedRoute}
          />
        )}
        {active === 'zones' && <ZoneTool />}
      </main>
    </div>
  )
}
