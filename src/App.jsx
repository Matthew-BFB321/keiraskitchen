import { Routes, Route } from 'react-router-dom'
import Library from './screens/Library.jsx'
import Recipe from './screens/Recipe.jsx'
import CookMode from './screens/CookMode.jsx'
import RecipeBuilder from './screens/RecipeBuilder.jsx'
import Import from './screens/Import.jsx'
import Login from './screens/Login.jsx'
import DevImport from './dev/DevImport.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import TimerAlarmHost from './components/TimerAlarmHost.jsx'
import Toast from './components/Toast.jsx'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Everything else needs a logged-in user */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Library />} />
          <Route path="/recipe/:id" element={<Recipe />} />
          <Route path="/recipe/:id/cook" element={<CookMode />} />
          <Route path="/builder" element={<RecipeBuilder />} />
          <Route path="/builder/:id" element={<RecipeBuilder />} />
          <Route path="/import" element={<Import />} />
          {/* Temporary developer page, not linked anywhere */}
          <Route path="/dev/import" element={<DevImport />} />
          <Route path="*" element={<Library />} />
        </Route>
      </Routes>
      {/* Timer alarms ring on every screen */}
      <TimerAlarmHost />
      <Toast />
    </>
  )
}
