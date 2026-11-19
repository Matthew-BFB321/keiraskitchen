import { Routes, Route } from 'react-router-dom'
import Library from './screens/Library.jsx'
import Recipe from './screens/Recipe.jsx'
import CookMode from './screens/CookMode.jsx'
import RecipeBuilder from './screens/RecipeBuilder.jsx'
import Import from './screens/Import.jsx'
import DevImport from './dev/DevImport.jsx'
import TimerAlarmHost from './components/TimerAlarmHost.jsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/recipe/:id" element={<Recipe />} />
        <Route path="/recipe/:id/cook" element={<CookMode />} />
        <Route path="/builder" element={<RecipeBuilder />} />
        <Route path="/builder/:id" element={<RecipeBuilder />} />
        <Route path="/import" element={<Import />} />
        {/* Temporary developer page, not linked anywhere */}
        <Route path="/dev/import" element={<DevImport />} />
        <Route path="*" element={<Library />} />
      </Routes>
      {/* Timer alarms ring on every screen */}
      <TimerAlarmHost />
    </>
  )
}
