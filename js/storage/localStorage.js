const KEYS = {
  postDraft: 'socialsphere.postDraft',
  pendingPosts: 'socialsphere.pendingPosts',
};

function saveToLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readFromLocalStorage(key, fallbackValue) {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return fallbackValue;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}"`, error);
    return fallbackValue;
  }
}

function removeFromLocalStorage(key) {
  localStorage.removeItem(key);
}

function saveDraft(text) {
  saveToLocalStorage(KEYS.postDraft, { text, updatedAt: Date.now() });
}

function getDraft() {
  return readFromLocalStorage(KEYS.postDraft, null);
}

function clearDraft() {
  removeFromLocalStorage(KEYS.postDraft);
}

function getPendingPostsQueue() {
  return readFromLocalStorage(KEYS.pendingPosts, []);
}

function savePendingPostsQueue(queue) {
  saveToLocalStorage(KEYS.pendingPosts, queue);
}

export {
  saveDraft,
  getDraft,
  clearDraft,
  getPendingPostsQueue,
  savePendingPostsQueue,
};
