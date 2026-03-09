import React, { useEffect, useState } from 'react';

const Footer: React.FC = () => {
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('-');

  useEffect(() => {
    const tick = async () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setLastUpdateTime(`${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`);

      try {
        const mb = await window.electronAPI.getMemoryUsage();
        setMemoryUsage(Math.round(mb));
      } catch {
        // Leave previous value
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <footer className="flex justify-between items-center border-t bg-gray-200 px-4 py-1.5 text-xs text-gray-600 flex-shrink-0">
      <span>Developed by 13615</span>
      <span>
        메모리 사용: {memoryUsage}MB | 최종 갱신 시각: {lastUpdateTime}
      </span>
    </footer>
  );
};

export default Footer;
