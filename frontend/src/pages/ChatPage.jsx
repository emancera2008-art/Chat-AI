import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Car, Send, Plus, Trash2, MessageSquare, LogOut,
  Settings, ChevronLeft, Menu, Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';

function TypingIndicator() {
  return (
    <div className="flex gap-3 message-appear">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
        <Car className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-5">
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full block" />
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full block" />
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full block" />
        </div>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 message-appear ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${isUser ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white'}`}>
        {isUser ? msg.initials : <Car className="w-4 h-4" />}
      </div>
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-blue-600 text-white rounded-tr-sm'
          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, logout, isAdmin } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const loadConversations = useCallback(async () => {
    const { data } = await api.get('/chat/conversations');
    setConversations(data);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  async function selectConversation(id) {
    setActiveId(id);
    const { data } = await api.get(`/chat/conversations/${id}/messages`);
    setMessages(data.messages.map(m => ({ ...m, initials })));
  }

  async function newConversation() {
    const { data } = await api.post('/chat/conversations');
    await loadConversations();
    setActiveId(data.id);
    setMessages([]);
    inputRef.current?.focus();
  }

  async function deleteConversation(e, id) {
    e.stopPropagation();
    await api.delete(`/chat/conversations/${id}`);
    if (activeId === id) { setActiveId(null); setMessages([]); }
    await loadConversations();
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let convId = activeId;
    if (!convId) {
      const { data } = await api.post('/chat/conversations');
      convId = data.id;
      setActiveId(convId);
    }

    const userMsg = { role: 'user', content: input.trim(), initials };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setLoading(true);

    try {
      const { data } = await api.post(`/chat/conversations/${convId}/messages`, { content: userMsg.content });
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      await loadConversations();
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setTyping(false);
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0 bg-blue-900 flex flex-col`}>
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-white font-bold text-lg">DealerAI</span>
          </div>
          <button onClick={newConversation} className="w-full flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg px-3 py-2.5 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto chat-scrollbar px-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-blue-300 text-xs text-center py-8 px-4">No conversations yet. Start one above!</p>
          )}
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm group transition-colors ${
                activeId === c.id ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800'
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{c.title}</span>
              <button
                onClick={e => deleteConversation(e, c.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
          ))}
        </div>

        {/* User info */}
        <div className="p-4 border-t border-blue-800 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-blue-300 text-xs truncate">{user?.department}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link to="/admin" className="flex-1 flex items-center justify-center gap-1.5 bg-blue-800 hover:bg-blue-700 text-blue-200 rounded-lg py-1.5 text-xs transition-colors">
                <Settings className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
            <button onClick={logout} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-800 hover:bg-blue-700 text-blue-200 rounded-lg py-1.5 text-xs transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(v => !v)} className="text-gray-500 hover:text-gray-700">
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-800">
              {activeId ? conversations.find(c => c.id === activeId)?.title || 'Conversation' : 'DealerAI Assistant'}
            </h1>
            <p className="text-xs text-gray-400">Powered by Claude · Private &amp; Secure</p>
          </div>
          <div className="flex items-center gap-1 text-green-600 bg-green-50 border border-green-100 rounded-full px-2.5 py-1 text-xs font-medium">
            <Shield className="w-3 h-3" /> Private
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto chat-scrollbar p-6 space-y-4">
          {messages.length === 0 && !typing && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <Car className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">How can I help you today?</h2>
              <p className="text-gray-400 text-sm max-w-sm">Ask me about vehicles, financing, trade-ins, pricing, sales techniques, or anything else your team needs.</p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-md w-full">
                {[
                  'What are current financing rates?',
                  'How do I handle a trade-in appraisal?',
                  'Compare sedan vs SUV for a family buyer',
                  'What are good closing techniques?',
                ].map(q => (
                  <button key={q} onClick={() => setInput(q)} className="text-left bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl p-3 text-xs text-gray-600 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything about vehicles, sales, financing…"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50"
              disabled={loading}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-2">Your conversations are private and never used to train AI models.</p>
        </div>
      </div>
    </div>
  );
}
