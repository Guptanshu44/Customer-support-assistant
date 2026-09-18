import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare, Plus, Search, HelpCircle, CheckCircle, Clock,
  AlertTriangle, ArrowRight, ChevronRight, Send, User, Shield,
  FileText, ExternalLink, Sparkles, RefreshCw, X, ChevronDown,
  Building, Check, Hash, Inbox, PhoneCall, Mail
} from 'lucide-react';
import { 
  listenToTickets, 
  saveTicketToFirestore, 
  isFirebaseConfigured, 
  getCurrentAuthUser,
  onAuthChange,
  logoutUser,
  isMockTicketOrSession
} from '../api/firebase';
import { api, formatTicketTime } from '../api/client';

const CATEGORIES = [
  'Billing & Invoices',
  'Technical Support',
  'Delivery & Shipping',
  'Account & Security',
  'Product Feedback',
  'General Inquiry'
];

const FAQS = [
  {
    category: 'Billing',
    question: 'How long do refund requests take to process?',
    answer: 'Refunds for duplicate charges or eligible cancellations are initiated within 24 hours. Bank card refunds typically reflect within 3 to 5 business days, while bank wire transfers may take up to 7 business days.'
  },
  {
    category: 'Delivery',
    question: 'What happens if my package tracking shows delivered but I have not received it?',
    answer: 'If your shipment tracking indicates delivered but the parcel is not found, please check with premises security or front desk staff first. If still missing, submit an Urgent Support Request with your Order ID and delivery pin code so we can initiate a priority 24-hour carrier trace.'
  },
  {
    category: 'Billing',
    question: 'Can I change or upgrade my subscription plan mid-cycle?',
    answer: 'Yes, you can upgrade your plan at any time. Prorated credits for the unused portion of your current billing cycle are automatically applied toward your new plan on your next invoice.'
  },
  {
    category: 'Account',
    question: 'How do I reset my account password or update multi-factor authentication (MFA)?',
    answer: 'Click "Forgot Password" on the login screen to receive a secure password reset link. To update MFA or authorized account emails, navigate to your Profile tab or contact our dedicated security team.'
  },
  {
    category: 'Technical',
    question: 'Where can I find API status, documentation, and service uptime?',
    answer: 'Our systems maintain 99.98% operational uptime. Real-time platform status and API release documentation are available 24/7 with zero downtime maintenance windows.'
  }
];

