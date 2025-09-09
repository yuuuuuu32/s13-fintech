import { useState, useEffect } from 'react';
import './MatrixRain.css';

export const MatrixRain = () => {
  const [drops, setDrops] = useState([]);

  useEffect(() => {
    const characters = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ01234567890";
    const newDrops = [];
    
    for (let i = 0; i < 20; i++) {
      newDrops.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        char: characters[Math.floor(Math.random() * characters.length)],
        speed: 0.5 + Math.random() * 1,
      });
    }
    setDrops(newDrops);

    const interval = setInterval(() => {
      setDrops(prevDrops => 
        prevDrops.map(drop => ({
          ...drop,
          y: drop.y > 100 ? -10 : drop.y + drop.speed,
          char: characters[Math.floor(Math.random() * characters.length)],
        }))
      );
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="matrix-rain">
      {drops.map(drop => (
        <div
          key={drop.id}
          className="matrix-char"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
          }}
        >
          {drop.char}
        </div>
      ))}
    </div>
  );
};