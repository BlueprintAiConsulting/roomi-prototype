// FounderHub.jsx — ROOMI Founder Hub Dashboard
// Centralized workspace for the founding council: documents, decisions, meetings, funding, pilots, product, team, discussion

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  uploadHubDocument, getHubDocuments, deleteHubDocument,
  saveDecision, getDecisions, deleteDecision,
  saveMeeting, getMeetings, deleteMeeting,
  saveFundingEntry, getFundingEntries, deleteFundingEntry,
  savePilot, getPilots, deletePilot,
  saveProductUpdate, getProductUpdates, deleteProductUpdate,
  getTeamMembers, saveTeamMember,
  postToFoundersRoom, getFoundersRoomPosts, deleteFoundersRoomPost,
  getFileTypeInfo, formatFileSize,
} from '../hooks/useHub.js';
import './FounderHub.css';

const TABS = [
  { id: 'room',      icon: '💬', label: 'Founders Room' },
  { id: 'documents',  icon: '📄', label: 'Documents' },
  { id: 'decisions',  icon: '📋', label: 'Decisions' },
  { id: 'meetings',   icon: '📅', label: 'Meetings' },
  { id: 'funding',    icon: '💰', label: 'Funding' },
  { id: 'pilots',     icon: '🧪', label: 'Pilots' },
  { id: 'product',    icon: '🚀', label: 'Product' },
  { id: 'team',       icon: '👥', label: 'Team' },
];

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
  const [activeTab, setActiveTab] = useState('room');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Data stores
  const [documents, setDocuments] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [funding, setFunding] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [product, setProduct] = useState([]);
  const [team, setTeam] = useState([]);
  const [roomPosts, setRoomPosts] = useState([]);

  // Form visibility
  const [showForm, setShowForm] = useState(false);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load data for active tab
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        switch (activeTab) {
          case 'documents': {
            const data = await getHubDocuments();
            if (!cancelled) setDocuments(data);
            break;
          }
          case 'decisions': {
            const data = await getDecisions();
            if (!cancelled) setDecisions(data);
            break;
          }
          case 'meetings': {
            const data = await getMeetings();
            if (!cancelled) setMeetings(data);
            break;
          }
          case 'funding': {
            const data = await getFundingEntries();
            if (!cancelled) setFunding(data);
            break;
          }
          case 'pilots': {
            const data = await getPilots();
            if (!cancelled) setPilots(data);
            break;
          }
          case 'product': {
            const data = await getProductUpdates();
            if (!cancelled) setProduct(data);
            break;
          }
          case 'team': {
            const data = await getTeamMembers();
            if (!cancelled) setTeam(data.length > 0 ? data : DEFAULT_TEAM);
            break;
          }
          case 'room': {
            const data = await getFoundersRoomPosts();
            if (!cancelled) setRoomPosts(data);
            break;
          }
        }
      } catch (err) {
        console.error('[hub] Load error:', err);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [activeTab]);

  // Counts for tab badges
  const counts = {
    room: roomPosts.length,
    documents: documents.length,
    decisions: decisions.length,
    meetings: meetings.length,
    funding: funding.length,
    pilots: pilots.length,
    product: product.length,
    team: team.length,
  };

  // Reset form when switching tabs
  useEffect(() => { setShowForm(false); }, [activeTab]);

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="hub-loading">
          <div className="hub-loading-spinner" />
          <div className="hub-loading-text">Loading…</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'room':
        return <FoundersRoomTab posts={roomPosts} setPosts={setRoomPosts} userId={userId} userName={userName} showToast={showToast} />;
      case 'documents':
        return <DocumentsTab documents={documents} setDocuments={setDocuments} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} />;
      case 'decisions':
        return <DecisionsTab data={decisions} setData={setDecisions} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} />;
      case 'meetings':
        return <MeetingsTab data={meetings} setData={setMeetings} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} />;
      case 'funding':
        return <FundingTab data={funding} setData={setFunding} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} />;
      case 'pilots':
        return <PilotsTab data={pilots} setData={setPilots} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} />;
      case 'product':
        return <ProductTab data={product} setData={setProduct} userId={userId} userName={userName} showForm={showForm} setShowForm={setShowForm} showToast={showToast} />;
      case 'team':
        return <TeamTab data={team} />;
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
          </button>
        ))}
      </div>

      <div className="hub-panel" role="tabpanel" aria-labelledby={`hub-tab-${activeTab}`}>
        {renderTabContent()}
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

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <div className="hub-panel-header">
        <h2 className="hub-panel-title">💬 Founders Room</h2>
      </div>

      <div className="hub-post-input-row">
        <textarea
          className="hub-form-textarea"
          placeholder="Share an update, idea, or question with the council…"
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handlePost(); }}
        />
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
            <div className="hub-post-body">{post.text}</div>
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

