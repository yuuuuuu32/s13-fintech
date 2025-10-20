import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import './App.css';
import { useUserStore } from './stores/useUserStore';

function App() {
  const initializeUser = useUserStore((state) => state.initializeUserFromLocalStorage);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Ctrl+휠 스크롤로 인한 확대/축소 방지
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // App.css에서 스타일을 제어하도록 className을 추가
  return (
    <div className="app-container">
      <Outlet />
    </div>
  );
}

export default App;