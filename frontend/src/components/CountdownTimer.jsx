import React, { useState, useEffect, useEffectEvent } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function CountdownTimer({ expiresAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const notifyExpired = useEffectEvent(() => onExpire?.());

  useEffect(() => {
    if (!expiresAt) return;

    let interval;
    let expired = false;
    const calculateTime = () => {
      if (expired) return;
      const target = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        expired = true;
        setIsExpired(true);
        setTimeLeft(null);
        if (interval) clearInterval(interval);
        notifyExpired();
        return;
      }

      setIsExpired(false);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, totalSeconds: Math.floor(diff / 1000) });
    };

    calculateTime();
    if (!expired) interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (isExpired) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <AlertTriangle className="w-3 h-3" />
        <span>Expired</span>
      </span>
    );
  }

  if (!timeLeft) {
    return <span className="text-xs text-slate-500">Calculating...</span>;
  }

  const isUrgent = timeLeft.totalSeconds < 300; // < 5 mins
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
      isUrgent 
        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
        : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
    }`}>
      <Clock className="w-3 h-3 text-cyan-400" />
      <span>
        {timeLeft.hours > 0 ? `${pad(timeLeft.hours)}:` : ''}
        {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </span>
  );
}
