import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Gallery from './components/Gallery';
import Sidebar from './components/Sidebar';
import PromptWorkspace from './components/PromptWorkspace';
import { VideoModel, ShotConfig, MediaType } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, Zap, Users, Mountain, Box, Smartphone, Home, FolderOpen, ArrowLeft } from 'lucide-react';

const TabButton = React.memo(({ id, activeTab, onClick, icon: Icon, label }: { id: string, activeTab: string, onClick: () => void, icon: any, label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all relative ${
      activeTab === id ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-300'
    }`}
  >
    <Icon className={`w-5 h-5 mb-1 ${activeTab === id ? 'scale-110' : ''}`} />
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    {activeTab === id && (
      <motion.div layoutId="navTab" className="absolute bottom-0 w-8 h-1 bg-blue-500 rounded-t-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
    )}
  </button>
));

export default function App() {
  const [model, setModel] = useState<VideoModel>('Sora 2');
  const [config, setConfig] = useState<ShotConfig>(() => {
    try {
      const saved = localStorage.getItem('studio_config');
      return saved ? JSON.parse(saved) : {
        shotType: 'Wide Shot',
        motion: 'Slow Pull-out',
        lighting: 'Cinematic',
        style: 'Photorealistic',
        fps: 24,
        aspectRatio: '16:9',
        selectedCharacters: []
      };
    } catch {
      return {
        shotType: 'Wide Shot',
        motion: 'Slow Pull-out',
        lighting: 'Cinematic',
        style: 'Photorealistic',
        fps: 24,
        aspectRatio: '16:9',
        selectedCharacters: []
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('studio_config', JSON.stringify(config));
  }, [config]);

  const [activeTab, setActiveTab] = useState<'home' | 'studio' | 'gallery' | 'models' | 'actors' | 'env'>('home');
  const [initialMediaType, setInitialMediaType] = useState<MediaType>('video');
  const [isMobile, setIsMobile] = useState(false);

  // History state for back button
  const [tabHistory, setTabHistory] = useState<typeof activeTab[]>(['home']);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const changeTab = useCallback((newTab: typeof activeTab) => {
    if (newTab !== activeTab) {
      setTabHistory(prev => [...prev, newTab]);
      setActiveTab(newTab);
    }
  }, [activeTab]);

  const handleBack = useCallback(() => {
    if (tabHistory.length > 1) {
      const newHistory = [...tabHistory];
      newHistory.pop(); // Remove current tab
      const previousTab = newHistory[newHistory.length - 1];
      setTabHistory(newHistory);
      setActiveTab(previousTab);
    } else {
      setActiveTab('home');
    }
  }, [tabHistory]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Header - Compact for Mobile */}
      <header className={`flex justify-between items-center shrink-0 border-b border-zinc-800/50 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 ${isMobile ? 'z-50' : ''}`}>
        <div className="flex items-center space-x-3">
          {activeTab !== 'home' ? (
            <motion.button
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              onClick={handleBack}
              className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              <Box className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-sm sm:text-xl font-black tracking-tight uppercase leading-none">
              أستوديو <span className="text-blue-500">المحترفين</span>
            </h1>
            {isMobile && <span className="text-[7px] text-zinc-500 font-mono tracking-widest">{activeTab.toUpperCase()}</span>}
          </div>
        </div>
        
        {!isMobile ? (
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-blue-500/10 rounded-full px-4 py-1.5 border border-blue-500/20">
               <Zap className="w-3 h-3 text-blue-500 animate-pulse" />
               <span className="text-[10px] font-mono font-bold text-blue-400">السرعة القصوى: مفعلة</span>
            </div>
            <div className="flex items-center space-x-4 bg-zinc-900 rounded-full px-4 py-1.5 border border-zinc-800">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                 <span className="text-[10px] text-zinc-400 uppercase font-black">تم الحفظ</span>
               </div>
               <div className="w-px h-3 bg-zinc-800" />
               <span className="text-xs text-zinc-400">
                 النظام: <span className="text-green-500 font-medium">نشط للغاية</span>
               </span>
               <div className="w-px h-3 bg-zinc-700"></div>
               <span className="text-xs text-zinc-400 font-mono italic">إصدار مستقر v2.5</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-900/50">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className={`flex-grow overflow-hidden relative ${isMobile ? 'pb-20' : 'p-6'}`}>
        {!isMobile ? (
          <div className="grid grid-cols-12 grid-rows-6 gap-4 h-full">
            <Sidebar 
              model={model} 
              setModel={setModel} 
              config={config} 
              setConfig={(newConfig) => {
                setConfig(newConfig);
                if (isMobile && newConfig.selectedCharacters && newConfig.selectedCharacters.length > 0) {
                  changeTab('studio');
                }
              }} 
            />
            <PromptWorkspace 
              model={model} 
              config={config} 
              setConfig={setConfig}
            />
          </div>
        ) : (
          <div className="h-full w-full overflow-y-auto custom-scrollbar p-4">
             <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                   {activeTab === 'home' && (
                     <Dashboard 
                       onSelectAction={(action) => {
                         const typeMap: Record<string, MediaType> = {
                           'image': 'image',
                           'video': 'video',
                           'tts': 'audio',
                           'img2vid': 'video',
                           'chat': 'chat',
                           'music': 'audio',
                           'analysis': 'analysis',
                           'reasoning': 'chat',
                           'character': 'character',
                           'movie': 'movie',
                           'animated-image': 'animated-image'
                         };
                         setInitialMediaType(typeMap[action]);
                         changeTab('studio');
                       }}
                       onOpenGallery={() => changeTab('gallery')}
                     />
                   )}

                   {activeTab === 'gallery' && (
                     <Gallery 
                       onClose={() => handleBack()}
                       onSelect={(gen) => {
                         changeTab('studio');
                       }}
                     />
                   )}

                   {activeTab === 'studio' && (
                     <div className="space-y-4">
                        <PromptWorkspace 
                          model={model} 
                          config={config} 
                          setConfig={setConfig}
                          isMobile={true} 
                          initialMediaType={initialMediaType}
                          onBack={handleBack}
                        />
                     </div>
                   )}
                   
                   {activeTab === 'models' && (
                     <div className="grid grid-cols-1 gap-4 overflow-visible">
                        <Sidebar 
                          model={model} 
                          setModel={setModel} 
                          config={config} 
                          setConfig={(newConfig) => {
                            setConfig(newConfig);
                            if (isMobile && newConfig.selectedCharacters && newConfig.selectedCharacters.length > 0) {
                              changeTab('studio');
                            }
                          }} 
                          view="models"
                          onBack={handleBack}
                        />
                     </div>
                   )}

                   {activeTab === 'actors' && (
                     <div className="grid grid-cols-1 gap-4 overflow-visible">
                        <Sidebar 
                          model={model} 
                          setModel={setModel} 
                          config={config} 
                          setConfig={(newConfig) => {
                            setConfig(newConfig);
                            if (isMobile && newConfig.selectedCharacters && newConfig.selectedCharacters.length > 0) {
                              changeTab('studio');
                            }
                          }} 
                          view="actors"
                          onBack={handleBack}
                        />
                     </div>
                   )}

                   {activeTab === 'env' && (
                     <div className="grid grid-cols-1 gap-4 overflow-visible">
                        <Sidebar 
                          model={model} 
                          setModel={setModel} 
                          config={config} 
                          setConfig={(newConfig) => {
                            setConfig(newConfig);
                            if (isMobile && newConfig.selectedCharacters && newConfig.selectedCharacters.length > 0) {
                              changeTab('studio');
                            }
                          }} 
                          view="env"
                          onBack={handleBack}
                        />
                     </div>
                   )}
                </motion.div>
             </AnimatePresence>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/50 flex items-stretch z-[100] px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <TabButton id="home" activeTab={activeTab} onClick={() => changeTab('home')} icon={Home} label="الرئيسية" />
          <TabButton id="studio" activeTab={activeTab} onClick={() => changeTab('studio')} icon={Layout} label="الأستوديو" />
          <TabButton id="gallery" activeTab={activeTab} onClick={() => changeTab('gallery')} icon={FolderOpen} label="المعرض" />
          <TabButton id="actors" activeTab={activeTab} onClick={() => changeTab('actors')} icon={Users} label="الأدوات" />
        </nav>
      )}

      {/* Footer - Desktop Only */}
      {!isMobile && (
        <footer className="px-6 py-4 flex justify-between items-center text-[10px] text-zinc-500 font-mono shrink-0 border-t border-zinc-900">
          <div className="flex space-x-6 uppercase tracking-widest">
            <span>الإصدار: v2.5.0 مستقر</span>
            <span>مساحة العمل: احترافية</span>
            <span>المستخدم: هيتلر سلطان</span>
          </div>
          <div className="flex space-x-4 items-center">
            <span className="text-blue-500/60 font-bold uppercase">رخصة المؤسسات</span>
            <div className="w-1 h-3 bg-zinc-800"></div>
            <span className="text-zinc-600">© 2026 مختبرات الذكاء الاصطناعي</span>
          </div>
        </footer>
      )}
    </div>
  );
}
