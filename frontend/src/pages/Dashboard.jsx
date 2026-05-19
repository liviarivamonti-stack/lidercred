import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const GOALS = [
  { label: 'Bronze', value: 5000,  color: '#f5d76e', gradFrom: '#b89e3a', gradTo: '#f5d76e' },
  { label: 'Prata',  value: 10000, color: '#89c4e1', gradFrom: '#3a7aaa', gradTo: '#89c4e1' },
  { label: 'Ouro',   value: 20000, color: '#4ecda4', gradFrom: '#1a8a64', gradTo: '#4ecda4' },
];

// Cores melhoradas para contraste e visual Fintech
const C = {
  bgBase: '#0a0c10', // Mais escuro para profundidade
  bgCard: '#161b22', 
  bgInput: '#0d1117',
  border: '#30363d',
  borderAccent: '#58a6ff',
  textPrimary: '#f0f6fc', // Branco puro para melhor contraste
  textSecondary: '#8b949e',
  textHint: '#484f58',
  blue: '#58a6ff',
  blueDim: '#1f6feb',
  blueGlow: 'rgba(88,166,255,0.15)',
  yellow: '#d29922',
  yellowDim: '#9e6a03',
  green: '#238636',
};

const MEDALS = ['🥇','🥈','🥉'];

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
}