function CrudTab({ title, icon, emptyIcon, emptyText, data, setData, fields, statusOptions, saveFn, deleteFn, userId, userName, showForm, setShowForm, showToast }) {
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
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
      setFormData({});
      setShowForm(false);
      showToast(`${title.replace(/s$/, '')} created`);
    } catch {
      showToast(`Failed to save`, true);
    }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    const label = item[fields[0]?.key] || 'this item';
    if (!confirm(`Delete "${label}"?`)) return;
    await deleteFn(item.id);
    setData(prev => prev.filter(d => d.id !== item.id));
    showToast(`Deleted`);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="hub-panel-header">
        <h2 className="hub-panel-title">{icon} {title}</h2>
        <button className="hub-btn-new" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : `+ New`}
        </button>
      </div>

      {showForm && (
        <div className="hub-form">
          <h3 className="hub-form-title">New Entry</h3>
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
              {saving ? 'Saving…' : '✓ Save'}
            </button>
            <button className="hub-btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="hub-empty">
          <span className="hub-empty-icon">{emptyIcon}</span>
          <p className="hub-empty-text">{emptyText}</p>
        </div>
      ) : (
        <div className="hub-items">
          {data.map(item => (
            <div key={item.id} className="hub-item">
              <div className="hub-item-body">
                <h3 className="hub-item-title">{item[fields[0]?.key] || 'Untitled'}</h3>
                <div className="hub-item-meta">
                  {item.status && (
                    <span className={`hub-status hub-status--${item.status.toLowerCase().replace(/\s/g, '')}`}>
                      {item.status}
                    </span>
                  )}
                  {item.creatorName && <span>by {item.creatorName}</span>}
                  <span>{formatTime(item.createdAt)}</span>
                  {item.amount && <span>${Number(item.amount).toLocaleString()}</span>}
                </div>
                {item[fields[1]?.key] && fields[1]?.type === 'textarea' && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    {(item[fields[1].key] || '').slice(0, 200)}{item[fields[1].key]?.length > 200 ? '…' : ''}
                  </p>
                )}
              </div>
              <div className="hub-item-actions">
                <button className="hub-btn-delete" onClick={() => handleDelete(item)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Specific Tab Wrappers ──────────────────────────────────

function DecisionsTab(props) {
  return (
    <CrudTab
      {...props}
      title="Decisions"
      icon="📋"
      emptyIcon="📋"
      emptyText="No decisions logged yet."
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

function FundingTab(props) {
  return (
    <CrudTab
      {...props}
      title="Funding"
      icon="💰"
      emptyIcon="💰"
      emptyText="No funding entries yet."
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
  return (
    <CrudTab
      {...props}
      title="Product"
      icon="🚀"
      emptyIcon="🚀"
      emptyText="No product updates yet."
      fields={[
        { key: 'title', label: 'Title / Version', placeholder: 'e.g. v0.9 — Memory Hardening' },
        { key: 'description', label: 'Changelog / Features', type: 'textarea', placeholder: "What shipped, what changed, what's next..." },
        { key: 'status', label: 'Status', type: 'select', options: ['Planning', 'In Progress', 'Completed', 'Shipped'] },
      ]}
      saveFn={saveProductUpdate}
      deleteFn={deleteProductUpdate}
    />
  );
}

// ─── Team Tab ───────────────────────────────────────────────

function TeamTab({ data }) {
  return (
    <>
      <div className="hub-panel-header">
        <h2 className="hub-panel-title">👥 Founding Council</h2>
      </div>

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
    </>
  );
}
