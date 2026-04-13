import { useEffect, useRef } from 'react';
import './Universe.css';

export default function Universe() {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="universe-page" id="universe-page">
      <iframe
        ref={iframeRef}
        src={`${import.meta.env.BASE_URL}universe/index.html`}
        title="ROOMI Universe — Ecosystem Map"
        className="universe-iframe"
        loading="eager"
        allow="autoplay"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
