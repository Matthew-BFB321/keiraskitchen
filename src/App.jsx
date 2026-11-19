import { Routes, Route } from 'react-router-dom'
import Library from './screens/Library.jsx'
import Recipe from './screens/Recipe.jsx'
import CookMode from './screens/CookMode.jsx'
import RecipeBuilder from './screens/RecipeBuilder.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Library />} />
      <Route path="/recipe/:id" element={<Recipe />} />
      <Route path="/recipe/:id/cook" element={<CookMode />} />
      <Route path="/builder" element={<RecipeBuilder />} />
      <Route path="/builder/:id" element={<RecipeBuilder />} />
      <Route path="*" element={<Library />} />
    </Routes>
  )
}