export default function CustomerPortal({ onNavigate, currentUser, activeSubTab = 'tickets' }) {
  const [activeTab, setActiveTab] = useState(activeSubTab); // 'tickets' | 'new-ticket' | 'knowledge-base' | 'profile'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(0);
  const [kbQuery, setKbQuery] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [replySuccess, setReplySuccess] = useState('');

  // New Ticket Form State
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'Billing & Invoices',
    priority: 'high',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerEmail = currentUser?.email || 'customer@client.com';
  const customerName = currentUser?.displayName || 'David Miller';
  const customerCompany = currentUser?.company || 'Direct Consumer';
  const customerPlan = currentUser?.plan || 'Enterprise';

  useEffect(() => {
    setActiveTab(activeSubTab);
  }, [activeSubTab]);

  // Listen to tickets from Firestore and LocalStorage
  useEffect(() => {
    const loadStoredTickets = () => {
      try {
        const stored = localStorage.getItem('carebot_tickets_list_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter(t => t && !isMockTicketOrSession(t.id));
          }
        }
      } catch (e) {}
      return [];
    };

    const initial = loadStoredTickets();
    setTickets(initial);

    const unsub = listenToTickets((fireTickets) => {
      if (Array.isArray(fireTickets)) {
        const clean = fireTickets.filter(t => t && !isMockTicketOrSession(t.id));
        setTickets(clean);
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Filter tickets matching this customer
  const customerTickets = useMemo(() => {
    const cEmailLower = customerEmail.toLowerCase().trim();
    const cNameLower = customerName.toLowerCase().trim();

    return tickets.filter(t => {
      if (!t) return false;
      const tCustomer = String(t.customer || t.customerName || '').toLowerCase().trim();
      const tEmail = String(t.customerEmail || t.agentEmail || '').toLowerCase().trim();

      // Match either by customer email, customer name, or if user created
      return (
        (cEmailLower && tEmail.includes(cEmailLower)) ||
        (cNameLower && tCustomer.includes(cNameLower)) ||
        t.isCustomerTicket ||
        tCustomer === 'david miller' ||
        t.id?.startsWith('TK-DEMO-')
      );
    });
  }, [tickets, customerEmail, customerName]);

  const filteredTickets = useMemo(() => {
    return customerTickets.filter(t => {
      if (statusFilter !== 'all') {
        const s = String(t.status || 'open').toLowerCase();
        if (statusFilter === 'open' && s !== 'open') return false;
        if (statusFilter === 'pending' && s !== 'pending') return false;
        if (statusFilter === 'resolved' && s !== 'resolved' && s !== 'approved') return false;
        if (statusFilter === 'closed' && s !== 'closed') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = (t.subject || '').toLowerCase().includes(q);
        const matchId = (t.id || '').toLowerCase().includes(q);
        const matchDesc = (t.initialMessage || t.description || '').toLowerCase().includes(q);
        if (!matchSub && !matchId && !matchDesc) return false;
      }
      return true;
    });
  }, [customerTickets, statusFilter, searchQuery]);

  // Counts
  const countOpen = customerTickets.filter(t => String(t.status).toLowerCase() === 'open').length;
  const countPending = customerTickets.filter(t => String(t.status).toLowerCase() === 'pending').length;
  const countResolved = customerTickets.filter(t => ['resolved', 'approved', 'closed'].includes(String(t.status).toLowerCase())).length;

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) return;

    setIsSubmitting(true);
    setSubmitSuccess(null);

    const ticketId = `TK-${Math.floor(4000 + Math.random() * 5900)}`;
    const now = new Date();
    const nowIso = now.toISOString();
    const exactTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const ticketRecord = {
      id: ticketId,
      subject: newTicket.subject.trim(),
      customer: customerName,
      customerEmail: customerEmail,
      company: customerCompany,
      status: 'open',
      priority: newTicket.priority,
      category: newTicket.category,
      channel: 'chat',
      agent: 'Unassigned (In Queue)',
      initialMessage: newTicket.message.trim(),
      messages: [
        {
          sender: 'customer',
          author: customerName,
          text: newTicket.message.trim(),
          timestamp: exactTime,
          timestampIso: nowIso,
        }
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      created: exactTime,
      isUserCreated: true,
      isCustomerTicket: true,
      tags: [newTicket.category.toLowerCase().split(' ')[0], 'customer-portal']
    };

    // 1. Update local state
    setTickets(prev => [ticketRecord, ...prev]);

    // 2. Persist to Firestore if configured
    if (isFirebaseConfigured()) {
      await saveTicketToFirestore(ticketRecord);
    }

    // 3. Save to localStorage for instant resilience
    try {
      const stored = localStorage.getItem('carebot_tickets_list_v2');
      const list = stored ? JSON.parse(stored) : [];
      localStorage.setItem('carebot_tickets_list_v2', JSON.stringify([ticketRecord, ...list]));
    } catch (err) {}

    // 4. Create backend session so agents can interact via copilot
    try {
      await api.createSession({
        session_id: ticketId,
        id: ticketId,
        name: customerName,
        customer_email: customerEmail,
        plan: customerPlan,
        initial_message: newTicket.message.trim(),
        title: `#${ticketId}: ${newTicket.subject.trim()}`
      });
    } catch (err) {}

    setIsSubmitting(false);
    setSubmitSuccess(`Ticket #${ticketId} submitted successfully! A support specialist will respond shortly.`);
    setNewTicket({
      subject: '',
      category: 'Billing & Invoices',
      priority: 'high',
      message: '',
    });

    // Auto navigate to tickets tab after 1.4s
    setTimeout(() => {
      setActiveTab('tickets');
      setSelectedTicket(ticketRecord);
      setSubmitSuccess(null);
    }, 1500);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setIsSendingReply(true);
    const now = new Date();
    const nowIso = now.toISOString();
    const exactTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      sender: 'customer',
      author: customerName,
      text: replyText.trim(),
      timestamp: exactTime,
      timestampIso: nowIso,
    };

    const existingMsgs = Array.isArray(selectedTicket.messages) ? selectedTicket.messages : [];
    const updatedMsgs = [...existingMsgs, newMsg];

    const updatedTicket = {
      ...selectedTicket,
      messages: updatedMsgs,
      status: 'pending', // Waiting on support specialist
      updatedAt: nowIso
    };

    // Update in tickets list
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);

    // Save to Firestore
    if (isFirebaseConfigured()) {
      await saveTicketToFirestore(updatedTicket);
    }

    // Save to localStorage
    try {
      const stored = localStorage.getItem('carebot_tickets_list_v2');
      if (stored) {
        const list = JSON.parse(stored);
        const mapped = list.map(t => t.id === updatedTicket.id ? updatedTicket : t);
        localStorage.setItem('carebot_tickets_list_v2', JSON.stringify(mapped));
      }
    } catch (err) {}

    setReplyText('');
    setIsSendingReply(false);
    setReplySuccess('Reply sent to support agent.');
    setTimeout(() => setReplySuccess(''), 2500);
  };

  const filteredFaqs = useMemo(() => {
    if (!kbQuery.trim()) return FAQS;
    const q = kbQuery.toLowerCase();
    return FAQS.filter(f => 
      f.question.toLowerCase().includes(q) || 
      f.answer.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    );
  }, [kbQuery]);

  return (
    <div className="customer-portal-root" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Banner / Welcome Card */}
      <div className="portal-hero-card" style={{
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.75) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              borderRadius: '999px',
              padding: '2px 10px',
              fontSize: '11.5px',
              fontWeight: 700
            }}>
              <CheckCircle size={12} /> Verified Customer Portal
            </span>
            <span style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              borderRadius: '999px',
              padding: '2px 10px',
              fontSize: '11.5px',
              fontWeight: 600
            }}>
              {customerPlan} SLA
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc', letterSpacing: '-0.5px' }}>
            Welcome back, {customerName}
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Track active inquiries, submit priority support requests, or browse instant self-service solutions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setActiveTab('new-ticket');
              setSelectedTicket(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Plus size={15} />
            <span>Submit New Request</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="portal-tabs-nav" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '22px',
        paddingBottom: '2px'
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('tickets'); setSelectedTicket(null); }}
          className={`portal-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'tickets' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'tickets' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'tickets' ? 700 : 500,
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === 'tickets' ? '2px solid #2563eb' : '2px solid transparent'
          }}
        >
          <MessageSquare size={15} />
          <span>My Tickets</span>
          <span style={{
            background: 'var(--bg-subtle)',
            color: 'var(--text-subtle)',
            padding: '1px 7px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            {customerTickets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('new-ticket'); setSelectedTicket(null); }}
          className={`portal-tab-btn ${activeTab === 'new-ticket' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'new-ticket' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'new-ticket' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'new-ticket' ? 700 : 500,
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === 'new-ticket' ? '2px solid #2563eb' : '2px solid transparent'
          }}
        >
          <Plus size={15} />
          <span>Submit Request</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('knowledge-base'); setSelectedTicket(null); }}
          className={`portal-tab-btn ${activeTab === 'knowledge-base' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'knowledge-base' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'knowledge-base' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'knowledge-base' ? 700 : 500,
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === 'knowledge-base' ? '2px solid #2563eb' : '2px solid transparent'
          }}
        >
          <HelpCircle size={15} />
          <span>Help Center & FAQs</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('profile'); setSelectedTicket(null); }}
          className={`portal-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'profile' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'profile' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'profile' ? 700 : 500,
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === 'profile' ? '2px solid #2563eb' : '2px solid transparent'
          }}
        >
          <User size={15} />
          <span>My Account</span>
        </button>
      </div>

      {/* ================= TAB 1: MY TICKETS ================= */}
      {activeTab === 'tickets' && (
        <div>
          {/* Status Metric Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <MessageSquare size={18} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{customerTickets.length}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Tickets</div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Clock size={18} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{countOpen + countPending}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>In Progress</div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle size={18} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{countResolved}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Resolved</div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 300px' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search ticket # or subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {['all', 'open', 'pending', 'resolved'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: statusFilter === st ? '1px solid #2563eb' : '1px solid var(--border-subtle)',
                    background: statusFilter === st ? '#2563eb' : 'var(--bg-card)',
                    color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets List and Detail Split View */}
          <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1fr' : '1fr', gap: '18px' }}>
            {/* Left Column: Tickets List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredTickets.length === 0 ? (
                <div style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <Inbox size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                    No support tickets found
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                    {searchQuery ? 'Try adjusting your search terms.' : 'You have not submitted any inquiries yet.'}
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setActiveTab('new-ticket')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Submit a Request
                  </button>
                </div>
              ) : (
                filteredTickets.map(ticket => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  const status = String(ticket.status || 'open').toLowerCase();
                  const isResolved = ['resolved', 'approved', 'closed'].includes(status);
                  const isPending = status === 'pending';

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      style={{
                        padding: '16px 18px',
                        borderRadius: '12px',
                        background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                        border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 14px rgba(59, 130, 246, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>
                            #{ticket.id}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                            background: isResolved ? 'rgba(16, 185, 129, 0.15)' : isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: isResolved ? '#10b981' : isPending ? '#f59e0b' : '#818cf8',
                            border: `1px solid ${isResolved ? 'rgba(16, 185, 129, 0.3)' : isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                          }}>
                            {isResolved ? 'Resolved' : isPending ? 'Pending Support' : 'Open'}
                          </span>
                          {ticket.priority && (
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: ticket.priority === 'urgent' || ticket.priority === 'high' ? '#f43f5e' : 'var(--text-muted)'
                            }}>
                              · {ticket.priority.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {ticket.created || 'Recently'}
                        </span>
                      </div>

                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        {ticket.subject}
                      </div>

                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '10px' }}>
                        {ticket.initialMessage || ticket.description || 'Customer support request.'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-subtle)' }}>
                        <span>Category: <strong>{ticket.category || 'Support'}</strong></span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
                          View conversation <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Ticket Conversation Thread */}
            {selectedTicket && (
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '680px',
                overflow: 'hidden'
              }}>
                {/* Thread Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>
                        #{selectedTicket.id}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8'
                      }}>
                        {selectedTicket.status?.toUpperCase() || 'OPEN'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {selectedTicket.subject}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Messages Stream */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '6px', marginBottom: '14px' }}>
                  {/* Initial Message */}
                  <div style={{
                    alignSelf: 'flex-start',
                    maxWidth: '85%',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px 12px 12px 2px',
                    padding: '12px 16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>{customerName} (You)</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{selectedTicket.created || 'Initial'}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {selectedTicket.initialMessage || selectedTicket.description || 'I need help with my account.'}
                    </div>
                  </div>

                  {/* Any additional turns */}
                  {Array.isArray(selectedTicket.messages) && selectedTicket.messages.map((m, idx) => {
                    const isMe = m.sender === 'customer';
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isMe ? 'flex-start' : 'flex-end',
                          maxWidth: '85%',
                          background: isMe ? 'var(--bg-elevated)' : 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(30, 58, 138, 0.25))',
                          border: isMe ? '1px solid var(--border-subtle)' : '1px solid rgba(59, 130, 246, 0.4)',
                          borderRadius: isMe ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                          padding: '12px 16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isMe ? '#38bdf8' : '#10b981' }}>
                            {isMe ? `${customerName} (You)` : (m.author || 'Support Specialist')}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{m.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Box */}
                {replySuccess && (
                  <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '12px', marginBottom: '8px' }}>
                    <CheckCircle size={12} style={{ display: 'inline', marginRight: '5px' }} />
                    {replySuccess}
                  </div>
                )}
                <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Type a follow-up reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                      opacity: replyText.trim() ? 1 : 0.6
                    }}
                  >
                    <Send size={13} />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: SUBMIT REQUEST ================= */}
      {activeTab === 'new-ticket' && (
        <div style={{ maxWidth: '680px', margin: '0 auto', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)', padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
              Submit a Support Request
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Our dedicated support specialists respond within {customerPlan === 'Enterprise' ? '1 hour' : '4 hours'}.
            </p>
          </div>

          {submitSuccess && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <CheckCircle size={16} />
              <span>{submitSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Subject / Issue Summary <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Question regarding my recent invoice or service downtime"
                value={newTicket.subject}
                onChange={e => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={newTicket.category}
                  onChange={e => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Urgency Level
                </label>
                <select
                  value={newTicket.priority}
                  onChange={e => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="normal">Normal (Standard SLA)</option>
                  <option value="high">High (Needs Attention)</option>
                  <option value="urgent">Urgent (Service Critical)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Detailed Description <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={5}
                required
                placeholder="Please describe what happened, any error messages, and what you need assistance with..."
                value={newTicket.message}
                onChange={e => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newTicket.subject.trim() || !newTicket.message.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'wait' : 'pointer'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Support Request'}
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 3: HELP CENTER & FAQS ================= */}
      {activeTab === 'knowledge-base' && (
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              Frequently Asked Questions & Policies
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
              Instant answers grounded directly in our enterprise knowledge base.
            </p>

            <div style={{ position: 'relative', maxWidth: '520px', margin: '0 auto' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="text"
                placeholder="Search billing rules, refunds, delivery trace, account security..."
                value={kbQuery}
                onChange={e => setKbQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredFaqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '10.5px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#818cf8',
                        fontWeight: 700
                      }}>
                        {faq.category}
                      </span>
                      <span>{faq.question}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        color: 'var(--text-muted)'
                      }}
                    />
                  </button>

                  {isOpen && (
                    <div style={{
                      padding: '0 20px 16px 20px',
                      fontSize: '13.5px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.6,
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '12px'
                    }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '32px',
            padding: '20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(15, 23, 42, 0.3))',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Did not find what you were looking for?
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Our enterprise support team is available 24/7 to resolve unique inquiries.
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setActiveTab('new-ticket')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              Open a Support Ticket →
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 4: MY ACCOUNT ================= */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)', padding: '28px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
            Customer Account & SLA
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px', marginBottom: '20px' }}>
            <div style={{
              width: '54px', height: '54px', borderRadius: '50%',
              background: '#2563eb', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '20px'
            }}>
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{customerName}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{customerEmail}</div>
              <span style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                fontSize: '11px',
                fontWeight: 700
              }}>
                Role: Customer Account
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Organization / Company</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{customerCompany}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Active Service Plan</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{customerPlan} Tier</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Response SLA Commitment</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>&lt; 1 Hour Guarantee</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Support Channel</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Priority Live Chat & Ticket Portal</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Lifetime Tickets Resolved</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8' }}>{countResolved} Cases</span>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={async () => {
                await logoutUser();
                onNavigate('landing');
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sign Out of Customer Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
