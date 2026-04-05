import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Users, Shield, Zap, MessageCircle, Globe } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, onlineUsers } = useSocket();
  const [username, setUsername] = useState('');
  const [interests, setInterests] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleStartChat = () => {
    if (!username.trim()) {
      toast.error('გთხოვთ შეიყვანოთ თქვენი სახელი');
      return;
    }
    localStorage.setItem('username', username);
    localStorage.setItem('interests', interests);
    navigate('/chat');
  };

  const features = [
    { icon: <Video className="w-5 h-5" />, title: 'ვიდეო ჩატი', description: 'HD ხარისხის ვიდეო კავშირი' },
    { icon: <Globe className="w-5 h-5" />, title: 'მსოფლიო', description: 'ნებისმიერ ქვეყნიდან მეგობრები' },
    { icon: <Shield className="w-5 h-5" />, title: 'დაცული', description: 'სრული კონფიდენციალურობა' },
    { icon: <Zap className="w-5 h-5" />, title: 'მყისიერი', description: 'სწრაფი დაკავშირება' },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white relative overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)' }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Shtabi<span className="text-purple-400">.ge</span></span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}
                style={{ boxShadow: isConnected ? '0 0 8px #34d399' : '0 0 8px #f87171' }} />
              <span>{isConnected ? 'ონლაინ' : 'გათიშული'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-white font-medium">{onlineUsers}</span>
              <span className="text-gray-500">ონლაინ</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 24 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.1] rounded-full px-4 py-1.5 mb-8 text-sm text-gray-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {onlineUsers} ადამიანი ახლა ჩატავს
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold mb-5 leading-[1.1] tracking-tight">
              შეხვდი{' '}
              <span style={{
                background: 'linear-gradient(135deg, #a78bfa, #ec4899, #f97316)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>ახალ მეგობრებს</span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed">
              შემთხვევითი ვიდეო ჩატი მთელი მსოფლიოდან ადამიანებთან.
              უსაფრთხო, სწრაფი, უფასო.
            </p>
          </motion.div>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 32 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md mx-auto mb-20"
        >
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
            <div className="p-8">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">სახელი</label>
                  <input
                    type="text"
                    placeholder="შეიყვანეთ თქვენი სახელი"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartChat()}
                    maxLength={20}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 text-sm transition-all outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">ინტერესები <span className="normal-case text-gray-600">(სურვილისამებრ)</span></label>
                  <input
                    type="text"
                    placeholder="მუსიკა, სპორტი, კინო..."
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 text-sm transition-all outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              </div>

              <button
                onClick={handleStartChat}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
              >
                <Video className="w-4 h-4" />
                დაიწყე ჩატი
              </button>
            </div>

            <div className="border-t border-white/[0.06] px-8 py-4">
              <p className="text-xs text-gray-600 text-center">
                კავშირის დაწყებით ეთანხმები გამოყენების{' '}
                <span className="text-gray-500 cursor-pointer hover:text-gray-400">წესებს</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 24 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
        >
          {features.map((f, i) => (
            <div key={i}
              className="rounded-xl p-5 border border-white/[0.06] transition-all duration-300 hover:border-white/[0.12] group"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-purple-400 group-hover:scale-110 transition-transform"
                style={{ background: 'rgba(124,58,237,0.1)' }}>
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </motion.div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: mounted ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex items-center justify-center gap-8 mt-16 text-sm text-gray-600"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500/60" />
            <span>24/7 ჩატი</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500/60" />
            <span>კონფიდენციალური</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-orange-500/60" />
            <span>გლობალური</span>
          </div>
        </motion.div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default Home;