function ProgressBar({ pct, from, to }) {
  return (
    <div style={{ background: '#21262d', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: '99px', background: `linear-gradient(90deg, ${from}, ${to})`, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [mySales, setMySales] = useState({ sales: [], total: 0 });
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('ranking');
  const [form, setForm] = useState({ amount: '', description: '' });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [r, m, h] = await Promise.all([
        axios.get(`${API}/sales/ranking`),
        axios.get(`${API}/sales/mine`),
        axios.get(`${API}/sales/history`),
      ]);
      setRanking(r.data); setMySales(m.data); setHistory(h.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const socket = io(SOCKET_URL);
    socket.on('ranking_updated', setRanking);
    socket.on('goal_achieved', ({ name, goals }) => {
      if (name === user.name) confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
      showToast(`🎉 ${name} atingiu a meta de ${goals.map(g => fmt(g)).join(' e ')}!`);
    });
    return () => socket.disconnect();
  }, [fetchAll, user.name]);

  async function handleAddSale(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return showToast('Digite um valor válido.', true);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/sales`, form);
      setForm({ amount: '', description: '' });
      await fetchAll();
      if (data.goalsHit?.length > 0) {
        confetti({ particleCount: 250, spread: 120, origin: { y: 0.5 } });
        showToast(`🏆 Incrível! Você bateu a meta ${data.goalsHit.map(g => fmt(g)).join(' e ')}!`);
      } else {
        showToast(`Venda de ${fmt(amount)} registrada!`);
      }
      setTab('ranking');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao registrar venda.', true);
    } finally { setLoading(false); }
  }

  const filteredRanking = ranking.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const myRank = ranking.find(r => r.id === user.id);

  return (
    <div style={{ minHeight: '100vh', background: C.bgBase, color: C.textPrimary, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Toast Notificações */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: toast.isError ? '#ff4444' : C.blueDim,
          color: '#fff', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'slideDown 0.3s ease'
        }}>{toast.msg}</div>
      )}

      {/* Header Profissional */}
      <header style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: '16px 1rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: C.blue, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>R</div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Realize Score</h1>
              <p style={{ fontSize: '12px', color: C.textSecondary, margin: 0 }}>{user.name} • {user.role || 'Vendedor'}</p>
            </div>
          </div>
          <button onClick={logout} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, cursor: 'pointer' }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 1rem 100px' }}>
        
        {/* Métricas Rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Equipe', value: fmt(ranking.reduce((a,r) => a + parseFloat(r.total||0), 0)), color: C.blue },
            { label: 'Sua Posição', value: myRank ? `${myRank.rank}º` : '-', color: C.yellow },
            { label: 'Seu Total', value: fmt(mySales.total || 0), color: C.green },
          ].map(m => (
            <div key={m.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: C.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs de Navegação */}
        <div style={{ display: 'flex', background: C.bgCard, padding: '4px', borderRadius: '12px', marginBottom: '24px', border: `1px solid ${C.border}` }}>
          {[
            { id: 'ranking', label: 'Ranking', icon: '🏆' },
            { id: 'mysales', label: 'Vender', icon: '💰' },
            { id: 'history', label: 'Histórico', icon: '📋' }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              background: tab === t.id ? C.bgInput : 'transparent',
              color: tab === t.id ? C.blue : C.textSecondary,
              transition: '0.2s'
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo: Ranking */}
        {tab === 'ranking' && (
          <section>
            <div style={{ marginBottom: '16px' }}>
              <input type="text" placeholder="Buscar vendedor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bgCard, color: C.textPrimary, fontSize: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredRanking.map((s, i) => {
                const isMe = s.id === user.id;
                const total = parseFloat(s.total || 0);
                return (
                  <div key={s.id} style={{ 
                    background: C.bgCard, border: `1px solid ${isMe ? C.blue : C.border}`, borderRadius: '16px', padding: '16px',
                    boxShadow: isMe ? `0 0 20px ${C.blueGlow}` : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: i < 3 ? `${C.yellow}20` : C.bgInput, border: `1px solid ${i < 3 ? C.yellow : C.border}`,
                        fontSize: i < 3 ? '18px' : '14px', fontWeight: 700, color: i < 3 ? C.yellow : C.textSecondary
                      }}>
                        {i < 3 ? MEDALS[i] : i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 600 }}>{s.name} {isMe && '(Você)'}</div>
                        <div style={{ fontSize: '13px', color: C.textSecondary }}>{fmt(total)} acumulados</div>
                      </div>
                    </div>
                    {/* Metas Compactas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {GOALS.map(g => {
                        const pct = Math.min(100, (total / g.value) * 100);
                        return (
                          <div key={g.value}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                              <span style={{ color: C.textSecondary }}>{g.label}</span>
                              <span style={{ color: pct >= 100 ? C.green : C.textSecondary }}>{pct.toFixed(0)}%</span>
                            </div>
                            <ProgressBar pct={pct} from={g.gradFrom} to={g.gradTo} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Conteúdo: Registrar Venda */}
        {tab === 'mysales' && (
          <section style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Nova Venda</h2>
              <form onSubmit={handleAddSale}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: C.textSecondary, marginBottom: '8px', fontWeight: 600 }}>VALOR DA VENDA (R$)</label>
                  <input type="number" step="0.01" placeholder="0,00" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bgInput, color: C.textPrimary, fontSize: '18px', fontWeight: 700 }} />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: C.textSecondary, marginBottom: '8px', fontWeight: 600 }}>DESCRIÇÃO / CONTRATO</label>
                  <input type="text" placeholder="Ex: Cliente João Silva" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bgInput, color: C.textPrimary, fontSize: '14px' }} />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '16px', borderRadius: '12px', background: C.blue, color: '#fff', border: 'none',
                  fontSize: '16px', fontWeight: 700, cursor: 'pointer', transition: '0.2s', opacity: loading ? 0.7 : 1
                }}>
                  {loading ? 'Processando...' : 'Confirmar Venda'}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Conteúdo: Histórico */}
        {tab === 'history' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map(s => (
              <div key={s.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${C.blue}15`, color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700 }}>
                  {s.seller_name?.[0] || 'V'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{s.seller_name}</div>
                  <div style={{ fontSize: '12px', color: C.textSecondary }}>{s.description || 'Venda registrada'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.green }}>+{fmt(s.amount)}</div>
                  <div style={{ fontSize: '11px', color: C.textHint }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            ))}
          </section>
        )}

      </main>

      {/* Estilos Globais para Animações */}
      <style>{`
        @keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        input:focus { outline: none; border-color: ${C.blue} !important; box-shadow: 0 0 0 2px ${C.blueGlow}; }
      `}</style>
    </div>
  );
}
