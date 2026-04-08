import {
  createPost as createRemotePost,
  deletePost as deleteRemotePost,
  fetchAllMockUsers,
  fetchMockUserById,
  fetchPostsPage,
} from './api/apiService.js';
import {
  clearDraft,
  getDraft,
  getPendingPostsQueue,
  saveDraft,
  savePendingPostsQueue,
} from './storage/localStorage.js';
import {
  escapeHtml,
  formatMinutesAgo,
  formatRuCommentsLabel,
} from './utils/dataParser.js';

const API_POSTS_PAGE_SIZE = 6;

let apiPostsNextPage = 1;
let apiPostsHasMore = true;

let isLoading = false;
let pendingPostsQueue = getPendingPostsQueue();
let draftDebounceId = null;
let isSyncRunning = false;

const currentUser = {
  id: 999,
  name: 'Valery Malaychuk',
  avatar: 'images/valery_avatar.jpg',
};

let mockUsersById = new Map();

const feedContainer = document.getElementById('feed');
const feedScrollSentinel = document.getElementById('feedScrollSentinel');
const loader = document.getElementById('loader');
const modal = document.getElementById('createPostModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const createPostForm = document.getElementById('createPostForm');
const postContent = document.getElementById('postContent');
const createPostTrigger = document.querySelector('.create-post-trigger');

const draftBanner = document.createElement('div');
draftBanner.className = 'draft-banner';
draftBanner.setAttribute('role', 'status');
draftBanner.innerHTML = `
  <div class="draft-banner__inner">
    <span class="draft-banner__label">Черновик</span>
    <p class="draft-banner__preview" id="draftBannerPreview"></p>
    <button type="button" class="draft-banner__continue" id="draftBannerContinue">Продолжить</button>
    <button type="button" class="draft-banner__discard" id="draftBannerDiscard" title="Удалить черновик">×</button>
  </div>
`;
createPostTrigger.insertAdjacentElement('afterend', draftBanner);

function updateStatusBar(message, modifier = 'online') {
  console.log(
    '[SocialSphere]',
    message,
    '| В очереди:',
    pendingPostsQueue.length,
    `(${modifier})`
  );
}

function updateDraftIndicator() {
  const previewEl = document.getElementById('draftBannerPreview');
  if (!previewEl || !draftBanner) return;

  const draft = getDraft();
  const text = draft?.text?.trim() ?? '';
  const show = text.length > 0 && !modal.classList.contains('active');

  draftBanner.classList.toggle('draft-banner--visible', show);
  if (show) {
    const oneLine = text.replaceAll(/\s+/g, ' ');
    const short =
      oneLine.length > 100 ? `${oneLine.slice(0, 100).trim()}…` : oneLine;
    previewEl.textContent = short;
  } else {
    previewEl.textContent = '';
  }
}

function persistDraftFromTextarea() {
  const text = postContent.value.trim();
  if (text) {
    saveDraft(text);
  } else {
    clearDraft();
  }
}

function toggleLike(postId) {
  const post = document.querySelector(`[data-post-id="${postId}"]`);
  if (!post) return;

  const likeBtn = post.querySelector('.post__action-btn--like');
  const likesCount = post.querySelector('.post__likes-count');
  const svg = likeBtn.querySelector('svg');
  const isLiked = likeBtn.classList.contains('liked');
  const count = Number.parseInt(likesCount.textContent, 10) || 0;

  if (isLiked) {
    likeBtn.classList.remove('liked');
    svg.setAttribute('fill', 'none');
    likesCount.textContent = count - 1;
    return;
  }

  likeBtn.classList.add('liked');
  svg.setAttribute('fill', 'currentColor');
  likesCount.textContent = count + 1;
}

function toggleComments(postId) {
  const commentsSection = document.getElementById(`comments-${postId}`);
  if (commentsSection) {
    commentsSection.classList.toggle('hidden');
  }
}

function addComment(event, postId) {
  event.preventDefault();
  const input = event.target.querySelector('.comment-form__input');
  const text = input.value.trim();
  if (!text) return;

  const list = document.getElementById(`comments-list-${postId}`);
  const post = document.querySelector(`[data-post-id="${postId}"]`);
  if (!list || !post) return;

  const commentsCount = post.querySelector('.post__comments-count');
  const div = document.createElement('div');
  div.className = 'comment';
  div.innerHTML = `
    <img src="${escapeHtml(currentUser.avatar)}" alt="" class="comment__avatar" onerror="this.src='images/default_avatar.jpg'">
    <div class="comment__content">
      <div class="comment__author">${escapeHtml(currentUser.name)}</div>
      <div class="comment__text">${escapeHtml(text)}</div>
      <div class="comment__time">только что</div>
    </div>
  `;
  list.appendChild(div);

  commentsCount.textContent = formatRuCommentsLabel(list.children.length);
  input.value = '';
}

function createPostMarkup({
  id,
  author,
  avatar = currentUser.avatar,
  text,
  likes = 0,
  time = 'только что',
  pending = false,
  queueId = null,
  deletable = false,
  remoteApiId = null,
}) {
  const postId = id;
  const pendingBadge = pending
    ? '<span class="post__pending-badge">В очереди</span>'
    : '';
  const pendingClass = pending ? ' post--pending' : '';
  const queueDataAttr = queueId ? ` data-queue-id="${queueId}"` : '';
  const remoteApiAttr =
    remoteApiId != null && String(remoteApiId).trim() !== ''
      ? ` data-remote-api-id="${escapeHtml(String(remoteApiId))}"`
      : '';
  const idArg = JSON.stringify(postId);
  const deleteBtn = deletable
    ? '<button type="button" class="post__delete-btn" onclick="deleteMyPost(this)" title="Удалить пост">Удалить</button>'
    : '';
  const headerTail =
    pendingBadge || deleteBtn
      ? `<div class="post__header-tail">${pendingBadge}${deleteBtn}</div>`
      : '';

  return `
    <article class="post${pendingClass}" data-post-id="${escapeHtml(String(postId))}"${queueDataAttr}${remoteApiAttr}>
      <div class="post__header">
        <img src="${escapeHtml(avatar)}" alt="" class="post__avatar" onerror="this.src='images/default_avatar.jpg'">
        <div class="post__meta">
          <a href="#" class="post__author">${escapeHtml(author)}</a>
          <span class="post__time">${escapeHtml(time)}</span>
        </div>
        ${headerTail}
      </div>
      <div class="post__content">${escapeHtml(text).replaceAll('\n', '<br>')}</div>
      <div class="post__stats">
        <span class="post__likes-count">${likes}</span>
        <span class="post__comments-count" onclick='toggleComments(${idArg})'>Комментарии</span>
      </div>
      <div class="post__actions">
        <button type="button" class="post__action-btn post__action-btn--like" onclick='toggleLike(${idArg})'>
          <svg class="post__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span>Нравится</span>
        </button>
        <button type="button" class="post__action-btn" onclick='toggleComments(${idArg})'>
          <svg class="post__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>Комментировать</span>
        </button>
        <button type="button" class="post__action-btn">
          <svg class="post__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
          <span>Поделиться</span>
        </button>
      </div>
      <div class="post__comments hidden" id="comments-${escapeHtml(String(postId))}">
        <div class="comments-list" id="comments-list-${escapeHtml(String(postId))}"></div>
        <form class="comment-form" onsubmit='addComment(event, ${idArg})'>
          <img src="${escapeHtml(currentUser.avatar)}" alt="" class="comment-form__avatar" onerror="this.src='images/default_avatar.jpg'">
          <div class="comment-form__input-wrapper">
            <input type="text" class="comment-form__input" placeholder="Напишите комментарий..." required>
            <button type="submit" class="comment-form__submit">Отправить</button>
          </div>
        </form>
      </div>
    </article>
  `;
}

function insertLocalPost(postData) {
  feedContainer.insertAdjacentHTML('afterbegin', createPostMarkup(postData));
}

function replaceQueuedPostWithSynced(queueItem, created) {
  const safeId =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(queueItem.localId)
      : queueItem.localId;
  const pendingPost = document.querySelector(`[data-queue-id="${safeId}"]`);
  if (!pendingPost) return;

  pendingPost.classList.remove('post--pending');
  pendingPost.removeAttribute('data-queue-id');
  const badge = pendingPost.querySelector('.post__pending-badge');
  if (badge) {
    badge.remove();
  }

  const remoteId =
    created && created.id !== undefined && created.id !== null
      ? String(created.id)
      : null;
  if (remoteId) {
    pendingPost.setAttribute('data-post-id', `api-${remoteId}`);
    pendingPost.setAttribute('data-remote-api-id', remoteId);
  }

  const timeNode = pendingPost.querySelector('.post__time');
  if (timeNode) {
    timeNode.textContent = formatMinutesAgo(queueItem.createdAt);
  }
}

function queueUserPost(text) {
  const item = {
    localId: `q_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    text,
    createdAt: new Date().toISOString(),
  };

  pendingPostsQueue.unshift(item);
  savePendingPostsQueue(pendingPostsQueue);
  return item;
}


function renderMissingQueuedPostsInFeed() {
  pendingPostsQueue = getPendingPostsQueue();

  for (let i = pendingPostsQueue.length - 1; i >= 0; i -= 1) {
    const item = pendingPostsQueue[i];
    const safeId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(item.localId)
        : item.localId;
    const exists = document.querySelector(`[data-queue-id="${safeId}"]`);
    if (exists) continue;

    insertLocalPost({
      id: `queued-${item.localId}`,
      author: currentUser.name,
      text: item.text,
      likes: 0,
      time: navigator.onLine ? 'отправка…' : 'в очереди',
      pending: true,
      queueId: item.localId,
      deletable: true,
    });
  }
}

async function syncPendingPosts() {
  pendingPostsQueue = getPendingPostsQueue();

  if (!navigator.onLine || isSyncRunning || pendingPostsQueue.length === 0) {
    return;
  }

  isSyncRunning = true;
  updateStatusBar('Синхронизация очереди...', 'sync');

  const queueSnapshot = [...pendingPostsQueue];

  for (const item of queueSnapshot) {
    try {
      const payload = {
        userId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        title: 'SocialSphere post',
        body: item.text,
      };

      const created = await createRemotePost(payload);

      pendingPostsQueue = pendingPostsQueue.filter(
        entry => entry.localId !== item.localId
      );
      savePendingPostsQueue(pendingPostsQueue);

      const safeQid =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(item.localId)
          : item.localId;
      const pendingEl = document.querySelector(`[data-queue-id="${safeQid}"]`);

      if (pendingEl) {
        replaceQueuedPostWithSynced(item, created);
      } else {
        const remoteId = created?.id ?? item.localId;
        insertLocalPost({
          id: `api-${remoteId}`,
          author: currentUser.name,
          text: item.text,
          likes: 0,
          time: formatMinutesAgo(item.createdAt),
          pending: false,
          deletable: true,
          remoteApiId: remoteId,
        });
      }
    } catch (error) {
      console.warn('Failed to sync queued post', error);
      break;
    }
  }

  isSyncRunning = false;

  if (pendingPostsQueue.length === 0) {
    updateStatusBar('Все посты синхронизированы', 'online');
  } else if (!navigator.onLine) {
    updateStatusBar('Офлайн: посты сохраняются в очередь', 'offline');
  } else {
    updateStatusBar('Часть постов осталась в очереди', 'warning');
  }
}

function checkIfNeedMore() {
  if (!apiPostsHasMore) return;

  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = document.documentElement.clientHeight;

  if (scrollHeight <= clientHeight * 1.5) {
    loadMore();
  }
}

function addOneUserToMockIndex(user) {
  if (!user || user.id === undefined || user.id === null) return;

  const idKey = String(user.id).trim();
  if (!idKey) return;

  mockUsersById.set(idKey, user);

  const numericId = Number(idKey);
  if (Number.isFinite(numericId)) {
    mockUsersById.set(String(numericId), user);
    mockUsersById.set(numericId, user);
  }
}

function buildMockUsersIndex(users) {
  mockUsersById = new Map();
  if (!Array.isArray(users)) return;

  users.forEach(user => addOneUserToMockIndex(user));
}

async function ensureUsersForPosts(remotePosts) {
  if (!Array.isArray(remotePosts) || remotePosts.length === 0) return;

  const missingIds = new Set();

  for (const post of remotePosts) {
    const uid = getPostUserIdRaw(post);
    if (!uid || lookupMockUser(uid)) continue;
    missingIds.add(uid);
  }

  await Promise.all(
    [...missingIds].map(async id => {
      const user = await fetchMockUserById(id);
      if (user) {
        addOneUserToMockIndex(user);
      }
    })
  );
}

function getPostUserIdRaw(post) {
  if (post?.userId === undefined || post?.userId === null) {
    return null;
  }
  const trimmed = String(post.userId).trim();
  return trimmed !== '' ? trimmed : null;
}

function lookupMockUser(userId) {
  if (userId === undefined || userId === null) return undefined;

  const asString = String(userId).trim();
  if (!asString) return undefined;

  const direct = mockUsersById.get(asString);
  if (direct) return direct;

  const asNumber = Number(asString);
  if (Number.isFinite(asNumber)) {
    return mockUsersById.get(asNumber) ?? mockUsersById.get(String(asNumber));
  }

  return undefined;
}

function normalizePersonName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, ' ');
}

function isMyRemotePost(post) {
  if (
    normalizePersonName(post.authorName) ===
    normalizePersonName(currentUser.name)
  ) {
    return true;
  }

  const postUserId = getPostUserIdRaw(post);
  if (postUserId !== null && postUserId === String(currentUser.id)) {
    return true;
  }

  return false;
}

function resolveRemotePostProfile(post) {
  if (isMyRemotePost(post)) {
    return { name: currentUser.name, avatar: currentUser.avatar };
  }

  const postUserId = getPostUserIdRaw(post);
  const apiUser = postUserId !== null ? lookupMockUser(postUserId) : undefined;

  if (apiUser) {
    return {
      name: (apiUser.name && String(apiUser.name).trim()) || 'Участник',
      avatar: apiUser.avatar ?? 'images/default-avatar.jpg',
    };
  }

  const nameFromPost = post.authorName && String(post.authorName).trim();
  if (nameFromPost) {
    return {
      name: nameFromPost,
      avatar: post.authorAvatar ?? 'images/default-avatar.jpg',
    };
  }

  return {
    name: 'Участник',
    avatar: post.authorAvatar ?? 'images/default-avatar.jpg',
  };
}

function shuffleArray(items) {
  const arr = items;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function appendRemotePostsToFeed(remotePosts) {
  if (!Array.isArray(remotePosts) || remotePosts.length === 0) {
    return;
  }

  await ensureUsersForPosts(remotePosts);

  const shuffled = shuffleArray([...remotePosts]);

  shuffled.forEach(post => {
    const { name: author, avatar } = resolveRemotePostProfile(post);
    const createdAtText = post.createdAt
      ? formatMinutesAgo(post.createdAt)
      : 'из API';
    const mine = isMyRemotePost(post);

    feedContainer.insertAdjacentHTML(
      'beforeend',
      createPostMarkup({
        id: `api-${post.id}`,
        author,
        avatar,
        text: post.body ?? '',
        likes: Math.floor(Math.random() * 120),
        time: createdAtText,
        deletable: mine,
        remoteApiId: mine ? post.id : null,
      })
    );
  });
}

async function loadMore() {
  if (isLoading || !apiPostsHasMore) return;

  isLoading = true;
  loader.classList.remove('hidden');

  try {
    const remotePosts = await fetchPostsPage(
      apiPostsNextPage,
      API_POSTS_PAGE_SIZE
    );

    await appendRemotePostsToFeed(remotePosts);
    apiPostsNextPage += 1;

    if (remotePosts.length < API_POSTS_PAGE_SIZE) {
      apiPostsHasMore = false;
      loader.classList.add('hidden');
    }
  } catch (error) {
    console.warn('Failed to load more MockAPI posts', error);
    updateStatusBar('Не удалось подгрузить посты', 'warning');
  } finally {
    isLoading = false;
    loader.classList.add('hidden');
    checkIfNeedMore();
  }
}

function openModal() {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  const draft = getDraft();
  if (draft && draft.text && !postContent.value.trim()) {
    postContent.value = draft.text;
  }
  postContent.focus();
  updateDraftIndicator();
}

function closeModal() {
  if (draftDebounceId) {
    window.clearTimeout(draftDebounceId);
    draftDebounceId = null;
  }
  persistDraftFromTextarea();
  modal.classList.remove('active');
  document.body.style.overflow = '';
  updateDraftIndicator();
}

function onDraftInput() {
  if (draftDebounceId) {
    window.clearTimeout(draftDebounceId);
  }

  draftDebounceId = window.setTimeout(() => {
    const text = postContent.value.trim();
    if (!text) {
      clearDraft();
      updateDraftIndicator();
      return;
    }
    saveDraft(text);
    updateDraftIndicator();
  }, 350);
}

function createPost(event) {
  event.preventDefault();
  const text = postContent.value.trim();
  if (!text) return;

  const localPostId = Date.now();
  const queued = queueUserPost(text);

  insertLocalPost({
    id: localPostId,
    author: currentUser.name,
    text,
    likes: 0,
    time: 'только что',
    pending: true,
    queueId: queued.localId,
    deletable: true,
  });

  postContent.value = '';
  clearDraft();
  if (draftDebounceId) {
    window.clearTimeout(draftDebounceId);
    draftDebounceId = null;
  }
  closeModal();

  if (navigator.onLine) {
    syncPendingPosts();
  } else {
    updateStatusBar('Офлайн: посты сохраняются в очередь', 'offline');
  }
}

async function loadApiPostsIntoFeed() {
  apiPostsNextPage = 1;
  apiPostsHasMore = true;

  try {
    let users = [];
    try {
      users = await fetchAllMockUsers();
    } catch (userError) {
      console.warn('Failed to load MockAPI users', userError);
    }

    buildMockUsersIndex(users);

    if (users.length === 0) {
      console.warn(
        'MockAPI: список users пустой или не загрузился — имена постов будут «Участник». Открой страницу через локальный сервер (не file://) и проверь в Network запрос /users.'
      );
    }

    const remotePosts = await fetchPostsPage(1, API_POSTS_PAGE_SIZE);
    await appendRemotePostsToFeed(remotePosts);
    apiPostsNextPage = 2;

    if (remotePosts.length < API_POSTS_PAGE_SIZE) {
      apiPostsHasMore = false;
    }
    loader.classList.add('hidden');

    if (remotePosts.length > 0) {
      updateStatusBar(
        'Посты из MockAPI загружены',
        navigator.onLine ? 'online' : 'offline'
      );
    }
  } catch (error) {
    console.warn('Failed to load MockAPI posts', error);
    updateStatusBar('Не удалось загрузить часть API-данных', 'warning');
    apiPostsHasMore = false;
    loader.classList.add('hidden');
  }
}

function setupConnectivityListeners() {
  window.addEventListener('online', async () => {
    updateStatusBar('Соединение восстановлено', 'online');
    renderMissingQueuedPostsInFeed();
    await syncPendingPosts();
  });

  window.addEventListener('offline', () => {
    updateStatusBar('Офлайн: посты сохраняются в очередь', 'offline');
  });
}

async function deleteMyPost(button) {
  const el = button?.closest?.('.post');
  if (!el) return;

  const queueId = el.getAttribute('data-queue-id');
  let remoteApiId = el.getAttribute('data-remote-api-id');

  if (!remoteApiId) {
    const pid = el.getAttribute('data-post-id') || '';
    const m = /^api-(.+)$/.exec(pid);
    if (m) remoteApiId = m[1];
  }

  if (queueId && !remoteApiId) {
    if (!window.confirm('Удалить пост из очереди? Его ещё нет на сервере.')) {
      return;
    }
    pendingPostsQueue = pendingPostsQueue.filter(entry => entry.localId !== queueId);
    savePendingPostsQueue(pendingPostsQueue);
    el.remove();
    return;
  }

  if (!remoteApiId) {
    console.warn('deleteMyPost: не найден id для API');
    return;
  }

  if (
    !window.confirm('Удалить этот пост? Он будет удалён и на сервере (MockAPI).')
  ) {
    return;
  }

  try {
    await deleteRemotePost(remoteApiId);
    el.remove();
  } catch (error) {
    console.warn('Failed to delete post', error);
    window.alert(
      'Не удалось удалить пост. Проверьте сеть и что пост существует на MockAPI.'
    );
  }
}

function exposeActionsToWindow() {
  window.toggleLike = toggleLike;
  window.toggleComments = toggleComments;
  window.addComment = addComment;
  window.deleteMyPost = deleteMyPost;
}

document.addEventListener('DOMContentLoaded', async () => {
  exposeActionsToWindow();

  updateStatusBar(
    navigator.onLine
      ? 'Онлайн: можно публиковать посты'
      : 'Офлайн: посты сохраняются в очередь',
    navigator.onLine ? 'online' : 'offline'
  );

  const draft = getDraft();
  if (draft?.text) {
    postContent.value = draft.text;
  }

  document
    .getElementById('draftBannerContinue')
    ?.addEventListener('click', () => {
      openModal();
    });
  document
    .getElementById('draftBannerDiscard')
    ?.addEventListener('click', () => {
      clearDraft();
      postContent.value = '';
      updateDraftIndicator();
    });

  updateDraftIndicator();

  setupConnectivityListeners();

  openModalBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  createPostForm.addEventListener('submit', createPost);
  postContent.addEventListener('input', onDraftInput);
  modal.querySelector('.modal__overlay').addEventListener('click', closeModal);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  renderMissingQueuedPostsInFeed();
  await loadApiPostsIntoFeed();
  await syncPendingPosts();

  if (feedScrollSentinel) {
    const scrollObserver = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 240px 0px',
        threshold: 0,
      }
    );
    scrollObserver.observe(feedScrollSentinel);
  }

  window.setTimeout(checkIfNeedMore, 100);
});
