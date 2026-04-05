import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './components/Home';
import VideoChat from './components/VideoChat';
import { SocketProvider } from './contexts/SocketContext';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<VideoChat />} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#fff',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                backdropFilter: 'blur(10px)',
              },
            }}
          />
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
