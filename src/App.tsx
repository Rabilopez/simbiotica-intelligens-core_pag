import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Lazy loaded components for code-splitting
const AIChatbot = lazy(() => import('./components/AIChatbot'));
const AdSenseUnit = lazy(() => import('./components/AdSenseUnit'));
const CapitalNode = lazy(() => import('./components/CapitalNode'));

const KEYWORDS = ["Simbiótica", "Automatizada", "Estratégica", "Predictiva"];
import { 
  ArrowRight, 
  BrainCircuit, 
  Network, 
  Zap, 
  Globe,
  Quote,
  Github,
  Linkedin,
  Mail,
  Phone,
  Code2,
  Play,
  Pause
} from 'lucide-react';

export default function App() {
  const [keywordIndex, setKeywordIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Video Generation State
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState('');

  // Form State
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [formErrors, setFormErrors] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormState(prev => ({ ...prev, [id]: value }));
    // Clear error on change
    if (formErrors[id as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [id]: '' }));
    }
  };

  const validateForm = () => {
    let isValid = true;
    const errors = { name: '', email: '', message: '' };

    if (!formState.name.trim()) {
      errors.name = 'El nombre es obligatorio.';
      isValid = false;
    }
    
    if (!formState.email.trim()) {
      errors.email = 'El email es obligatorio.';
      isValid = false;
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formState.email)) {
      errors.email = 'El formato de email no es válido (ej. correo@dominio.com).';
      isValid = false;
    }

    if (!formState.message.trim()) {
      errors.message = 'El mensaje no puede ir vacío.';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      // Simulate API call
      setTimeout(() => {
        setIsSubmitting(false);
        setFormSuccess(true);
        setFormState({ name: '', email: '', message: '' });
        
        // Reset success message after 5 seconds
        setTimeout(() => setFormSuccess(false), 5000);
      }, 1500);
    }
  };

  const generatePromoVideo = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        setVideoGenerationProgress('Verificando acceso a la Red Central (API Key)...');
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await aistudio.openSelectKey();
        }
      }

      setIsGeneratingVideo(true);
      setVideoGenerationProgress('Iniciando orquestación con modelo Veo. Esto tomará varios minutos...');

      // Dynamically import GenAI only when the user requests a video to save initial bundle size
      const { GoogleGenAI } = await import('@google/genai');

      // Need to re-initialize GenAI inside the call to ensure we use the latest injected key from the dialog
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Fetch the poster image and convert to base64
      setVideoGenerationProgress('Recuperando vector inicial (/logo-dark.jpg)...');
      let imageObject: { imageBytes: string, mimeType: string } | undefined;
      try {
        const imageRes = await fetch('/logo-dark.jpg');
        const imageBlob = await imageRes.blob();
        const buffer = await imageBlob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        imageObject = { imageBytes: base64, mimeType: imageBlob.type || 'image/jpeg' };
      } catch (err) {
        console.warn('No se pudo cargar la imagen para Veo, usando solo prompt', err);
      }

      setVideoGenerationProgress('Enviando prompt a motor Veo...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: 'A futuristic, hyper-realistic cinematic promo video for an AI marketing platform called AnunciaMarket. Glowing golden neural networks and data streams integrating with a business dashboard, showing autonomous decision making and symbiotic growth. Sleek dark aesthetic with neon gold accents.',
        ...(imageObject && { image: imageObject }),
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setVideoGenerationProgress('Sintetizando frames (Polling)... no cierres esta ventana.');
      let attempts = 0;
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
        setVideoGenerationProgress(`Sintetizando frames... (Intento ${attempts}, aprox ${attempts * 10}s)`);
        operation = await ai.operations.getVideosOperation({operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error('La respuesta de Veo no contenía un URI válido.');
      }

      setVideoGenerationProgress('Descargando simulación...');
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': process.env.GEMINI_API_KEY || '',
        },
      });

      if (!response.ok) throw new Error('Falló la descarga del video.');
      
      const videoBlob = await response.blob();
      const videoUrl = URL.createObjectURL(videoBlob);
      
      setGeneratedVideoUri(videoUrl);
      setVideoGenerationProgress('');
      setIsGeneratingVideo(false);
      
      // Auto play the new video
      if (videoRef.current) {
        videoRef.current.load();
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
           playPromise.catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error generando video con Veo:', error);
      
      let errorMessage = 'Error en la orquestación del video. Verifica la consola para más detalles.';
      
      if (typeof error === 'object' && error !== null) {
        const errorStr = JSON.stringify(error) + (error instanceof Error ? error.message : '');
        
        if (errorStr.includes('PERMISSION_DENIED') || errorStr.includes('The caller does not have permission')) {
          errorMessage = 'Permiso Denegado (403): Tu API Key actual no tiene acceso al modelo Veo. Debes usar una clave con facturación o acceso "Early Access" para Veo.';
          if ((window as any).aistudio?.openSelectKey) {
              (window as any).aistudio.openSelectKey();
          }
        } else if (errorStr.includes('Requested entity was not found.')) {
          errorMessage = 'API Key no encontrada o modelo no disponible.';
          if ((window as any).aistudio?.openSelectKey) {
              (window as any).aistudio.openSelectKey();
          }
        }
      }

      alert(errorMessage);
      setIsGeneratingVideo(false);
      setVideoGenerationProgress('');
    }
  };

  const toggleVideo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.debug("Reproducción de video interrumpida dinámicamente:", error);
          });
        }
      } else {
        videoRef.current.pause();
      }
      // Note: setIsVideoPlaying is handled automatically by the native onPlay/onPause listeners attached to the video element.
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setKeywordIndex((prev) => (prev + 1) % KEYWORDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for Video Auto-pause
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Pause the video if it's currently playing but leaves the viewport
          if (!entry.isIntersecting && !videoElement.paused) {
            videoElement.pause();
          }
        });
      },
      { threshold: 0.1 } // Triggers when less than 10% is visible
    );

    observer.observe(videoElement);

    return () => {
      if (videoElement) {
        observer.unobserve(videoElement);
      }
    };
  }, []);

  return (
    <div className="min-h-screen text-[#E0E0E0] bg-[#0A0A0B]" suppressHydrationWarning>
      {/* Navigation */}
      <nav className="sticky top-0 w-full px-10 sm:px-14 py-6 z-50 flex justify-between items-center bg-[#0A0A0B]/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-[#D4AF37]" />
          <span className="font-display italic text-[24px] tracking-[1px] text-[#D4AF37]">AnunciaMarket.</span>
        </div>
        <div className="hidden md:flex items-center gap-[40px] text-[11px] uppercase tracking-[2px]">
          <a href="#ecosistema" className="hover:text-[#D4AF37] transition-colors">Ecosistema</a>
          <a href="#ventajas" className="hover:text-[#D4AF37] transition-colors">Ventajas</a>
          <a href="#contacto" className="hover:text-[#D4AF37] transition-colors">Contacto</a>
          <a href="#contacto" className="btn-primary text-[10px] px-6 py-2 ml-4">
            Suscribirse
          </a>
        </div>
        {/* Mobile Subscribe Button */}
        <div className="md:hidden">
          <a href="#contacto" className="btn-primary text-[10px] px-4 py-2">
            Suscribirse
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="w-full min-h-screen grid lg:grid-cols-[1.2fr_0.8fr]">
        
        {/* Left Column (Text) */}
        <div className="pt-40 lg:pt-0 pr-10 lg:pr-14 pl-10 sm:pl-[60px] flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col"
          >
            <div className="text-[12px] uppercase tracking-[5px] text-[#D4AF37] mb-[20px]">
               Agente Autónomo IA
            </div>
            <h1 className="hero-text font-display mb-[30px] leading-[1.1]">
              Libertad <br />
              Financiera <br />
              <span className="italic text-[#D4AF37] inline-grid overflow-hidden">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={keywordIndex}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="col-start-1 row-start-1 py-2 -my-2 text-[0.8em]"
                  >
                    {KEYWORDS[keywordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
            <p className="text-[16px] leading-[1.6] max-w-[480px] opacity-70 mb-[40px]">
              Modernizando el concepto de la empresa 100% virtual y confiable. Desarrollamos y orquestamos agentes autónomos para brindarte el control absoluto y la verdadera libertad financiera hoy.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-[30px] items-start sm:items-center relative z-20">
              <a href="#contacto" className="btn-primary block text-center">
                Implementar IA
              </a>
              <a href="#video-promo" className="btn-secondary block text-center">
                Ver Demo
              </a>
            </div>
          </motion.div>
        </div>

        {/* Right Column (Visual: Official Dark Logo Showcase) */}
        <div className="relative bg-[#0d0d0f] border-l border-white/5 flex items-center justify-center min-h-[50vh] lg:min-h-screen overflow-hidden">
          
          {/* Subtle luminous halo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-[#D4AF37]/5 blur-[120px] rounded-full pointer-events-none"></div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="w-full h-full max-w-[800px] relative flex flex-col items-center justify-center p-[20px] sm:p-[40px]"
          >
            {/* The primary dark theme logo goes here */}
            {/* mix-blend-lighten ensures that if the image has a dark background, it blends seamlessly into the UI */}
            <img 
              src="/logo-dark.jpg" 
              alt="Logo AnunciaMarket Oficial" 
              className="w-full h-auto object-contain mix-blend-lighten z-10 relative drop-shadow-[0_0_30px_rgba(212,175,55,0.15)]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if(target.parentElement) {
                  target.parentElement.innerHTML += '<div class="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10"><div class="font-display italic text-[5rem] text-[#D4AF37] mb-2 drop-shadow-lg">AM</div><div class="text-[14px] uppercase tracking-[6px] text-white/50 border border-[#D4AF37]/20 p-4 rounded bg-[#0A0A0B]/80 font-semibold backdrop-blur">Sube tu archivo como "logo-dark.jpg" en la raíz o public/</div></div>';
                }
              }}
            />
          </motion.div>
          
          {/* Decorative Grid Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0 mix-blend-overlay"></div>
        </div>

      </main>

      <section className="border-t border-b border-white/5 bg-[#0A0A0B]">
        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5 text-center">
          <div className="p-8 sm:p-12">
            <div className="font-display text-4xl sm:text-5xl text-white mb-2">50+</div>
            <div className="text-[12px] uppercase tracking-[3px] text-[#D4AF37] mb-2 font-bold">Proyectos Autónomos</div>
            <p className="text-[13px] opacity-50 px-4">Operando activamente en el núcleo de nuestra arquitectura.</p>
          </div>
          <div className="p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#D4AF37]/5"></div>
            <div className="font-display text-4xl sm:text-5xl text-white mb-2">100%</div>
            <div className="text-[12px] uppercase tracking-[3px] text-[#D4AF37] mb-2 font-bold flex items-center justify-center gap-2">
              <Code2 className="w-4 h-4" /> Global & Virtual
            </div>
            <p className="text-[13px] opacity-70 px-4 relative z-10 text-white">Consolidando empresas modernas y de confianza absoluta sin fronteras físicas.</p>
          </div>
          <div className="p-8 sm:p-12">
            <div className="font-display text-4xl sm:text-5xl text-white mb-2 italic">Infinito</div>
            <div className="text-[12px] uppercase tracking-[3px] text-[#D4AF37] mb-2 font-bold">Simbiosis Cognitiva</div>
            <p className="text-[13px] opacity-50 px-4">Nuestros agentes se adaptan y evolucionan constantemente mediante tu interacción.</p>
          </div>
        </div>
      </section>

      {/* Value Proposition / Features Bento Grid */}
      <section id="ecosistema" className="pt-24 pb-0 max-w-[1400px] mx-auto w-full">
        <div className="px-10 sm:px-14 mb-[60px] flex flex-col lg:flex-row gap-10 justify-between items-start lg:items-end">
          <div className="max-w-[700px]">
             <div className="flex items-center gap-3 mb-6">
               <div className="h-[2px] w-[40px] bg-[#D4AF37]"></div>
               <span className="text-[12px] uppercase tracking-[4px] text-[#D4AF37] font-bold">El Nodo Central</span>
             </div>
            <h2 className="font-display text-5xl font-medium mb-[20px] text-white">Arquitectura de Operación.</h2>
            <p className="opacity-70 text-[16px] leading-[1.6]">
              Alojados en la infraestructura de <strong>Google AI Studio</strong> como nuestro Sistema Operativo Central, orquestamos cada proyecto y agente. No somos simple software; somos tu asistente virtual autónomo que evoluciona hasta lograr una simbiosis perfecta con tu empresa.
            </p>
          </div>
          <div className="text-left lg:text-right border-l lg:border-l-0 lg:border-r border-[#D4AF37]/50 pl-6 lg:pl-0 lg:pr-6 py-2">
            <p className="font-display italic text-2xl text-white">José Raby López Martínez</p>
            <p className="text-[12px] uppercase tracking-[2px] text-[#D4AF37] opacity-80 mt-1">Fundador & Visionario</p>
          </div>
        </div>

        {/* Elegant Dark Service Bar Layout (adjusted to grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 section-border bg-[#0D0D0F]">
          
          <div className="p-[40px] sm:p-[60px] border-b md:border-b-0 md:border-r border-white/10 group flex flex-col justify-between min-h-[320px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
              whileInView={{ opacity: 0.7, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-8 relative group/icon w-max cursor-help"
            >
              <Network className="w-6 h-6 text-[#D4AF37]" />
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[130%] mb-2 w-[220px] p-3 bg-[#D4AF37] text-black opacity-0 group-hover/icon:opacity-100 group-hover/icon:-translate-y-1 transition-all duration-300 pointer-events-none z-20 shadow-[0_10px_30px_rgba(212,175,55,0.2)] rounded-[2px] text-left">
                <strong className="block text-[10px] font-extrabold tracking-[1px] uppercase mb-1">Orquestación Validada</strong>
                <span className="block text-[11px] leading-[1.5] font-medium opacity-90">Cada código implementado se despliega conforme a su proyecto y SDK, generando interfaces de usuario óptimas en tiempo real.</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#D4AF37]"></div>
              </div>
            </motion.div>
            <div>
              <div className="font-display italic text-[#D4AF37] text-[18px] mb-[10px]">01.</div>
              <h3 className="text-[14px] font-semibold tracking-[1px] uppercase text-white mb-3">Orquestación Validada</h3>
              <p className="opacity-70 text-[14px] leading-[1.6]">
                Cada código implementado se despliega conforme a su proyecto y SDK, generando interfaces de usuario óptimas en tiempo real.
              </p>
            </div>
          </div>

          <div className="p-[40px] sm:p-[60px] border-b md:border-b-0 md:border-r border-white/10 group flex flex-col justify-between min-h-[320px] bg-[#161618]">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
              whileInView={{ opacity: 0.7, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="mb-8 relative group/icon w-max cursor-help"
            >
              <Zap className="w-6 h-6 text-[#D4AF37]" />
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[130%] mb-2 w-[220px] p-3 bg-[#D4AF37] text-black opacity-0 group-hover/icon:opacity-100 group-hover/icon:-translate-y-1 transition-all duration-300 pointer-events-none z-20 shadow-[0_10px_30px_rgba(212,175,55,0.2)] rounded-[2px] text-left">
                <strong className="block text-[10px] font-extrabold tracking-[1px] uppercase mb-1">Decisión Autónoma</strong>
                <span className="block text-[11px] leading-[1.5] font-medium opacity-90">Razonamiento cognitivo avanzado que evalúa múltiples variables para tomar decisiones favorables de manera proactiva e instantánea para tu empresa.</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#D4AF37]"></div>
              </div>
            </motion.div>
            <div>
               <div className="font-display italic text-[#D4AF37] text-[18px] mb-[10px]">02.</div>
              <h3 className="text-[14px] font-semibold tracking-[1px] uppercase text-white mb-3">Decisión Autónoma</h3>
              <p className="opacity-70 text-[14px] leading-[1.6]">
                Razonamiento cognitivo para tomar decisiones favorables de manera proactiva e instantánea.
              </p>
            </div>
          </div>

          <div className="p-[40px] sm:p-[60px] group flex flex-col justify-between min-h-[320px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
              whileInView={{ opacity: 0.7, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="mb-8 relative group/icon w-max cursor-help"
            >
              <Globe className="w-6 h-6 text-[#D4AF37]" />
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[130%] mb-2 w-[220px] p-3 bg-[#D4AF37] text-black opacity-0 group-hover/icon:opacity-100 group-hover/icon:-translate-y-1 transition-all duration-300 pointer-events-none z-20 shadow-[0_10px_30px_rgba(212,175,55,0.2)] rounded-[2px] text-left">
                <strong className="block text-[10px] font-extrabold tracking-[1px] uppercase mb-1">Crecimiento Simbiótico</strong>
                <span className="block text-[11px] leading-[1.5] font-medium opacity-90">AnunciaMarket se integra a tu núcleo de marketing, aprendiendo de múltiples canales para evolucionar y ajustar continuamente tu ecosistema.</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#D4AF37]"></div>
              </div>
            </motion.div>
            <div>
               <div className="font-display italic text-[#D4AF37] text-[18px] mb-[10px]">03.</div>
              <h3 className="text-[14px] font-semibold tracking-[1px] uppercase text-white mb-3">Crecimiento Simbiótico</h3>
              <p className="opacity-70 text-[14px] leading-[1.6]">
                 La plataforma aprende de múltiples canales para re-evaluar y ajustar la orquestación.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Showcase Video Section */}
      <section id="video-promo" className="py-24 max-w-[1400px] mx-auto w-full">
        <div className="px-10 sm:px-14 mb-[60px] text-center max-w-[800px] mx-auto">
          <div className="flex justify-center items-center gap-2 mb-6 grayscale opacity-80">
            <BrainCircuit className="w-5 h-5 text-[#D4AF37]" />
            <span className="font-display italic text-[14px] tracking-[2px] uppercase text-[#D4AF37]">Tráiler Cognitivo</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-medium mb-[20px] text-white tracking-wide">
            Visualiza la Simbiosis.
          </h2>
          <p className="opacity-70 text-[16px] leading-[1.6]">
            Observa cómo nuestra inteligencia artificial autónoma y predictiva orquesta campañas, alinea estrategias y transforma tu pipeline en tiempo real. 
          </p>
          
          <button 
            onClick={generatePromoVideo} 
            disabled={isGeneratingVideo}
            className="mt-6 flex items-center gap-2 mx-auto justify-center btn-primary text-[12px] opacity-90 disabled:opacity-50"
          >
            <BrainCircuit className={`w-4 h-4 ${isGeneratingVideo ? 'animate-pulse' : ''}`} />
            {isGeneratingVideo ? 'PROCESANDO VÍDEO...' : 'GENERAR VÍDEO CON IA (VEO)'}
          </button>
        </div>

        <div className="px-5 sm:px-10">
          <div className="relative w-full aspect-video max-w-[1000px] mx-auto bg-[#0d0d0f] border border-white/10 p-2 sm:p-4 shadow-[0_0_50px_rgba(212,175,55,0.05)]">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#D4AF37]"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#D4AF37]"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#D4AF37]"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#D4AF37]"></div>

            <div className="relative w-full h-full bg-[#0A0A0B] group overflow-hidden flex items-center justify-center border border-white/5">
               
               {isGeneratingVideo && (
                 <div className="absolute z-50 inset-0 flex flex-col items-center justify-center bg-black/90 p-8 text-center backdrop-blur-sm">
                   <div className="w-16 h-16 border-4 border-t-[#D4AF37] border-white/10 rounded-full animate-spin mb-6"></div>
                   <h3 className="font-display text-2xl text-[#D4AF37] mb-2 tracking-wide">Orquestando Video...</h3>
                   <p className="text-white/60 font-mono text-[12px]">{videoGenerationProgress}</p>
                 </div>
               )}

               {/* Video Element (Simulating the output) */}
               <video 
                  key={generatedVideoUri || 'pixabay'} 
                  ref={videoRef}
                  preload="none"
                  playsInline
                  onClick={toggleVideo}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  className="absolute inset-0 w-full h-full object-cover z-30 transition-opacity cursor-pointer"
                  poster="/logo-dark.jpg"
               >
                  <source src={generatedVideoUri || "https://cdn.pixabay.com/video/2020/05/25/40131-424888127_large.mp4"} type="video/mp4" />
                  Tu navegador no soporta el formato de video.
               </video>

               {/* Custom Play/Pause Overlay Button */}
               <button 
                  onClick={toggleVideo}
                  className={`absolute z-40 flex items-center justify-center w-20 h-20 rounded-full bg-black/50 backdrop-blur-md border border-[#D4AF37]/50 text-[#D4AF37] transition-all duration-300 hover:scale-110 hover:bg-black/70 ${isVideoPlaying ? 'opacity-0 group-hover:opacity-100 scale-90' : 'opacity-100 scale-100 shadow-[0_0_40px_rgba(212,175,55,0.3)]'}`}
                  aria-label={isVideoPlaying ? "Pausar video" : "Reproducir video"}
               >
                  {isVideoPlaying ? (
                    <Pause className="w-8 h-8 fill-current" />
                  ) : (
                    <Play className="w-8 h-8 fill-current ml-2" />
                  )}
               </button>

               {/* Veo Overlay Label */}
               <div className="absolute top-4 left-4 z-40 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                 <span className="text-[10px] uppercase tracking-[2px] text-white font-medium">Veo IA Stream</span>
               </div>

               {/* Playback Speed Controller */}
               <div className="absolute bottom-4 right-4 z-40">
                 <div className="group/speed relative flex flex-col items-end">
                   {/* Menu Dropdown / Options */}
                   <div className="absolute bottom-full right-0 mb-2 flex flex-col gap-1 opacity-0 pointer-events-none group-hover/speed:opacity-100 group-hover/speed:pointer-events-auto transition-all duration-300 translate-y-2 group-hover/speed:translate-y-0">
                      {[2, 1.5, 1, 0.5].map(rate => (
                         <button
                           key={rate}
                           onClick={(e) => {
                              e.stopPropagation();
                              changePlaybackRate(rate);
                           }}
                           className={`px-3 py-1.5 rounded bg-black/70 backdrop-blur-md text-[10px] sm:text-[11px] min-w-[45px] text-center font-mono border transition-colors ${playbackRate === rate ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-white/10 text-white/70 hover:bg-white/10'}`}
                         >
                           {rate}x
                         </button>
                      ))}
                   </div>
                   
                   {/* Active/Toggle Button */}
                   <button className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium text-white transition-colors hover:border-[#D4AF37]/50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                     {playbackRate}x
                   </button>
                 </div>
               </div>
            </div>
            
            <p className="text-center text-[10px] uppercase tracking-[3px] text-white/40 mt-6">
              Concepto Visual • Duración: 1:30
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonios" className="pt-24 pb-0 max-w-[1400px] mx-auto w-full section-border">
        <div className="px-10 sm:px-14 mb-[60px]">
          <h2 className="font-display text-5xl font-medium mb-[20px] text-white">Prueba Social.</h2>
          <p className="opacity-70 max-w-[600px] text-[16px] leading-[1.6]">
            Líderes de la industria que han escalado sus conversiones y transformado sus embudos con nuestro ecosistema autónomo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 section-border bg-[#161618]">
          
          <div className="p-[40px] sm:p-[60px] border-b md:border-b-0 md:border-r border-white/10 group flex flex-col justify-between">
            <div className="mb-[40px]">
              <Quote className="w-8 h-8 text-[#D4AF37] mb-8 opacity-40 group-hover:opacity-100 transition-opacity" />
              <p className="font-display italic text-[18px] leading-[1.7] text-white/90">
                "Desde que integramos el ecosistema de AnunciaMarket, nuestras conversiones aumentaron un espectacular 140%. Es como tener un estratega cognitivo analizando datos las 24 horas del día."
              </p>
            </div>
            <div className="flex items-center gap-[20px]">
              <img 
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" 
                alt="Carlos R." 
                className="w-[60px] h-[60px] object-cover grayscale border border-white/10" 
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div>
                <h4 className="text-[12px] font-bold tracking-[1px] uppercase text-white">Carlos R.</h4>
                <p className="text-[10px] text-[#D4AF37] uppercase tracking-[2px] mt-1">CEO • DataCore</p>
              </div>
            </div>
          </div>

          <div className="p-[40px] sm:p-[60px] border-b md:border-b-0 md:border-r border-white/10 group flex flex-col justify-between bg-[#0A0A0B]">
            <div className="mb-[40px]">
              <Quote className="w-8 h-8 text-[#D4AF37] mb-8 opacity-40 group-hover:opacity-100 transition-opacity" />
              <p className="font-display italic text-[18px] leading-[1.7] text-white/90">
                "La arquitectura de decisión autónoma nos dio la agilidad que el equipo necesitaba. Dejamos de adivinar y empezamos a ejecutar campañas 100% predecibles y escalables."
              </p>
            </div>
            <div className="flex items-center gap-[20px]">
              <img 
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" 
                alt="Elena V." 
                className="w-[60px] h-[60px] object-cover grayscale border border-white/10" 
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div>
                <h4 className="text-[12px] font-bold tracking-[1px] uppercase text-white">Elena V.</h4>
                <p className="text-[10px] text-[#D4AF37] uppercase tracking-[2px] mt-1">CMO • NovaGrowth</p>
              </div>
            </div>
          </div>

          <div className="p-[40px] sm:p-[60px] group flex flex-col justify-between">
            <div className="mb-[40px]">
              <Quote className="w-8 h-8 text-[#D4AF37] mb-8 opacity-40 group-hover:opacity-100 transition-opacity" />
              <p className="font-display italic text-[18px] leading-[1.7] text-white/90">
                "La orquestación técnica es impecable. El rendimiento es brutal y el nivel creativo en el que la IA adapta el contenido a nuestra audiencia nos dejó cautivados."
              </p>
            </div>
            <div className="flex items-center gap-[20px]">
              <img 
                src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" 
                alt="Miguel A." 
                className="w-[60px] h-[60px] object-cover grayscale border border-white/10" 
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div>
                <h4 className="text-[12px] font-bold tracking-[1px] uppercase text-white">Miguel A.</h4>
                <p className="text-[10px] text-[#D4AF37] uppercase tracking-[2px] mt-1">VP Ventas • Vertex</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* AdSense Unit (Banner) - Only visible when AdBlock is off */}
      <Suspense fallback={<div className="min-h-[90px] w-full bg-[#161618]/50"></div>}>
        <section className="py-12 section-border w-full flex justify-center bg-[#050505]">
          <div className="w-full max-w-[1200px] px-5 sm:px-10">
            <AdSenseUnit client="ca-pub-4222962726241472" slot="top-banner" format="auto" className="min-h-[90px]" />
          </div>
        </section>
      </Suspense>

      {/* CTA Section */}
      <section id="contacto" className="py-32 section-border w-full bg-[#0D0D0F]">
        <div className="max-w-[1200px] mx-auto px-10 sm:px-14 grid lg:grid-cols-2 gap-16 lg:gap-[80px] items-start">
          
          <div className="flex flex-col text-left">
            <BrainCircuit className="w-10 h-10 text-[#D4AF37] mb-8 opacity-80" />
            <h2 className="font-display text-5xl md:text-7xl mb-[30px] text-white tracking-wide">Listo para <br/>el salto.</h2>
            <p className="text-[16px] leading-[1.6] opacity-70 max-w-[480px] mb-[60px]">
              Da el siguiente paso en la evolución de tu negocio con inteligencia artificial autónoma desplegada a tu medida. Hablemos de transformar tu ecosistema de ventas.
            </p>

            {/* Founder Contact Card */}
            <div className="border border-white/10 bg-[#161618] p-[30px] md:p-[40px] relative mt-auto">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]"></div>
              
              <h3 className="font-display text-[24px] text-white mb-1">José Raby López Martínez</h3>
              <p className="text-[11px] uppercase tracking-[3px] text-[#D4AF37] mb-[40px] font-semibold">CEO y Fundador</p>
              
              <div className="flex flex-col gap-5 mb-[40px]">
                <a href="mailto:rabilopezz18@gmail.com" className="flex items-center gap-4 text-[14px] opacity-80 hover:opacity-100 transition-opacity w-max text-white">
                  <Mail className="w-5 h-5 text-[#D4AF37]" />
                  rabilopezz18@gmail.com
                </a>
                <a href="tel:+526634452676" className="flex items-center gap-4 text-[14px] opacity-80 hover:opacity-100 transition-opacity w-max text-white">
                  <Phone className="w-5 h-5 text-[#D4AF37]" />
                  663 445 2676
                </a>
              </div>

              <div className="flex gap-[24px] pt-[30px] border-t border-white/10">
                <a href="https://linkedin.com/in/Anunciamarket" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 hover:text-[#D4AF37] transition-all text-white">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://github.com/Anunciamarket" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 hover:text-[#D4AF37] transition-all text-white">
                  <Github className="w-5 h-5" />
                </a>
                <a href="https://g.dev/Anunciamarket" target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 hover:text-[#D4AF37] transition-all text-white" title="Google Dev Profile">
                  <Code2 className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0B] border border-white/10 p-[40px] sm:p-[60px] lg:mt-[100px] relative">
            <form 
              className={`flex flex-col gap-[30px] transition-opacity duration-300 ${formSuccess ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              onSubmit={handleFormSubmit}
              noValidate
            >
              <h3 className="font-display italic text-[20px] text-white opacity-90 mb-4">Contacto Directo.</h3>
              
              <div className="flex flex-col gap-[10px]">
                <label htmlFor="name" className={`text-[11px] uppercase tracking-[2px] font-semibold transition-colors ${formErrors.name ? 'text-red-500' : 'text-[#D4AF37]'}`}>Nombre</label>
                <input 
                  type="text" 
                  id="name" 
                  value={formState.name}
                  onChange={handleFormChange}
                  placeholder="Tu nombre completo" 
                  className={`bg-transparent border-b pb-[10px] text-white focus:outline-none transition-colors text-[14px] ${formErrors.name ? 'border-red-500/50 focus:border-red-500 placeholder:text-red-500/30' : 'border-white/20 focus:border-[#D4AF37] placeholder:text-white/30'}`} 
                />
                {formErrors.name && <span className="text-red-500 text-[11px] mt-1">{formErrors.name}</span>}
              </div>
              
              <div className="flex flex-col gap-[10px]">
                <label htmlFor="email" className={`text-[11px] uppercase tracking-[2px] font-semibold transition-colors ${formErrors.email ? 'text-red-500' : 'text-[#D4AF37]'}`}>Email</label>
                <input 
                  type="email" 
                  id="email" 
                  value={formState.email}
                  onChange={handleFormChange}
                  placeholder="tucorreo@empresa.com" 
                  className={`bg-transparent border-b pb-[10px] text-white focus:outline-none transition-colors text-[14px] ${formErrors.email ? 'border-red-500/50 focus:border-red-500 placeholder:text-red-500/30' : 'border-white/20 focus:border-[#D4AF37] placeholder:text-white/30'}`} 
                />
                {formErrors.email && <span className="text-red-500 text-[11px] mt-1">{formErrors.email}</span>}
              </div>

              <div className="flex flex-col gap-[10px]">
                <label htmlFor="message" className={`text-[11px] uppercase tracking-[2px] font-semibold transition-colors ${formErrors.message ? 'text-red-500' : 'text-[#D4AF37]'}`}>Mensaje</label>
                <textarea 
                  id="message" 
                  rows={4} 
                  value={formState.message}
                  onChange={handleFormChange}
                  placeholder="Cuéntanos sobre tu ecosistema actual..." 
                  className={`bg-transparent border-b pb-[10px] text-white focus:outline-none transition-colors text-[14px] resize-none ${formErrors.message ? 'border-red-500/50 focus:border-red-500 placeholder:text-red-500/30' : 'border-white/20 focus:border-[#D4AF37] placeholder:text-white/30'}`} 
                ></textarea>
                {formErrors.message && <span className="text-red-500 text-[11px] mt-1">{formErrors.message}</span>}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-primary mt-[10px] w-full relative flex items-center justify-center font-bold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    VERIFICANDO...
                  </span>
                ) : (
                  <>
                    Enviar Directiva
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </form>

            <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-8 transition-all duration-500 ${formSuccess ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none translate-y-4'}`}>
              <div className="w-16 h-16 rounded-full bg-[#161618] border border-[#D4AF37]/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                <BrainCircuit className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h4 className="font-display italic text-[24px] text-white tracking-wide mb-2">Mensaje Recibido</h4>
              <p className="text-[14px] text-white/70 max-w-[300px] leading-[1.6]">
                El nodo central procesará tu información. Un agente se desplegará a contactarte.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 mt-16 pt-16 border-t border-white/5">
            <Suspense fallback={
              <div className="flex items-center justify-center p-8 bg-[#161618] border border-[#D4AF37]/20">
                <span className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></span>
              </div>
            }>
              <CapitalNode />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Acerca de AnunciaMarket */}
      <section id="acerca-de" className="py-20 md:py-32 section-border w-full bg-[#0A0A0B] relative overflow-hidden">
        {/* Enormous Watermark Minimalist Logo */}
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] opacity-[0.03] pointer-events-none rotate-12">
            <img 
              src="/logo-light.jpg" 
              alt="Background Shield Logo" 
              className="w-full h-full object-contain mix-blend-plus-lighter"
              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
              loading="lazy"
            />
        </div>

        <div className="max-w-[1200px] mx-auto px-10 sm:px-14 relative z-10">
          
          {/* Full Width Branding integration */}
          <div className="flex justify-center mb-20 md:mb-32">
             <div className="relative w-full max-w-[600px]">
                <img 
                  src="/logo-light.jpg" 
                  alt="AnunciaMarket Sinbiotic Inteligente" 
                  className="w-full h-auto object-contain drop-shadow-2xl mix-blend-lighten opacity-80 hover:opacity-100 transition-opacity duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if(target.parentElement && !target.parentElement.classList.contains('fb-added')) {
                      target.parentElement.classList.add('fb-added');
                      target.parentElement.innerHTML += '<div class="text-[11px] uppercase tracking-[2px] text-[#D4AF37]/50 text-center py-10 border border-white/5 bg-[#161618]">Sube el escudo/versión clara como "logo-light.jpg"</div>';
                    }
                  }}
                  loading="lazy"
                />
             </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 lg:gap-[80px] items-center">
            
            {/* Mission & History */}
            <div className="flex flex-col text-left">
              <h3 className="font-display text-4xl md:text-5xl mb-6 text-white tracking-wide">Nuestra Historia <br />y Misión.</h3>
              <p className="text-[15px] leading-[1.8] opacity-70 mb-6 text-white">
                Fundada por el visionario tecnológico <strong className="text-white font-medium">José Raby López Martínez</strong>, AnunciaMarket nació de una premisa radical: el marketing tradicional está obsoleto. Las decisiones basadas puramente en la intuición humana ya no pueden escalar a la velocidad ni exigencia del mercado moderno.
              </p>
              <p className="text-[15px] leading-[1.8] opacity-70 text-white">
                Nuestra misión es orquestar la primera generación de ecosistemas de ventas 100% simbióticos. Combinamos IA generativa hiper-entrenada con modelos estratégicos de alta conversión, operando de manera autónoma para liberar a tu equipo y garantizar retornos insuperables.
              </p>
            </div>

            {/* Team & Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-white/10 p-[30px] bg-[#161618] hover:border-[#D4AF37]/50 transition-colors group">
                <h4 className="text-[11px] uppercase tracking-[2px] text-[#D4AF37] font-bold mb-3 group-hover:text-white transition-colors">Nuestro Equipo</h4>
                <p className="text-[13px] opacity-70 text-white leading-[1.6]">Expertos en machine learning, arquitectos de conversión y analistas operativos trabajando en sintonía perfecta.</p>
              </div>
              
              <div className="border border-white/10 p-[30px] bg-[#161618] hover:border-[#D4AF37]/50 transition-colors group">
                <h4 className="text-[11px] uppercase tracking-[2px] text-[#D4AF37] font-bold mb-3 group-hover:text-white transition-colors">Filosofía</h4>
                <p className="text-[13px] opacity-70 text-white leading-[1.6]">Datos absolutos sobre opiniones. Velocidad táctica sobre burocracia. Crecimiento autónomo sobre tácticas aisladas.</p>
              </div>
              
              <div className="border border-white/10 p-[30px] bg-[#161618] hover:border-[#D4AF37]/50 transition-colors group">
                <h4 className="text-[11px] uppercase tracking-[2px] text-[#D4AF37] font-bold mb-3 group-hover:text-white transition-colors">Operaciones</h4>
                <p className="text-[13px] opacity-70 text-white leading-[1.6]">Infraestructura continua 24/7 con redundancia predictiva, monitoreo inteligente y tolerancia a fallas cero.</p>
              </div>

              <div className="border border-white/10 p-[30px] bg-[#161618] hover:border-[#D4AF37]/50 transition-colors group">
                <h4 className="text-[11px] uppercase tracking-[2px] text-[#D4AF37] font-bold mb-3 group-hover:text-white transition-colors">Visión Global</h4>
                <p className="text-[13px] opacity-70 text-white leading-[1.6]">Desplegar agentes cognitivos como el núcleo comercial en miles de ecosistemas de negocio a nivel mundial.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* AdSense Unit (Bottom Layout) */}
      <Suspense fallback={<div className="min-h-[120px] w-full bg-black"></div>}>
        <section className="py-8 w-full flex justify-center bg-black">
          <div className="w-full max-w-[1000px] px-5">
             <AdSenseUnit client="ca-pub-4222962726241472" slot="bottom-content" format="horizontal" className="min-h-[120px]" />
          </div>
        </section>
      </Suspense>

      {/* Footer */}
      <footer className="py-[40px] px-10 sm:px-14 section-border">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2 grayscale opacity-50">
             <BrainCircuit className="w-5 h-5 text-[#D4AF37]" />
             <span className="font-display italic text-[18px] tracking-[1px] text-[#D4AF37]">AnunciaMarket.</span>
           </div>
           <p className="text-[10px] uppercase tracking-[3px] text-[#D4AF37] opacity-60">
             © {new Date().getFullYear()} Ecosistema Simbiótico.
           </p>
        </div>
      </footer>

      {/* Embedded AI Chatbot */}
      <Suspense fallback={null}>
        <AIChatbot />
      </Suspense>
    </div>
  );
}

