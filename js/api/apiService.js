import { MOCK_API_BASE_URL, REQUEST_TIMEOUT_MS } from './config.js';

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isConfigured(url) {
  return typeof url === 'string' && url.trim().length > 0;
}

function buildMockApiPostsUrl(page, limit) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);
  return `${MOCK_API_BASE_URL}/posts?page=${safePage}&limit=${safeLimit}&sortBy=createdAt&order=desc`;
}

async function fetchPostsPage(page = 1, limit = 10) {
  if (!isConfigured(MOCK_API_BASE_URL)) {
    return [];
  }

  const posts = await fetchJson(buildMockApiPostsUrl(page, limit));
  return Array.isArray(posts) ? posts : [];
}

async function fetchMockUserById(userId) {
  if (!isConfigured(MOCK_API_BASE_URL)) {
    return null;
  }

  const id = encodeURIComponent(String(userId).trim());
  if (!id) return null;

  try {
    return await fetchJson(`${MOCK_API_BASE_URL}/users/${id}`);
  } catch {
    return null;
  }
}

async function fetchAllMockUsers(pageSize = 100) {
  if (!isConfigured(MOCK_API_BASE_URL)) {
    return [];
  }

  const allUsers = [];
  const seenIds = new Set();
  let page = 1;
  const maxPages = 50;

  while (page <= maxPages) {
    const batch = await fetchJson(
      `${MOCK_API_BASE_URL}/users?page=${page}&limit=${pageSize}&sortBy=createdAt&order=desc`
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    let addedInBatch = 0;
    for (const user of batch) {
      if (!user || user.id === undefined || user.id === null) continue;
      const idKey = String(user.id).trim();
      if (!idKey || seenIds.has(idKey)) continue;
      seenIds.add(idKey);
      allUsers.push(user);
      addedInBatch += 1;
    }

    if (batch.length < pageSize) {
      break;
    }

    if (addedInBatch === 0) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

async function createPost(payload) {
  if (!isConfigured(MOCK_API_BASE_URL)) {
    throw new Error(
      'MockAPI не настроен: задайте MOCK_API_BASE_URL в js/api/config.js'
    );
  }

  const normalizedPayload = {
    ...payload,
    createdAt: new Date().toISOString(),
  };

  return await fetchJson(`${MOCK_API_BASE_URL}/posts`, {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
  });
}

async function deletePost(postId) {
  if (!isConfigured(MOCK_API_BASE_URL)) {
    throw new Error(
      'MockAPI не настроен: задайте MOCK_API_BASE_URL в js/api/config.js'
    );
  }

  const id = encodeURIComponent(String(postId).trim());
  if (!id) {
    throw new Error('Некорректный id поста');
  }

  const url = `${MOCK_API_BASE_URL}/posts/${id}`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export {
  fetchPostsPage,
  fetchAllMockUsers,
  fetchMockUserById,
  createPost,
  deletePost,
};
