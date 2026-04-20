import React, { useEffect, useRef, useState } from 'react';

interface AdSenseUnitProps {
  client?: string; // Required, but we default to a placeholder to avoid breaking the UI for the demo
  slot?: string;   // Required
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
  className?: string;
  adTest?: 'on' | 'off';
}

export default function AdSenseUnit({
  client = 'ca-pub-4222962726241472',
  slot = '1234567890',
  format = 'auto',
  responsive = true,
  className = '',
  adTest,
}: AdSenseUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // We wrap this inside a try-catch to softly fail if Ad blockers are active or the ad is already loaded
    try {
      if (typeof window !== 'undefined') {
        const adsbygoogle = (window as any).adsbygoogle || [];
        
        // Ensure we don't push multiple times for the same container if React Strict Mode double-invokes
        const isAdLoaded = adRef.current?.getAttribute('data-adsbygoogle-status') === 'done';
        
        if (!isAdLoaded) {
          adsbygoogle.push({});
        }
      }
    } catch (e) {
      console.warn('AdSense no pudo inyectar el bloque publicitario. (Posible AdBlocker detectado):', e);
    }
  }, [isMounted]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-[#161618]/50 border border-white/5 rounded-md min-h-[90px] ${className}`}>
      {/* Fallback visual for layout testing when ads don't load */}
      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
         <span className="font-mono text-[10px] tracking-[2px] uppercase">AnunciaMarket Ad Space</span>
      </div>
      
      {isMounted && (
        <ins
          ref={adRef}
          className="adsbygoogle relative z-10 w-full"
          style={{ display: 'block' }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
          {...(adTest ? { 'data-adtest': adTest } : {})}
        />
      )}
    </div>
  );
}
