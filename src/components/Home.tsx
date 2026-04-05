import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Users, Shield, Zap, Globe, ArrowRight } from 'lucide-react';
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
      toast.error('გთხოვთ შეიყვანოთ სახელი');
      return;
    }
    localStorage.setItem('username', username);
    localStorage.setItem('interests', interests);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 overflow-hidden font-['DM_Sans']">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/10 blur-[120px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Shtabi<span className="text-purple-500">.ge</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08]">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-gray-300">{onlineUsers} ხაზზეა</span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center pt-12 lg:pt-24">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
            ესაუბრე <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
              სამყაროს
            </span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed font-light">
            აღმოაჩინე ახალი მეგობრები, გაუზიარე იდეები და ისაუბრე უსაფრთხოდ ყველაზე სწრაფ ქართულ ვიდეო ჩატში.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: <Shield className="w-5 h-5 text-purple-400" />, text: "დაცული კავშირი" },
              { icon: <Zap className="w-5 h-5 text-pink-400" />, text: "HD ხარისხი" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08]">{item.icon}</div>
                <span className="text-sm text-gray-300 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-3xl rounded-[3rem]" />
          <div className="relative bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl p-8 lg:p-10 rounded-[2.5rem] shadow-2xl">
            <h3 className="text-xl font-semibold mb-8">დაიწყე ახლავე</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-widest ml-1">შენი სახელი</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="მაგ: გიორგი"
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-purple-500/50 focus:ring-4 ring-purple-500/5 rounded-2xl px-5 py-4 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-widest ml-1">ინტერესები</label>
                <input 
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="მაგ: მუსიკა, კოდინგი..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-purple-500/50 focus:ring-4 ring-purple-500/5 rounded-2xl px-5 py-4 outline-none transition-all text-sm"
                />
              </div>

              <button 
                onClick={handleStartChat}
                className="w-full group bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-500 hover:text-white transition-all duration-300 active:scale-95 shadow-xl shadow-white/5"
              >
                შესვლა ჩატში
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <p className="text-center text-[11px] text-gray-500 mt-6 leading-relaxed">
              შესვლით თქვენ ეთანხმებით პლატფორმის <span className="underline cursor-pointer">წესებსა და პირობებს</span>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Home;
