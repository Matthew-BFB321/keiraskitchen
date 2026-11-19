import './Placeholder.css'

// Temporary stand-in for screens that haven't been built yet.
export default function Placeholder({ name }) {
  return (
    <main className="placeholder">
      <h1 className="placeholder__name">{name}</h1>
    </main>
  )
}
