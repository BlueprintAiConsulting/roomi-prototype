// FounderHub.jsx — ROOMI Founder Hub Dashboard
// Centralized workspace for the founding council: documents, decisions, meetings, funding, pilots, product, team, discussion

import { useState, useEffect, useCallback, useRef, Component } from 'react';
import {
  uploadHubDocument, deleteHubDocument,
  saveDecision, deleteDecision,
  saveMeeting, deleteMeeting,
  saveFundingEntry, deleteFundingEntry,
  savePilot, deletePilot,
  saveProductUpdate, deleteProductUpdate,
  saveTeamMember,
  postToFoundersRoom, deleteFoundersRoomPost,
  saveActionItem, deleteActionItem,
  togglePin, toggleRoomReaction,
  saveGFMDonor, deleteGFMDonor, subscribeGFMDonors,
  getFileTypeInfo, formatFileSize,
  subscribeDocuments, subscribeDecisions, subscribeMeetings, subscribeFunding,
  subscribePilots, subscribeProduct, subscribeTeam, subscribeRoom,
  subscribeActionItems, subscribeAll, subscribeActivity, logActivity,
} from '../hooks/useHub.js';
import './FounderHub.css';

// ─── Error Boundary ─────────────────────────────────────────

class HubErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[hub] Error boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="hub-error">
          <span className="hub-error-icon">⚠️</span>
          <h3 className="hub-error-title">Something went wrong</h3>
          <p className="hub-error-text">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button className="hub-btn-new" onClick={() => this.setState({ hasError: false, error: null })}>
            ↻ Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Skeleton Loader ────────────────────────────────────────

