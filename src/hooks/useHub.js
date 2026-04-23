// useHub.js — Data layer for ROOMI Founder Hub
// Covers all hub_* Firestore collections + Firebase Storage file operations

import {
  db,
  storage,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit,
  onSnapshot,
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from '../firebase.js';

// ─── Documents (Storage + Firestore metadata) ──────────────

export async function uploadHubDocument(file, uploaderUid, uploaderName) {
  if (!db || !storage) return null;
  try {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `hub-documents/${timestamp}_${safeName}`;
    const fileRef = storageRef(storage, storagePath);

    // Upload to Storage
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save metadata to Firestore
    const docRef = await addDoc(collection(db, 'hub_documents'), {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      storagePath,
      downloadURL,
      uploadedBy: uploaderUid,
      uploaderName: uploaderName || 'Unknown',
      uploadedAt: serverTimestamp(),
    });

    return { id: docRef.id, downloadURL, storagePath };
  } catch (err) {
    console.error('[hub] Error uploading document:', err);
    throw err;
  }
}

export async function getHubDocuments() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_documents'),
      orderBy('uploadedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading documents:', err);
    return [];
  }
}

export async function deleteHubDocument(docId, storagePath) {
  if (!db) return;
  try {
    // Delete from Storage
    if (storage && storagePath) {
      const fileRef = storageRef(storage, storagePath);
      await deleteObject(fileRef).catch(() => {});
    }
    // Delete Firestore metadata
    await deleteDoc(doc(db, 'hub_documents', docId));
  } catch (err) {
    console.error('[hub] Error deleting document:', err);
    throw err;
  }
}

// ─── Decisions ──────────────────────────────────────────────

export async function saveDecision(data, docId = null) {
  if (!db) return null;
  try {
    if (docId) {
      await updateDoc(doc(db, 'hub_decisions', docId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return docId;
    } else {
      const ref = await addDoc(collection(db, 'hub_decisions'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    }
  } catch (err) {
    console.error('[hub] Error saving decision:', err);
    throw err;
  }
}

export async function getDecisions() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_decisions'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading decisions:', err);
    return [];
  }
}

export async function deleteDecision(docId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'hub_decisions', docId));
  } catch (err) {
    console.error('[hub] Error deleting decision:', err);
  }
}

// ─── Meetings ───────────────────────────────────────────────

export async function saveMeeting(data, docId = null) {
  if (!db) return null;
  try {
    if (docId) {
      await updateDoc(doc(db, 'hub_meetings', docId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return docId;
    } else {
      const ref = await addDoc(collection(db, 'hub_meetings'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    }
  } catch (err) {
    console.error('[hub] Error saving meeting:', err);
    throw err;
  }
}

export async function getMeetings() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_meetings'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading meetings:', err);
    return [];
  }
}

export async function deleteMeeting(docId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'hub_meetings', docId));
  } catch (err) {
    console.error('[hub] Error deleting meeting:', err);
  }
}

// ─── Funding ────────────────────────────────────────────────

export async function saveFundingEntry(data, docId = null) {
  if (!db) return null;
  try {
    if (docId) {
      await updateDoc(doc(db, 'hub_funding', docId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return docId;
    } else {
      const ref = await addDoc(collection(db, 'hub_funding'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    }
  } catch (err) {
    console.error('[hub] Error saving funding entry:', err);
    throw err;
  }
}

export async function getFundingEntries() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_funding'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading funding entries:', err);
    return [];
  }
}

export async function deleteFundingEntry(docId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'hub_funding', docId));
  } catch (err) {
    console.error('[hub] Error deleting funding entry:', err);
  }
}

// ─── Pilots ─────────────────────────────────────────────────

export async function savePilot(data, docId = null) {
  if (!db) return null;
  try {
    if (docId) {
      await updateDoc(doc(db, 'hub_pilots', docId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return docId;
    } else {
      const ref = await addDoc(collection(db, 'hub_pilots'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    }
  } catch (err) {
    console.error('[hub] Error saving pilot:', err);
    throw err;
  }
}

export async function getPilots() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_pilots'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading pilots:', err);
    return [];
  }
}

export async function deletePilot(docId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'hub_pilots', docId));
  } catch (err) {
    console.error('[hub] Error deleting pilot:', err);
  }
}

// ─── Product (Roadmap / Changelog) ──────────────────────────

export async function saveProductUpdate(data, docId = null) {
  if (!db) return null;
  try {
    if (docId) {
      await updateDoc(doc(db, 'hub_product', docId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return docId;
    } else {
      const ref = await addDoc(collection(db, 'hub_product'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    }
  } catch (err) {
    console.error('[hub] Error saving product update:', err);
    throw err;
  }
}

export async function getProductUpdates() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_product'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading product updates:', err);
    return [];
  }
}

export async function deleteProductUpdate(docId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'hub_product', docId));
  } catch (err) {
    console.error('[hub] Error deleting product update:', err);
  }
}

// ─── Team ───────────────────────────────────────────────────

export async function getTeamMembers() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_team'),
      orderBy('order', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading team:', err);
    return [];
  }
}

