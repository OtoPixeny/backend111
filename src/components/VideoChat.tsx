import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff,
  MessageCircle, SkipForward, Users,
  X, Send, PhoneOff
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'stranger';
  timestamp: Date;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ]
};

const VideoChat: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [myStream, setMyStream]                   = useState<MediaStream | null>(null);
  const [partnerStream, setPartnerStream]         = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled]       = useState(true);
  const [isAudioEnabled, setIsAudioEnabled]       = useState(true);
  const [isChatOpen, setIsChatOpen]               = useState(false);
  const [messages, setMessages]                   = useState<Message[]>([]);
  const [messageInput, setMessageInput]           = useState('');
  const [isSearching, setIsSearching]             = useState(false);
  const [isConnectedToPartner, setIsConnectedToPartner] = useState(false);
  const [partnerUsername, setPartnerUsername]     = useState('უცნობი');
  const [unreadCount, setUnreadCount]             = useState(0);
  const [myUsername]                              = useState(localStorage.getItem('username') || 'მომხმარებელი');

  const myVideoRef          = useRef<HTMLVideoElement>(null);
  const partnerVideoRef     = useRef<HTMLVideoElement>(null);
  const partnerChatVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef               = useRef<RTCPeerConnection | null>(null);
  const myStreamRef         = useRef<MediaStream | null>(null);
  const partnerIdRef        = useRef<string>('');
  const chatContainerRef    = useRef<HTMLDivElement>(null);

  /* ── keep refs in sync ── */
  useEffect(() => { myStreamRef.current = myStream; }, [myStream]);

  /* ── attach local stream to video el ── */
  useEffect(() => {
    if (myVideoRef.current && myStream) myVideoRef.current.srcObject = myStream;
  }, [myStream]);

  /* ── attach partner stream to BOTH video elements ── */
  useEffect(() => {
    if (!partnerStream) return;
    
    if (partnerVideoRef.current) {
      partnerVideoRef.current.srcObject = partnerStream;
      // <<< მთავარი შესწორება: .play() ბრძანება უზრუნველყოფს ვიდეოს და აუდიოს ჩართვას
      partnerVideoRef.current.play().catch(e => console.error("Partner video play failed:", e));
    }
    if (partnerChatVideoRef.current) {
      partnerChatVideoRef.current.srcObject = partnerStream;
      // <<< იგივე შესწორება ჩატის მინი-ვიდეოსთვის
      partnerChatVideoRef.current.play().catch(e => console.error("Partner chat video play failed:", e));
    }
  }, [partnerStream]);

  /* ── re-attach when chat panel opens (element freshly mounted) ── */
  useEffect(() => {
    if (isChatOpen && partnerStream && partnerChatVideoRef.current) {
      partnerChatVideoRef.current.srcObject = partnerStream;
      // <<< დავამატოთ .play() აქაც, ყოველი შემთხვევისთვის
      partnerChatVideoRef.current.play().catch(e => console.error("Partner chat video re-play failed:", e));
    }
    if (isChatOpen) setUnreadCount(0);
  }, [isChatOpen, partnerStream]);

  /* ── auto-scroll messages ── */
  useEffect(() => {
    if (chatContainerRef.current)
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages]);

  /* ── start camera on mount ── */
  useEffect(() => {
    startMedia();
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── socket events ── */
  useEffect(() => {
    if (!socket) return;

    socket.emit('register', {
      username: myUsername,
      interests: localStorage.getItem('interests') || ''
    });

    socket.on('matched', async (data: { partnerId: string; username: string; isInitiator: boolean }) => {
      console.log('✅ matched:', data);
      partnerIdRef.current = data.partnerId;
      setIsSearching(false);
      setIsConnectedToPartner(true);
      setPartnerUsername(data.username);
      setMessages([]);
      toast.success(`დაკავშირებულია ${data.username}-სთან`);
      await setupPeerConnection(data.partnerId, data.isInitiator);
    });

    socket.on('signal', async (data: { type: string; sdp?: string; candidate?: RTCIceCandidateInit; from: string }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp! }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { type: 'answer', sdp: answer.sdp, to: data.from });
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp! }));
        } else if (data.type === 'candidate' && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error('signal handling error:', err);
      }
    });

    socket.on('partner-disconnected', handlePartnerDisconnect);

    socket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      if (!isChatOpen) { // Don't increment if chat is open
        setUnreadCount(c => c + 1);
      }
    });

    return () => {
      socket.off('matched');
      socket.off('signal');
      socket.off('partner-disconnected');
      socket.off('message');
    };
  }, [socket, myUsername, isChatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── media ── */
  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMyStream(stream);
      myStreamRef.current = stream;
    } catch {
      toast.error('ვერ მოხერხდა კამერის/მიკროფონის წვდომა');
    }
  };

  const stopAll = () => {
    myStreamRef.current?.getTracks().forEach(t => t.stop());
    closePeer();
  };

  const closePeer = () => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  /* ── native WebRTC peer setup ── */
  const setupPeerConnection = async (partnerId: string, initiator: boolean) => {
    closePeer();

    const stream = myStreamRef.current;
    if (!stream) { console.error('No local stream'); return; }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Receive remote stream
    pc.ontrack = (ev) => {
      console.log('🎥 ontrack fired, streams:', ev.streams.length);
      if (ev.streams[0]) {
        setPartnerStream(ev.streams[0]);
      }
    };

    // Send ICE candidates
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket?.emit('signal', { type: 'candidate', candidate: ev.candidate.toJSON(), to: partnerId });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        handlePartnerDisconnect();
      }
    };

    // Initiator creates and sends offer
    if (initiator) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      socket?.emit('signal', { type: 'offer', sdp: offer.sdp, to: partnerId });
    }
  };

  const handlePartnerDisconnect = () => {
    closePeer();
    setIsConnectedToPartner(false);
    setPartnerStream(null);
    setPartnerUsername('უცნობი');
    partnerIdRef.current = '';
    // Only show toast if we were previously connected
    if (isConnectedToPartner) {
        toast('პარტნიორმა დატოვა ჩატი', { icon: '👋' });
    }
  };

  const startSearching = () => {
    if (!socket) return toast.error('კავშირი სერვერთან არ არის');
    setIsSearching(true);
    socket.emit('find-partner');
  };

  const skipPartner = () => {
    socket?.emit('skip-partner');
    handlePartnerDisconnect();
    startSearching();
  };

  const toggleVideo = () => {
    const t = myStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !isVideoEnabled; setIsVideoEnabled(v => !v); }
  };

  const toggleAudio = () => {
    const t = myStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !isAudioEnabled; setIsAudioEnabled(a => !a); }
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !isConnectedToPartner || !socket) return;
    const msg: Message = { id: Date.now().toString(), text: messageInput.trim(), sender: 'me', timestamp: new Date() };
    socket.emit('message', { ...msg, sender: 'stranger' }); // Send as 'stranger' to the partner
    setMessages(p => [...p, msg]);
    setMessageInput('');
  };

  const leaveChat = () => { stopAll(); socket?.emit('leave-chat'); navigate('/'); };

  /* ── UI ── */
  return (
    <div className="h-screen bg-[#070707] flex flex-col overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .sb::-webkit-scrollbar{display:none}.sb{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b z-20"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(7,7,7,0.97)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}>
            <Video className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">Shtabi<span className="text-purple-400">.ge</span></span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isConnectedToPartner
                ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} /><span className="text-xs text-emerald-400">{partnerUsername}</span></>
                : isSearching
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /><span className="text-xs text-amber-400">ძებნა...</span></>
                  : <span className="text-xs text-gray-600">ლოდინი</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={leaveChat} className="flex items-center gap-2 text-xs text-red-400 hover:text-white hover:bg-red-500 px-3 py-2 rounded-lg border transition-all"
            style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)' }}>
            <PhoneOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">გასვლა</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* VIDEO AREA - SIDE BY SIDE */}
        <div className="flex-1 flex overflow-hidden flex-col sm:flex-row">

          {/* Partner Video - Left Side on Desktop */}
          <div className="flex-1 relative overflow-hidden order-2 sm:order-1">
            <video ref={partnerVideoRef} autoPlay playsInline
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ transform: 'scaleX(-1)', opacity: partnerStream ? 1 : 0 }} />
            
            {/* Empty / searching state */}
            {!partnerStream && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'radial-gradient(ellipse at center,#0f0f0f 0%,#070707 100%)' }}>
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)',
                  backgroundSize: '40px 40px'
                }} />
                <div className="text-center relative z-10">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <Users className="w-9 h-9 text-gray-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{isSearching ? 'პარტნიორის ძებნა' : 'მზად ხარ?'}</h2>
                  <p className="text-gray-600 mb-8 text-sm">{isSearching ? 'გთხოვთ დაელოდოთ...' : 'დააჭირე ღილაკს და დაიწყე'}</p>
                  {!isConnectedToPartner && !isSearching && (
                    <button onClick={startSearching} className="px-8 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2.5 mx-auto hover:opacity-90 active:scale-95 transition-all"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}>
                      <Users className="w-4 h-4" />შეხვდი ახალ ადამიანს
                    </button>
                  )}
                  {isSearching && (
                    <div className="flex items-center gap-2 justify-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {partnerStream && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
                <span className="text-sm text-white font-medium">{partnerUsername}</span>
              </div>
            )}
          </div>

          {/* My Video - Right Side on Desktop */}
          <div className="flex-1 relative overflow-hidden border-r sm:border-r sm:border-l order-1 sm:order-2"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <video ref={myVideoRef} autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover" />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <VideoOff className="w-12 h-12 text-red-400" />
              </div>
            )}
            <div className="absolute top-4 left-4 sm:left-auto sm:right-4 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
              <span className="text-sm text-white font-medium">თქვენ</span>
            </div>
          </div>

          {/* Control bar - Centered */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 p-5 flex items-center justify-center gap-3 z-10"
            style={{ background: 'linear-gradient(to top,rgba(0, 0, 0, 0.81) 70%,transparent 100%)', borderRadius: '20px 20px 0 0' }}>
            <ControlBtn onClick={toggleAudio} active={isAudioEnabled}
              activeIcon={<Mic className="w-5 h-5" />} inactiveIcon={<MicOff className="w-5 h-5" />}
              label={isAudioEnabled ? 'ხმა' : 'ხმა'} />
            <ControlBtn onClick={toggleVideo} active={isVideoEnabled}
              activeIcon={<Video className="w-5 h-5" />} inactiveIcon={<VideoOff className="w-5 h-5" />}
              label={isVideoEnabled ? 'კამერა' : 'კამერა'} />
            {isConnectedToPartner && (
              <button onClick={skipPartner} className="flex flex-col items-center gap-1 group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)', color: '#e5e7eb' }}>
                  <SkipForward className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">შემდეგი</span>
              </button>
            )}
            <button onClick={() => setIsChatOpen(o => !o)} className="relative flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{ background: isChatOpen ? 'linear-gradient(135deg,#7c3aed,#ec4899)' : 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)' }}>
                <MessageCircle className="w-5 h-5 text-white" />
                {unreadCount > 0 && !isChatOpen && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-500 group-hover:text-gray-400">ჩატი</span>
            </button>
          </div>
        </div>

        {/* ── CHAT PANEL ── */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 flex flex-col border-l overflow-hidden"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0c0c0c', minWidth: 0 }}>

              {/* Partner mini-cam in chat */}
              <div className="shrink-0 relative overflow-hidden border-b"
                style={{ borderColor: 'rgba(255,255,255,0.06)', height: partnerStream ? 185 : 0, transition: 'height 0.35s ease' }}>
                {/* video always rendered so ref is always valid */}
                <video
                  ref={partnerChatVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(to top,rgba(12,12,12,0.9) 0%,transparent 50%)' }} />
                <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} />
                  <span className="text-xs font-semibold text-white">{partnerUsername}</span>
                </div>
              </div>

              {/* Chat header */}
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">შეტყობინებები</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-600 hover:text-white transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages list */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 sb">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <MessageCircle className="w-10 h-10 text-gray-800 mb-3" />
                    <p className="text-sm text-gray-600">ჯერ შეტყობინება არ არის</p>
                    <p className="text-xs text-gray-700 mt-1">{isConnectedToPartner ? 'დაიწყე საუბარი!' : 'ჯერ დაუკავშირდი'}</p>
                  </div>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[82%] px-3.5 py-2.5 text-sm text-white"
                      style={{
                        background: msg.sender === 'me' ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.07)',
                        borderRadius: msg.sender === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                      }}>
                      <p className="leading-relaxed break-words">{msg.text}</p>
                      <p className="text-[10px] opacity-40 mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message input */}
              <div className="shrink-0 p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder={isConnectedToPartner ? 'შეიყვანეთ შეტყობინება...' : 'ჯერ დაუკავშირდი...'}
                    disabled={!isConnectedToPartner}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-700 outline-none disabled:opacity-30 transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
                  <button onClick={sendMessage} disabled={!isConnectedToPartner || !messageInput.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-30 shrink-0 transition-all"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}>
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── Reusable control button ── */
const ControlBtn = ({ onClick, active, activeIcon, inactiveIcon, label }: {
  onClick: () => void; active: boolean;
  activeIcon: React.ReactNode; inactiveIcon: React.ReactNode; label: string;
}) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
      style={{
        background: active ? 'rgba(255,255,255,0.09)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${active ? 'rgba(255,255,255,0.13)' : 'rgba(239,68,68,0.3)'}`,
        color: active ? '#e5e7eb' : '#f87171',
      }}>
      {active ? activeIcon : inactiveIcon}
    </div>
    <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">{label}</span>
  </button>
);

export default VideoChat;