function HubSkeleton() {
  return (
    <div className="hub-skeleton">
      {[1, 2, 3].map(i => (
        <div key={i} className="hub-skeleton-row">
          <div className="hub-skeleton-avatar hub-skeleton-shimmer" />
          <div className="hub-skeleton-body">
            <div className="hub-skeleton-line hub-skeleton-line--title hub-skeleton-shimmer" />
            <div className="hub-skeleton-line hub-skeleton-line--meta hub-skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Renders post text with @mention highlights
function renderMentions(text) {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="hub-mention">{part}</span>
      : part
  );
}

const TABS = [
  { id: 'overview',   icon: '🏠', label: 'Overview' },
  { id: 'room',       icon: '💬', label: 'Founders Room' },
  { id: 'actions',    icon: '✅', label: 'Action Items' },
  { id: 'documents',  icon: '📄', label: 'Documents' },
  { id: 'decisions',  icon: '📋', label: 'Decisions' },
  { id: 'meetings',   icon: '📅', label: 'Meetings' },
  { id: 'funding',    icon: '💰', label: 'Funding' },
  { id: 'pilots',     icon: '🧪', label: 'Pilots' },
  { id: 'product',    icon: '🚀', label: 'Product' },
  { id: 'team',       icon: '👥', label: 'Team' },
];

// ─── Search Utility ─────────────────────────────────────────

function filterBySearch(items, query) {
  if (!query?.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(item => {
    const fields = [
      item.title, item.text, item.description, item.notes,
      item.source, item.organization, item.contact,
      item.fileName, item.authorName, item.creatorName,
      item.assignee, item.name,
    ];
    return fields.some(f => f && String(f).toLowerCase().includes(q));
  });
}

function sortWithPins(items) {
  return [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
}

// Founding council defaults (used when Firestore hub_team is empty)
const DEFAULT_TEAM = [
  { name: 'Wade Smith',         role: 'Founder',       initials: 'WS', order: 1 },
  { name: 'Drew Hufnagle',      role: 'Founder',       initials: 'DH', order: 2 },
  { name: 'Cassie Smith',       role: 'Design / Ops',  initials: 'CS', order: 3 },
  { name: 'Alyssa Senft',       role: 'Council',       initials: 'AS', order: 4 },
  { name: 'Dalton Senft',       role: 'Council',       initials: 'DS', order: 5 },
  { name: 'Breanna McCullough', role: 'Council',       initials: 'BM', order: 6 },
];

export default function FounderHub({ userId, userName }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gfmDonors, setGfmDonors] = useState([]);

  // Data stores
  const [documents, setDocuments] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [funding, setFunding] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [product, setProduct] = useState([]);
  const [team, setTeam] = useState([]);
  const [roomPosts, setRoomPosts] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  // Form visibility
  const [showForm, setShowForm] = useState(false);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Real-time subscriptions — torn down on tab change / unmount
  useEffect(() => {
    setLoading(true);

    const setTeamSafe = (data) =>
      setTeam(data.length > 0 ? data : DEFAULT_TEAM);

    let unsub;

    if (activeTab === 'overview') {
      // Open all listeners in parallel for the dashboard
      const unsubGfm = subscribeGFMDonors(setGfmDonors);
      const unsubAll = subscribeAll({
        onDocuments:   setDocuments,
        onDecisions:   setDecisions,
        onMeetings:    setMeetings,
        onFunding:     setFunding,
        onPilots:      setPilots,
        onProduct:     setProduct,
        onTeam:        setTeamSafe,
        onRoom:        setRoomPosts,
        onActionItems: setActionItems,
        onActivity:    setActivityLog,
      });
      unsub = () => { unsubAll(); unsubGfm(); };
    } else {
      switch (activeTab) {
        case 'documents': unsub = subscribeDocuments(setDocuments);    break;
        case 'decisions': unsub = subscribeDecisions(setDecisions);    break;
        case 'meetings':  unsub = subscribeMeetings(setMeetings);      break;
        case 'funding':   unsub = subscribeFunding(setFunding);        break;
        case 'pilots':    unsub = subscribePilots(setPilots);          break;
        case 'product':   unsub = subscribeProduct(setProduct);        break;
        case 'team':      unsub = subscribeTeam(setTeamSafe);          break;
        case 'room':      unsub = subscribeRoom(setRoomPosts);         break;
        case 'actions':   unsub = subscribeActionItems(setActionItems); break;
        default:          unsub = () => {};
      }
    }

    // First snapshot fires fast — clear loading immediately after 400ms max
    const loadTimer = setTimeout(() => setLoading(false), 400);

    return () => {
      clearTimeout(loadTimer);
      setLoading(false);
      if (typeof unsub === 'function') unsub();
    };
  }, [activeTab]);

  // Counts for tab badges
  const counts = {
    room: roomPosts.length,
    actions: actionItems.length,
    documents: documents.length,
    decisions: decisions.length,
    meetings: meetings.length,
    funding: funding.length,
    pilots: pilots.length,
    product: product.length,
    team: team.length,
  };

  // Count open Critical action items for alert badge
  const criticalOpenCount = actionItems.filter(
    a => a.priority === 'Critical' && a.status !== 'Done'
  ).length;

  // Reset form + search when switching tabs
  useEffect(() => { setShowForm(false); setSearchQuery(''); }, [activeTab]);

  const renderTabContent = () => {
    if (loading) return <HubSkeleton />;

    switch (activeTab) {
      case 'overview':
        return <OverviewTab counts={counts} actionItems={actionItems} decisions={decisions} meetings={meetings} product={product} activityLog={activityLog} gfmDonors={gfmDonors} setActionItems={setActionItems} setActiveTab={setActiveTab} showToast={showToast} />;
      case 'room':
        return <FoundersRoomTab posts={filterBySearch(roomPosts, searchQuery)} setPosts={setRoomPosts} userId={userId} userName={userName} showToast={showToast} />;
      case 'actions':
        return <ActionItemsTab data={sortWithPins(filterBySearch(actionItems, searchQuery))} setData={setActionItems} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} onActivityLog={(e) => logActivity({ ...e, actor: userName })} />;
      case 'documents':
        return <DocumentsTab documents={sortWithPins(filterBySearch(documents, searchQuery))} setDocuments={setDocuments} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} onActivityLog={(e) => logActivity({ ...e, actor: userName })} />;
      case 'decisions':
        return <DecisionsTab data={sortWithPins(filterBySearch(decisions, searchQuery))} setData={setDecisions} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} onActivityLog={(e) => logActivity({ ...e, actor: userName })} />;
      case 'meetings':
        return <MeetingsTab data={sortWithPins(filterBySearch(meetings, searchQuery))} setData={setMeetings} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} onActivityLog={(e) => logActivity({ ...e, actor: userName })} />;
      case 'funding':
        return <FundingTab data={sortWithPins(filterBySearch(funding, searchQuery))} setData={setFunding} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} onActivityLog={(e) => logActivity({ ...e, actor: userName })} gfmDonors={gfmDonors} setGfmDonors={setGfmDonors} />;
      case 'pilots':
        return <PilotsTab data={sortWithPins(filterBySearch(pilots, searchQuery))} setData={setPilots} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} onActivityLog={(e) => logActivity({ ...e, actor: userName })} />;
      case 'product':
        return <ProductTab data={sortWithPins(filterBySearch(product, searchQuery))} setData={setProduct} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} onActivityLog={(e) => logActivity({ ...e, actor: userName })} />;
      case 'team':
        return <TeamTab data={filterBySearch(team, searchQuery)} />;
      default:
        return null;
    }
  };

  return (
    <div className="hub" id="founder-hub">
      <header className="hub-header">
        <span className="hub-header-icon">🦊</span>
        <h1 className="hub-title">Founder Hub</h1>
        <p className="hub-subtitle">ROOMI Executive Council Workspace</p>
      </header>

      <div className="hub-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`hub-tab ${activeTab === tab.id ? 'hub-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            id={`hub-tab-${tab.id}`}
          >
            <span className="hub-tab-icon">{tab.icon}</span>
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className="hub-tab-badge">{counts[tab.id]}</span>
            )}
            {tab.id === 'actions' && criticalOpenCount > 0 && (
              <span className="hub-tab-critical" title={`${criticalOpenCount} Critical open`}>🔴</span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar — hidden on overview */}
      {activeTab !== 'overview' && (
        <div className="hub-search">
          <span className="hub-search-icon">🔍</span>
          <input
            className="hub-search-input"
            type="text"
            placeholder={`Search ${TABS.find(t => t.id === activeTab)?.label || ''}…`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            id="hub-search"
          />
          {searchQuery && (
            <button className="hub-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      )}

      <div className="hub-panel" role="tabpanel" aria-labelledby={`hub-tab-${activeTab}`}>
        <HubErrorBoundary>
          {renderTabContent()}
        </HubErrorBoundary>
      </div>

      {toast && (
        <div className={`hub-toast ${toast.isError ? 'hub-toast--error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ─── Founders Room Tab ──────────────────────────────────────

function FoundersRoomTab({ posts, setPosts, userId, userName, showToast }) {
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const id = await postToFoundersRoom({
        text: newPost.trim(),
        authorId: userId,
        authorName: userName || 'Founder',
      });
      setPosts(prev => [{
        id,
        text: newPost.trim(),
        authorId: userId,
        authorName: userName || 'Founder',
        createdAt: { seconds: Date.now() / 1000 },
      }, ...prev]);
      setNewPost('');
      showToast('Posted to Founders Room');
    } catch {
      showToast('Failed to post', true);
    }
    setPosting(false);
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    await deleteFoundersRoomPost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    showToast('Post deleted');
  };

  const handleReact = async (postId, emoji) => {
    if (!userId) return;
    try {
      await toggleRoomReaction(postId, emoji, userId);
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const reactions = p.reactions || {};
        const users = reactions[emoji] || [];
        const already = users.includes(userId);
        return {
          ...p,
          reactions: {
            ...reactions,
            [emoji]: already ? users.filter(u => u !== userId) : [...users, userId],
          },
        };
      }));
    } catch {
      showToast('Failed to react', true);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const REACTIONS = ['👍', '❤️', '🔥', '💡'];

  return (
    <>
      <div className="hub-panel-header">
        <h2 className="hub-panel-title">💬 Founders Room</h2>
      </div>

      <div className="hub-post-input-row">
        <div className="hub-post-input-wrap">
          <textarea
            className="hub-form-textarea"
            placeholder="Share an update, idea, or question with the council…"
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handlePost(); }}
          />
          <span className="hub-post-hint">⌘ + Enter to post</span>
        </div>
        <button className="hub-btn-new" onClick={handlePost} disabled={posting || !newPost.trim()}>
          {posting ? '…' : '📤 Post'}
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="hub-empty">
          <span className="hub-empty-icon">💬</span>
          <p className="hub-empty-text">No posts yet. Start the conversation!</p>
        </div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="hub-post">
            <div className="hub-post-header">
              <div className="hub-post-avatar">{getInitials(post.authorName)}</div>
              <span className="hub-post-author">{post.authorName}</span>
              <span className="hub-post-time">{formatTime(post.createdAt)}</span>
              {post.authorId === userId && (
                <button className="hub-btn-delete" onClick={() => handleDelete(post.id)}>✕</button>
              )}
            </div>
            <div className="hub-post-body">{renderMentions(post.text)}</div>
            <div className="hub-post-reactions">
              {REACTIONS.map(emoji => {
                const count = (post.reactions?.[emoji] || []).length;
                const reacted = (post.reactions?.[emoji] || []).includes(userId);
                return (
                  <button
                    key={emoji}
                    className={`hub-reaction-btn ${reacted ? 'hub-reaction-btn--active' : ''}`}
                    onClick={() => handleReact(post.id, emoji)}
                  >
                    {emoji}{count > 0 && <span className="hub-reaction-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </>
  );
}

// ─── Documents Tab ──────────────────────────────────────────

function DocumentsTab({ documents, setDocuments, userId, userName, showToast }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadHubDocument(file, userId, userName);
        if (result) {
          setDocuments(prev => [{
            id: result.id,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            downloadURL: result.downloadURL,
            storagePath: result.storagePath,
            uploaderName: userName || 'Unknown',
            uploadedAt: { seconds: Date.now() / 1000 },
          }, ...prev]);
        }
      }
      showToast(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
    } catch {
      showToast('Upload failed', true);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (docItem) => {
    if (!confirm(`Delete "${docItem.fileName}"?`)) return;
    await deleteHubDocument(docItem.id, docItem.storagePath);
    setDocuments(prev => prev.filter(d => d.id !== docItem.id));
    showToast('File deleted');
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="hub-panel-header">
        <h2 className="hub-panel-title">📄 Shared Documents</h2>
      </div>

      <div
        className={`hub-dropzone ${dragActive ? 'hub-dropzone--active' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="hub-dropzone-icon">{uploading ? '⏳' : '📁'}</span>
        <p className="hub-dropzone-text">
          {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
        </p>
        <p className="hub-dropzone-hint">Max 50MB per file</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading && (
          <div className="hub-upload-progress">
            <div className="hub-upload-progress-bar" style={{ width: '100%' }} />
          </div>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="hub-empty">
          <span className="hub-empty-icon">📄</span>
          <p className="hub-empty-text">No documents yet. Upload your first file above.</p>
        </div>
      ) : (
        <div className="hub-items">
          {documents.map(docItem => {
            const typeInfo = getFileTypeInfo(docItem.fileType);
            return (
              <div key={docItem.id} className="hub-item">
                <div className="hub-item-icon hub-file-badge" style={{ background: `${typeInfo.color}22`, color: typeInfo.color }}>
                  {typeInfo.label}
                </div>
                <div className="hub-item-body">
                  <h3 className="hub-item-title">
                    <a href={docItem.downloadURL} target="_blank" rel="noopener noreferrer">{docItem.fileName}</a>
                  </h3>
                  <div className="hub-item-meta">
                    <span>{formatFileSize(docItem.fileSize)}</span>
                    <span>by {docItem.uploaderName}</span>
                    <span>{formatTime(docItem.uploadedAt)}</span>
                  </div>
                </div>
                <div className="hub-item-actions">
                  <a href={docItem.downloadURL} target="_blank" rel="noopener noreferrer" className="hub-btn-new" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '6px 14px' }}>
                    ↓ Open
                  </a>
                  <button className="hub-btn-delete" onClick={() => handleDelete(docItem)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Generic CRUD Tab Builder ───────────────────────────────

function CrudTab({ title, icon, emptyIcon, emptyText, data, setData, fields, statusOptions, saveFn, deleteFn, collectionName, userId, userName, showForm, setShowForm, showToast, onActivityLog }) {
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        await saveFn(formData, editingId);
        setData(prev => prev.map(d => d.id === editingId ? { ...d, ...formData, updatedAt: { seconds: Date.now() / 1000 } } : d));
        showToast('Updated');
        onActivityLog?.({ action: 'updated', section: title, title: formData[fields[0]?.key] || 'entry' });
        setEditingId(null);
      } else {
        // Create new
        const payload = {
          ...formData,
          createdBy: userId,
          creatorName: userName || 'Founder',
        };
        const id = await saveFn(payload);
        setData(prev => [{
          id,
          ...payload,
          createdAt: { seconds: Date.now() / 1000 },
          updatedAt: { seconds: Date.now() / 1000 },
        }, ...prev]);
        showToast(`${title.replace(/s$/, '')} created`);
        onActivityLog?.({ action: 'added', section: title, title: formData[fields[0]?.key] || 'entry' });
      }
      setFormData({});
      setShowForm(false);
    } catch {
      showToast(`Failed to save`, true);
    }
    setSaving(false);
  };

  const handleEdit = (item) => {
    const prefill = {};
    fields.forEach(f => { prefill[f.key] = item[f.key] || ''; });
    setFormData(prefill);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({});
    setShowForm(false);
  };

  const handleDelete = async (item) => {
    const label = item[fields[0]?.key] || 'this item';
    if (!confirm(`Delete "${label}"?`)) return;
    await deleteFn(item.id);
    setData(prev => prev.filter(d => d.id !== item.id));
    showToast(`Deleted`);
    onActivityLog?.({ action: 'deleted', section: title, title: label });
  };

  const handlePin = async (item) => {
    if (!collectionName) return;
    try {
      await togglePin(collectionName, item.id, !!item.pinned);
      setData(prev => prev.map(d => d.id === item.id ? { ...d, pinned: !d.pinned } : d));
      showToast(item.pinned ? 'Unpinned' : 'Pinned 📌');
    } catch {
      showToast('Failed to pin', true);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderForm = () => (
    <div className="hub-form">
      <h3 className="hub-form-title">{editingId ? 'Edit Entry' : 'New Entry'}</h3>
      {fields.map(field => (
        <div key={field.key} className="hub-form-row">
          <label className="hub-form-label">{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea
              className="hub-form-textarea"
              placeholder={field.placeholder || ''}
              value={formData[field.key] || ''}
              onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            />
          ) : field.type === 'select' ? (
            <select
              className="hub-form-select"
              value={formData[field.key] || ''}
              onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            >
              <option value="">Select…</option>
              {(field.options || statusOptions || []).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              className="hub-form-input"
              type={field.type || 'text'}
              placeholder={field.placeholder || ''}
              value={formData[field.key] || ''}
              onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
            />
          )}
        </div>
      ))}
      <div className="hub-btn-group">
        <button className="hub-btn-new" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : editingId ? '✓ Update' : '✓ Save'}
        </button>
        <button className="hub-btn-cancel" onClick={handleCancelEdit}>Cancel</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hub-panel-header">
        <h2 className="hub-panel-title">{icon} {title}</h2>
        <button className="hub-btn-new" onClick={() => { if (showForm) handleCancelEdit(); else { setEditingId(null); setFormData({}); setShowForm(true); } }}>
          {showForm ? '✕ Cancel' : `+ New`}
        </button>
      </div>

      {showForm && renderForm()}

      {data.length === 0 ? (
        <div className="hub-empty">
          <span className="hub-empty-icon">{emptyIcon}</span>
          <p className="hub-empty-text">{emptyText}</p>
        </div>
      ) : (
        <div className="hub-items">
          {data.map(item => (
            <div key={item.id} className={`hub-item ${item.pinned ? 'hub-item--pinned' : ''}`}>
              <div className="hub-item-body">
                <h3 className="hub-item-title">
                  {item.pinned && <span className="hub-pin-indicator">📌 </span>}
                  {item[fields[0]?.key] || 'Untitled'}
                </h3>
                <div className="hub-item-meta">
                  {item.status && (
                    <span className={`hub-status hub-status--${item.status.toLowerCase().replace(/\s/g, '')}`}>
                      {item.status}
                    </span>
                  )}
                  {item.priority && (
                    <span className={`hub-priority hub-priority--${item.priority.toLowerCase()}`}>
                      {item.priority}
                    </span>
                  )}
                  {item.assignee && <span>→ {item.assignee}</span>}
                  {item.creatorName && <span>by {item.creatorName}</span>}
                  <span>{formatTime(item.createdAt)}</span>
                  {item.amount && <span>${Number(item.amount).toLocaleString()}</span>}
                  {item.dueDate && <span>Due: {item.dueDate}</span>}
                </div>
                {item[fields[1]?.key] && fields[1]?.type === 'textarea' && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    {(item[fields[1].key] || '').slice(0, 200)}{item[fields[1].key]?.length > 200 ? '…' : ''}
                  </p>
                )}
              </div>
              <div className="hub-item-actions">
                {collectionName && (
                  <button className={`hub-pin-btn ${item.pinned ? 'hub-pin-btn--active' : ''}`} onClick={() => handlePin(item)} title={item.pinned ? 'Unpin' : 'Pin'}>
                    📌
                  </button>
                )}
                <button className="hub-btn-edit" onClick={() => handleEdit(item)}>✏️</button>
                <button className="hub-btn-delete" onClick={() => handleDelete(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Overview / Dashboard Tab ───────────────────────────────

const STATUS_CYCLE = ['Todo', 'In Progress', 'Blocked', 'Done'];

// ─── Activity Feed ──────────────────────────────────────────

const ACTION_META = {
  added:     { verb: 'added',     color: '#34c759' },
  updated:   { verb: 'updated',   color: '#ff9500' },
  deleted:   { verb: 'deleted',   color: '#ff3b30' },
  completed: { verb: 'completed', color: '#5e5ce6' },
  posted:    { verb: 'posted',    color: '#63d2ff' },
};

function relativeTime(ts) {
  if (!ts) return '';
  const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ActivityFeed({ log, onViewAll }) {
  if (!log || log.length === 0) {
    return (
      <div className="hub-overview-section">
        <div className="hub-overview-section-header">
          <h3>⚡ Activity</h3>
        </div>
        <p className="hub-overview-empty">No activity yet — start collaborating!</p>
      </div>
    );
  }
  return (
    <div className="hub-overview-section hub-activity-feed">
      <div className="hub-overview-section-header">
        <h3>⚡ Activity</h3>
        <span className="hub-activity-live">● live</span>
      </div>
      <div className="hub-activity-list">
        {log.slice(0, 15).map((entry, i) => {
          const meta = ACTION_META[entry.action] || ACTION_META.updated;
          return (
            <div key={entry.id || i} className="hub-activity-row">
              <div className="hub-activity-avatar">
                {(entry.actor || 'F')[0].toUpperCase()}
              </div>
              <div className="hub-activity-body">
                <span className="hub-activity-actor">{entry.actor || 'Founder'}</span>
                {' '}
                <span className="hub-activity-verb" style={{ color: meta.color }}>{meta.verb}</span>
                {' a '}
                <span className="hub-activity-section">{entry.section}</span>
                {entry.title ? <span className="hub-activity-title"> — {entry.title.slice(0, 40)}{entry.title.length > 40 ? '…' : ''}</span> : null}
              </div>
              <span className="hub-activity-time">{relativeTime(entry.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewTab({ counts, actionItems, decisions, meetings, product, activityLog, gfmDonors, setActionItems, setActiveTab, showToast }) {
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const openActions = actionItems.filter(a => a.status !== 'Done');
  const doneActions = actionItems.filter(a => a.status === 'Done').length;
  const pinnedAll = [...actionItems].filter(a => a.pinned);
  const recentDecisions = decisions.slice(0, 3);
  const recentProduct = product.slice(0, 2);
  const lastMeeting = meetings[0];

  // Next Up: soonest due open item
  const nextUp = openActions
    .filter(a => a.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]
    || openActions.find(a => a.priority === 'Critical')
    || openActions[0];

  // GoFundMe totals
  const GFM_GOAL = 5000;
  const GFM_CAMPAIGN_URL = 'https://www.gofundme.com/f/help-launch-roomi-the-digital-mentor-for-indepen';
  const allDonors = gfmDonors.length > 0 ? gfmDonors : [
    { name: 'Melissa', amount: 200 }, { name: 'Pam', amount: 100 },
    { name: 'Jillian Kohr', amount: 50 }, { name: 'Janice Hufnagle', amount: 100 },
  ];
  const gfmRaised = allDonors.reduce((s, d) => s + Number(d.amount || 0), 0);
  const gfmPct = Math.min(100, Math.round((gfmRaised / GFM_GOAL) * 100));

  const cycleStatus = async (item) => {
    const idx = STATUS_CYCLE.indexOf(item.status || 'Todo');
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    try {
      await saveActionItem({ status: next }, item.id);
      setActionItems(prev => prev.map(a => a.id === item.id ? { ...a, status: next } : a));
      showToast(`→ ${next}`);
    } catch {
      showToast('Failed to update', true);
    }
  };

  const STAT_CARDS = [
    { label: 'Action Items', count: counts.actions, icon: '✅', tab: 'actions', accent: '#34c759' },
    { label: 'Decisions',    count: counts.decisions, icon: '📋', tab: 'decisions', accent: '#ff9500' },
    { label: 'Meetings',     count: counts.meetings,  icon: '📅', tab: 'meetings',  accent: '#5e5ce6' },
    { label: 'Funding',      count: counts.funding,   icon: '💰', tab: 'funding',   accent: '#ffd60a' },
    { label: 'Pilots',       count: counts.pilots,    icon: '🧪', tab: 'pilots',    accent: '#30d158' },
    { label: 'Documents',    count: counts.documents, icon: '📄', tab: 'documents', accent: '#63d2ff' },
  ];

  return (
    <div className="hub-overview">
      <div className="hub-panel-header">
        <h2 className="hub-panel-title">🏠 Founder Dashboard</h2>
        <span className="hub-overview-greeting">Council workspace at a glance</span>
      </div>

      {/* Next Up Banner */}
      {nextUp && (
        <div className="hub-next-up" onClick={() => setActiveTab('actions')}>
          <span className="hub-next-up-label">⚡ NEXT UP</span>
          <span className="hub-next-up-title">{nextUp.title}</span>
          <div className="hub-next-up-meta">
            {nextUp.assignee && <span>→ {nextUp.assignee}</span>}
            {nextUp.dueDate && <span className="hub-next-up-due">Due {nextUp.dueDate}</span>}
            {nextUp.priority && <span className={`hub-priority hub-priority--${nextUp.priority.toLowerCase()}`}>{nextUp.priority}</span>}
          </div>
        </div>
      )}

      {/* GoFundMe Progress Bar */}
      <div className="hub-gfm-overview" onClick={() => setActiveTab('funding')}>
        <div className="hub-gfm-overview-top">
          <span className="hub-gfm-overview-label">💚 GoFundMe</span>
          <a href={GFM_CAMPAIGN_URL} target="_blank" rel="noreferrer" className="hub-gfm-overview-link" onClick={e => e.stopPropagation()}>View Campaign ↗</a>
        </div>
        <div className="hub-gfm-overview-row">
          <span className="hub-gfm-overview-raised">${gfmRaised.toLocaleString()} raised</span>
          <span className="hub-gfm-overview-pct">{gfmPct}% of ${GFM_GOAL.toLocaleString()}</span>
        </div>
        <div className="hub-gfm-overview-track">
          <div className="hub-gfm-overview-fill" style={{ width: `${gfmPct}%` }} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="hub-stat-grid">
        {STAT_CARDS.map(card => (
          <button
            key={card.tab}
            className="hub-stat-card"
            style={{ '--accent': card.accent }}
            onClick={() => setActiveTab(card.tab)}
          >
            <span className="hub-stat-icon">{card.icon}</span>
            <span className="hub-stat-count">{card.count}</span>
            <span className="hub-stat-label">{card.label}</span>
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      <ActivityFeed log={activityLog} />

      <div className="hub-overview-cols">
        {/* Open Action Items */}
        <div className="hub-overview-section">
          <div className="hub-overview-section-header">
            <h3>✅ Open Tasks <span className="hub-overview-meta">{openActions.length} open · {doneActions} done</span></h3>
            <button className="hub-overview-link" onClick={() => setActiveTab('actions')}>View all →</button>
          </div>
          {openActions.length === 0 ? (
            <p className="hub-overview-empty">All tasks complete 🎉</p>
          ) : (
            <div className="hub-overview-list">
              {openActions.slice(0, 6).map(item => (
                <div key={item.id} className={`hub-overview-task ${item.priority === 'Critical' ? 'hub-overview-task--critical' : ''}`}>
                  <div className="hub-overview-task-body">
                    <span className="hub-overview-task-title">{item.title}</span>
                    {item.assignee && <span className="hub-overview-task-meta">→ {item.assignee}</span>}
                    {item.dueDate && <span className="hub-overview-task-meta due">Due {item.dueDate}</span>}
                  </div>
                  <div className="hub-overview-task-right">
                    {item.priority && (
                      <span className={`hub-priority hub-priority--${item.priority.toLowerCase()}`}>{item.priority}</span>
                    )}
                    <button
                      className={`hub-status-cycle hub-status-cycle--${(item.status || 'todo').toLowerCase().replace(/\s/g,'')}`}
                      onClick={() => cycleStatus(item)}
                      title="Click to advance status"
                    >
                      {item.status || 'Todo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="hub-overview-right">
          {/* Recent Decisions */}
          <div className="hub-overview-section">
            <div className="hub-overview-section-header">
              <h3>📋 Recent Decisions</h3>
              <button className="hub-overview-link" onClick={() => setActiveTab('decisions')}>View all →</button>
            </div>
            {recentDecisions.length === 0 ? (
              <p className="hub-overview-empty">No decisions yet</p>
            ) : (
              <div className="hub-overview-list">
                {recentDecisions.map(d => (
                  <div key={d.id} className="hub-overview-row">
                    <span className="hub-overview-row-title">{d.title}</span>
                    <span className={`hub-status hub-status--${(d.status||'').toLowerCase().replace(/\s/g,'')}`}>{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest Product Update */}
          {recentProduct.length > 0 && (
            <div className="hub-overview-section">
              <div className="hub-overview-section-header">
                <h3>🚀 Latest Product</h3>
                <button className="hub-overview-link" onClick={() => setActiveTab('product')}>View all →</button>
              </div>
              <div className="hub-overview-list">
                {recentProduct.map(p => (
                  <div key={p.id} className="hub-overview-row">
                    <span className="hub-overview-row-title">{p.title}</span>
                    <span className={`hub-status hub-status--${(p.status||'').toLowerCase().replace(/\s/g,'')}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Meeting */}
          {lastMeeting && (
            <div className="hub-overview-section">
              <div className="hub-overview-section-header">
                <h3>📅 Last Meeting</h3>
                <button className="hub-overview-link" onClick={() => setActiveTab('meetings')}>View all →</button>
              </div>
              <div className="hub-overview-list">
                <div className="hub-overview-row">
                  <div>
                    <div className="hub-overview-row-title">{lastMeeting.title}</div>
                    {lastMeeting.attendees && <div className="hub-overview-task-meta">{lastMeeting.attendees}</div>}
                  </div>
                  <span className="hub-overview-task-meta">{lastMeeting.date || formatTime(lastMeeting.createdAt)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pinned Items */}
          {pinnedAll.length > 0 && (
            <div className="hub-overview-section">
              <div className="hub-overview-section-header">
                <h3>📌 Pinned</h3>
              </div>
              <div className="hub-overview-list">
                {pinnedAll.slice(0, 4).map(item => (
                  <div key={item.id} className="hub-overview-row">
                    <span className="hub-overview-row-title">{item.title || item.source || item.organization || 'Pinned item'}</span>
                    <button className="hub-overview-link" onClick={() => setActiveTab('actions')}>→</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Specific Tab Wrappers ──────────────────────────────────

function ActionItemsTab(props) {
  return (
    <CrudTab
      {...props}
      title="Action Items"
      icon="✅"
      emptyIcon="✅"
      emptyText="No action items yet. Create one to track work."
      collectionName="hub_action_items"
      fields={[
        { key: 'title', label: 'Task Title', placeholder: 'e.g. Finalize pitch deck for SBIR' },
        { key: 'description', label: 'Details', type: 'textarea', placeholder: 'Requirements, context, links…' },
        { key: 'assignee', label: 'Assignee', type: 'select', options: DEFAULT_TEAM.map(m => m.name) },
        { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
        { key: 'dueDate', label: 'Due Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: ['Todo', 'In Progress', 'Blocked', 'Done'] },
      ]}
      saveFn={saveActionItem}
      deleteFn={deleteActionItem}
    />
  );
}

function DecisionsTab(props) {
  return (
    <CrudTab
      {...props}
      title="Decisions"
      icon="📋"
      emptyIcon="📋"
      emptyText="No decisions logged yet."
      collectionName="hub_decisions"
      fields={[
        { key: 'title', label: 'Decision Title', placeholder: 'e.g. API architecture choice' },
        { key: 'description', label: 'Details', type: 'textarea', placeholder: 'Context, options considered, reasoning…' },
        { key: 'status', label: 'Status', type: 'select', options: ['Proposed', 'Approved', 'Rejected', 'Pending'] },
      ]}
      saveFn={saveDecision}
      deleteFn={deleteDecision}
    />
  );
}

function MeetingsTab(props) {
  return (
    <CrudTab
      {...props}
      title="Meetings"
      icon="📅"
      emptyIcon="📅"
      emptyText="No meetings recorded yet."
      collectionName="hub_meetings"
      fields={[
        { key: 'title', label: 'Meeting Title', placeholder: 'e.g. Weekly Standup — Apr 21' },
        { key: 'notes', label: 'Notes & Action Items', type: 'textarea', placeholder: 'Key discussion points, decisions, next steps…' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'attendees', label: 'Attendees', placeholder: 'Wade, Drew, Cassie…' },
      ]}
      saveFn={saveMeeting}
      deleteFn={deleteMeeting}
    />
  );
}

// ─── GoFundMe Campaign Tracker ──────────────────────────────

const GFM_CAMPAIGN_URL = 'https://www.gofundme.com/f/help-launch-roomi-the-digital-mentor-for-indepen';
const GFM_GOAL         = 5000;

// Hardcoded seed donors — superseded by Firestore hub_gfm_donors when available
const GFM_SEED_DONORS = [
  { name: 'Melissa',        amount: 200, daysAgo: 22 },
  { name: 'Pam',           amount: 100, daysAgo: 22 },
  { name: 'Jillian Kohr',  amount:  50, daysAgo:  9 },
  { name: 'Janice Hufnagle', amount: 100, daysAgo: 14 },
];

function GoFundMeCard({ gfmDonors, setGfmDonors, showToast }) {
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [donorForm, setDonorForm] = useState({ name: '', amount: '' });
  const [saving, setSaving] = useState(false);

  // Use Firestore donors if any exist, else fall back to seed
  const donors = gfmDonors.length > 0 ? gfmDonors : GFM_SEED_DONORS;
  const raised  = donors.reduce((s, d) => s + Number(d.amount || 0), 0);
  const pct     = Math.min(100, Math.round((raised / GFM_GOAL) * 100));

  const handleAddDonor = async () => {
    if (!donorForm.name.trim() || !donorForm.amount) return;
    setSaving(true);
    try {
      const id = await saveGFMDonor({
        name: donorForm.name.trim(),
        amount: Number(donorForm.amount),
        daysAgo: 0,
      });
      setGfmDonors(prev => [{ id, ...donorForm, amount: Number(donorForm.amount), daysAgo: 0 }, ...prev]);
      setDonorForm({ name: '', amount: '' });
      setShowAddDonor(false);
      showToast('Donor added 💚');
    } catch {
      showToast('Failed to add donor', true);
    }
    setSaving(false);
  };

  const handleDeleteDonor = async (donor) => {
    if (!donor.id) return;
    if (!confirm(`Remove ${donor.name} from the list?`)) return;
    await deleteGFMDonor(donor.id);
    setGfmDonors(prev => prev.filter(d => d.id !== donor.id));
    showToast('Donor removed');
  };

  return (
    <div className="gfm-card">
      <div className="gfm-header">
        <div className="gfm-title-row">
          <span className="gfm-label">GoFundMe Campaign</span>
          <a className="gfm-link" href={GFM_CAMPAIGN_URL} target="_blank" rel="noreferrer">
            View Campaign ↗
          </a>
        </div>
        <div className="gfm-headline">Help Launch ROOMI — The Digital Mentor for Independent Living</div>
      </div>

      <div className="gfm-stats">
        <div className="gfm-stat">
          <span className="gfm-stat-val">${raised.toLocaleString()}</span>
          <span className="gfm-stat-lbl">raised</span>
        </div>
        <div className="gfm-stat">
          <span className="gfm-stat-val">${GFM_GOAL.toLocaleString()}</span>
          <span className="gfm-stat-lbl">goal</span>
        </div>
        <div className="gfm-stat">
          <span className="gfm-stat-val">{donors.length}</span>
          <span className="gfm-stat-lbl">donors</span>
        </div>
      </div>

      <div className="gfm-bar-track">
        <div className="gfm-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="gfm-pct">{pct}% of goal</div>

      <div className="gfm-donors">
        <div className="gfm-donors-header">
          <div className="gfm-donors-title">Recent Donors</div>
          <button className="gfm-add-btn" onClick={() => setShowAddDonor(s => !s)}>
            {showAddDonor ? '✕ Cancel' : '+ Add Donor'}
          </button>
        </div>

        {showAddDonor && (
          <div className="gfm-add-form">
            <input
              className="hub-form-input"
              placeholder="Donor name"
              value={donorForm.name}
              onChange={e => setDonorForm(p => ({ ...p, name: e.target.value }))}
            />
            <input
              className="hub-form-input"
              type="number"
              placeholder="Amount ($)"
              value={donorForm.amount}
              onChange={e => setDonorForm(p => ({ ...p, amount: e.target.value }))}
            />
            <button className="hub-btn-new" onClick={handleAddDonor} disabled={saving}>
              {saving ? 'Saving…' : '💚 Add'}
            </button>
          </div>
        )}

        {donors.slice().reverse().map((d, i) => (
          <div key={d.id || i} className="gfm-donor-row">
            <div className="gfm-donor-avatar">{d.name[0]}</div>
            <div className="gfm-donor-info">
              <span className="gfm-donor-name">{d.name}</span>
              <span className="gfm-donor-when">{d.daysAgo != null ? `${d.daysAgo}d ago` : 'recently'}</span>
            </div>
            <span className="gfm-donor-amt">${Number(d.amount).toLocaleString()}</span>
            {d.id && (
              <button className="hub-btn-delete" onClick={() => handleDeleteDonor(d)} style={{ marginLeft: 8 }}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FundingTab({ gfmDonors, setGfmDonors, showToast, ...props }) {
  return (
    <div className="funding-tab-wrap">
      <GoFundMeCard gfmDonors={gfmDonors || []} setGfmDonors={setGfmDonors} showToast={showToast} />
      <div className="funding-crud-section">
        <div className="funding-crud-title">Funding Pipeline</div>
        <CrudTab
          {...props}
          showToast={showToast}
          title="Funding"
          icon="💰"
          emptyIcon="💰"
          emptyText="No funding entries yet."
          collectionName="hub_funding"
          fields={[
            { key: 'source', label: 'Source / Program', placeholder: 'e.g. SBIR Phase I, Angel Investor' },
            { key: 'description', label: 'Details', type: 'textarea', placeholder: 'Application status, requirements, notes…' },
            { key: 'amount', label: 'Amount ($)', type: 'number', placeholder: '50000' },
            { key: 'status', label: 'Status', type: 'select', options: ['Planning', 'Applied', 'Pending', 'Approved', 'Rejected', 'Received'] },
            { key: 'deadline', label: 'Deadline', type: 'date' },
          ]}
          saveFn={saveFundingEntry}
          deleteFn={deleteFundingEntry}
        />
      </div>
    </div>
  );
}


function PilotsTab(props) {
  return (
    <CrudTab
      {...props}
      title="Pilots"
      icon="🧪"
      emptyIcon="🧪"
      emptyText="No pilot sites yet."
      collectionName="hub_pilots"
      fields={[
        { key: 'organization', label: 'Organization', placeholder: 'e.g. Sunrise Community Inc.' },
        { key: 'description', label: 'Details', type: 'textarea', placeholder: 'Contact info, location, scope, population…' },
        { key: 'contact', label: 'Primary Contact', placeholder: 'Name — email or phone' },
        { key: 'status', label: 'Status', type: 'select', options: ['Outreach', 'In Discussion', 'Active', 'Paused', 'Completed'] },
      ]}
      saveFn={savePilot}
      deleteFn={deletePilot}
    />
  );
}

function ProductTab(props) {
  const [commits, setCommits] = useState([]);
  const [commitLoading, setCommitLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.github.com/repos/BlueprintAiConsulting/roomi-prototype/commits?per_page=8')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCommits(data);
        setCommitLoading(false);
      })
      .catch(() => setCommitLoading(false));
  }, []);

  return (
    <div>
      <CrudTab
        {...props}
        title="Product"
        icon="🚀"
        emptyIcon="🚀"
        emptyText="No product updates yet."
        collectionName="hub_product"
        fields={[
          { key: 'title', label: 'Title / Version', placeholder: 'e.g. v0.9 — Memory Hardening' },
          { key: 'description', label: 'Changelog / Features', type: 'textarea', placeholder: "What shipped, what changed, what's next..." },
          { key: 'status', label: 'Status', type: 'select', options: ['Planning', 'In Progress', 'Completed', 'Shipped'] },
        ]}
        saveFn={saveProductUpdate}
        deleteFn={deleteProductUpdate}
      />

      {/* GitHub Commits Feed */}
      <div className="hub-commits-section">
        <div className="hub-commits-header">
          <h3 className="hub-commits-title">🔀 Recent Commits — roomi-prototype</h3>
          <a className="hub-commits-link" href="https://github.com/BlueprintAiConsulting/roomi-prototype/commits/main" target="_blank" rel="noreferrer">View on GitHub ↗</a>
        </div>
        {commitLoading ? (
          <div className="hub-commits-loading">Loading commits…</div>
        ) : commits.length === 0 ? (
          <div className="hub-commits-loading">No commits available</div>
        ) : (
          <div className="hub-commits-list">
            {commits.map(c => (
              <a
                key={c.sha}
                href={c.html_url}
                target="_blank"
                rel="noreferrer"
                className="hub-commit-row"
              >
                <span className="hub-commit-sha">{c.sha.slice(0, 7)}</span>
                <span className="hub-commit-msg">{c.commit.message.split('\n')[0].slice(0, 80)}{c.commit.message.length > 80 ? '…' : ''}</span>
                <span className="hub-commit-author">{c.commit.author.name}</span>
                <span className="hub-commit-date">{new Date(c.commit.author.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Team Tab ───────────────────────────────────────────────

function TeamTab({ data }) {
  return (
    <>
      <div className="hub-panel-header">
        <h2 className="hub-panel-title">👥 Founding Council</h2>
      </div>

      {data.length === 0 ? (
        <div className="hub-empty">
          <span className="hub-empty-icon">👥</span>
          <p className="hub-empty-text">No team members found.</p>
        </div>
      ) : (
        <div className="hub-team-grid">
          {data.map((member, i) => (
            <div key={member.id || i} className="hub-team-card">
              <div className="hub-team-avatar">
                {member.photoURL ? (
                  <img src={member.photoURL} alt={member.name} />
                ) : (
                  member.initials || member.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <h3 className="hub-team-name">{member.name}</h3>
              <div className="hub-team-role">{member.role}</div>
              {member.email && <span className="hub-team-email">{member.email}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