export async function saveTeamMember(data, docId = null) {
  if (!db) return null;
  try {
    if (docId) {
      await updateDoc(doc(db, 'hub_team', docId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return docId;
    } else {
      const ref = await addDoc(collection(db, 'hub_team'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    }
  } catch (err) {
    console.error('[hub] Error saving team member:', err);
    throw err;
  }
}

// ─── Founders Room (Discussion / Announcements) ─────────────

export async function postToFoundersRoom(data) {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'hub_founders_room'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[hub] Error posting to founders room:', err);
    throw err;
  }
}

export async function getFoundersRoomPosts(count = 50) {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_founders_room'),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading founders room:', err);
    return [];
  }
}

export async function deleteFoundersRoomPost(docId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'hub_founders_room', docId));
  } catch (err) {
    console.error('[hub] Error deleting post:', err);
  }
}

// ─── Action Items (Tasks / Todo) ────────────────────────────

export async function saveActionItem(data, docId = null) {
  if (!db) return null;
  try {
    if (docId) {
      await updateDoc(doc(db, 'hub_action_items', docId), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return docId;
    } else {
      const ref = await addDoc(collection(db, 'hub_action_items'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    }
  } catch (err) {
    console.error('[hub] Error saving action item:', err);
    throw err;
  }
}

export async function getActionItems() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'hub_action_items'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[hub] Error loading action items:', err);
    return [];
  }
}

export async function deleteActionItem(docId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'hub_action_items', docId));
  } catch (err) {
    console.error('[hub] Error deleting action item:', err);
  }
}

// ─── Pin / Bookmark ─────────────────────────────────────────

export async function togglePin(collectionName, docId, currentlyPinned) {
  if (!db) return;
  try {
    await updateDoc(doc(db, collectionName, docId), {
      pinned: !currentlyPinned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[hub] Error toggling pin:', err);
    throw err;
  }
}

// ─── Utility ────────────────────────────────────────────────

const FILE_TYPE_MAP = {
  'application/pdf': { label: 'PDF', color: '#e74c3c' },
  'application/msword': { label: 'DOC', color: '#2980b9' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', color: '#2980b9' },
  'application/vnd.ms-excel': { label: 'XLS', color: '#27ae60' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'XLSX', color: '#27ae60' },
  'application/vnd.ms-powerpoint': { label: 'PPT', color: '#e67e22' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { label: 'PPTX', color: '#e67e22' },
  'text/plain': { label: 'TXT', color: '#95a5a6' },
  'text/csv': { label: 'CSV', color: '#27ae60' },
  'application/json': { label: 'JSON', color: '#8e44ad' },
  'application/zip': { label: 'ZIP', color: '#7f8c8d' },
};

export function getFileTypeInfo(mimeType) {
  if (!mimeType) return { label: 'FILE', color: '#95a5a6' };
  if (mimeType.startsWith('image/')) return { label: 'IMG', color: '#9b59b6' };
  if (mimeType.startsWith('video/')) return { label: 'VID', color: '#e74c3c' };
  if (mimeType.startsWith('audio/')) return { label: 'AUD', color: '#f39c12' };
  return FILE_TYPE_MAP[mimeType] || { label: 'FILE', color: '#95a5a6' };
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ─── Real-time Listeners (onSnapshot) ───────────────────────
// Each subscriber returns an unsubscribe() function.
// Call it when the component unmounts or the tab changes.

function makeSubscriber(collectionName, orderField, callback, limitCount = null) {
  if (!db) return () => {};
  try {
    let q = query(collection(db, collectionName), orderBy(orderField, 'desc'));
    if (limitCount) q = query(collection(db, collectionName), orderBy(orderField, 'desc'), limit(limitCount));
    return onSnapshot(q,
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error(`[hub] onSnapshot error (${collectionName}):`, err)
    );
  } catch (err) {
    console.error(`[hub] Failed to create listener (${collectionName}):`, err);
    return () => {};
  }
}

export const subscribeDocuments   = (cb) => makeSubscriber('hub_documents',      'uploadedAt',  cb);
export const subscribeDecisions   = (cb) => makeSubscriber('hub_decisions',      'createdAt',   cb);
export const subscribeMeetings    = (cb) => makeSubscriber('hub_meetings',       'date',        cb);
export const subscribeFunding     = (cb) => makeSubscriber('hub_funding',        'createdAt',   cb);
export const subscribePilots      = (cb) => makeSubscriber('hub_pilots',         'createdAt',   cb);
export const subscribeProduct     = (cb) => makeSubscriber('hub_product',        'createdAt',   cb);
export const subscribeTeam        = (cb) => makeSubscriber('hub_team',           'order',       cb);
export const subscribeActionItems = (cb) => makeSubscriber('hub_action_items',   'createdAt',   cb);
export const subscribeRoom        = (cb) => makeSubscriber('hub_founders_room',  'createdAt',   cb, 50);

/** Subscribe to ALL collections at once (used by Overview tab).
 *  Returns a single cleanup function that tears down all listeners. */
export function subscribeAll({ onDocuments, onDecisions, onMeetings, onFunding, onPilots, onProduct, onTeam, onRoom, onActionItems }) {
  const unsubs = [
    subscribeDocuments(onDocuments),
    subscribeDecisions(onDecisions),
    subscribeMeetings(onMeetings),
    subscribeFunding(onFunding),
    subscribePilots(onPilots),
    subscribeProduct(onProduct),
    subscribeTeam(onTeam),
    subscribeRoom(onRoom),
    subscribeActionItems(onActionItems),
  ];
  return () => unsubs.forEach(u => u());
}
