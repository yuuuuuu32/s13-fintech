import { Outlet } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* 라우팅되는 페이지들이 이 자리에 렌더링됩니다. */}
      <Outlet />
    </div>
  )
}

export default App