/**
 * SocialSphere — Лента новостей
 * Реализовано: лайки, комментарии, бесконечная прокрутка, модальное окно
 */

// ============================================
// ИМИТАЦИЯ БАЗЫ ДАННЫХ (Mock Data)
// ============================================

const mockUsers = [
    { id: 1, name: 'Pavel Arsianovich', avatar: 'images/avatar1.jpg' },
    { id: 2, name: 'Aviasales', avatar: 'images/avatar2.jpg', isVerified: true },
    { id: 3, name: 'Maria Ivanova', avatar: 'images/avatar3.jpg' },
    { id: 4, name: 'Alexey Petrov', avatar: 'images/avatar4.jpg' },
    { id: 5, name: 'Elena Sidorova', avatar: 'images/avatar5.jpg' }
];

const mockComments = [
    { id: 1, author: mockUsers[2], text: 'Классное фото! 🔥', time: '2 часа назад' },
    { id: 2, author: mockUsers[3], text: 'Вау, круто!', time: '1 час назад' },
    { id: 3, author: mockUsers[4], text: 'Хочу туда!', time: '30 минут назад' }
];

// Генерация постов
function generatePosts(startId, count) {
    const posts = [];
    const contents = [
        'Это с другом на самолете летали. Сейчас дома уже ✈️\n\nP.S. Самые дешевые билеты на Aviasales',
        'Недавно наш самолет был угнан. Если вы узнаете людей на фото, отпишите нам. Мы вам подарим по билетику 🎫',
        'Отличный день для полета! Небо сегодня просто невероятное ☁️✨',
        'Новое приключение начинается! Куда бы вы хотели полететь?',
        'Воспоминания о лете... Когда снова в небо? 🛩️',
        'Техническое обслуживание самолета — это искусство. Каждая деталь важна! 🔧',
        'Закат из иллюминатора — это волшебство. Никогда не устаю любоваться 🌅',
        'Первый полет на Ан-2. Незабываемые ощущения!'
    ];

    const images = [
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
        'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800',
        null,
        'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=800',
        'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=800',
        'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=800',
        'https://images.unsplash.com/photo-1529310399831-ed472b81d589?w=800'
    ];

    for (let i = 0; i < count; i++) {
        const id = startId + i;
        const userIndex = id % mockUsers.length;
        const contentIndex = id % contents.length;

        posts.push({
            id: id,
            author: mockUsers[userIndex],
            content: contents[contentIndex],
            image: images[contentIndex],
            likes: Math.floor(Math.random() * 500) + 10,
            isLiked: false,
            comments: id % 3 === 0 ? [mockComments[0], mockComments[1]] : [],
            time: generateTime(id),
            showComments: false
        });
    }
    return posts;
}

function generateTime(id) {
    const times = ['только что', '5 минут назад', '15 минут назад', '30 минут назад', 
                   '1 час назад', '2 часа назад', '3 часа назад', '5 часов назад',
                   'вчера', '2 дня назад'];
    return times[id % times.length];
}

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
    posts: [],
    currentUser: {
        id: 999,
        name: 'Valery Malaichuk',
        avatar: 'images/valery_avatar.jpg'
    },
    page: 1,
    isLoading: false,
    hasMorePosts: true
};

// ============================================
// DOM ELEMENTS
// ============================================

const feedContainer = document.getElementById('feed');
const loader = document.getElementById('loader');
const modal = document.getElementById('createPostModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const createPostForm = document.getElementById('createPostForm');
const postContent = document.getElementById('postContent');

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderPost(post) {
    const postEl = document.createElement('article');
    postEl.className = 'post';
    postEl.dataset.postId = post.id;

    const verifiedBadge = post.author.isVerified ? '<span title="Подтвержденный аккаунт">✓</span>' : '';
    const imageHtml = post.image ? `<img src="${post.image}" alt="Post image" class="post__image" loading="lazy">` : '';

    const commentsCount = post.comments.length;
    const commentsText = commentsCount > 0 ? `${commentsCount} комментариев` : 'Комментарии';

    postEl.innerHTML = `
        <div class="post__header">
            <img src="${post.author.avatar}" alt="${post.author.name}" class="post__avatar" 
                 onerror="this.src='images/default-avatar.jpg'">
            <div class="post__meta">
                <a href="#" class="post__author">${post.author.name} ${verifiedBadge}</a>
                <span class="post__time">${post.time}</span>
            </div>
        </div>

        <div class="post__content">${formatContent(post.content)}</div>
        ${imageHtml}

        <div class="post__stats">
            <span class="post__likes-count" data-likes="${post.likes}">${post.likes}</span>
            <span class="post__comments-count" onclick="toggleComments(${post.id})">${commentsText}</span>
        </div>

        <div class="post__actions">
            <button class="post__action-btn post__action-btn--like ${post.isLiked ? 'liked' : ''}" 
                    onclick="toggleLike(${post.id})" aria-label="Нравится">
                <svg class="post__action-icon" viewBox="0 0 24 24" fill="${post.isLiked ? 'currentColor' : 'none'}" 
                     stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span>Нравится</span>
            </button>
            <button class="post__action-btn" onclick="toggleComments(${post.id})" aria-label="Комментировать">
                <svg class="post__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span>Комментировать</span>
            </button>
            <button class="post__action-btn" aria-label="Поделиться">
                <svg class="post__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                <span>Поделиться</span>
            </button>
        </div>

        <div class="post__comments ${post.showComments ? '' : 'hidden'}" id="comments-${post.id}">
            <div class="comments-list" id="comments-list-${post.id}">
                ${renderComments(post.comments)}
            </div>
            <form class="comment-form" onsubmit="addComment(event, ${post.id})">
                <img src="${state.currentUser.avatar}" alt="Вы" class="comment-form__avatar" 
                     onerror="this.src='images/default-avatar.jpg'">
                <div class="comment-form__input-wrapper">
                    <input type="text" class="comment-form__input" placeholder="Напишите комментарий..." required>
                    <button type="submit" class="comment-form__submit">Отправить</button>
                </div>
            </form>
        </div>
    `;

    return postEl;
}

function renderComments(comments) {
    if (comments.length === 0) return '';

    return comments.map(comment => `
        <div class="comment">
            <img src="${comment.author.avatar}" alt="${comment.author.name}" class="comment__avatar" 
                 onerror="this.src='images/default-avatar.jpg'">
            <div class="comment__content">
                <div class="comment__author">${comment.author.name}</div>
                <div class="comment__text">${escapeHtml(comment.text)}</div>
                <div class="comment__time">${comment.time}</div>
            </div>
        </div>
    `).join('');
}

function formatContent(content) {
    return content
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--primary-color);">$1</a>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INTERACTION FUNCTIONS
// ============================================

function toggleLike(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;

    const postEl = document.querySelector(`[data-post-id="${postId}"]`);
    const likeBtn = postEl.querySelector('.post__action-btn--like');
    const likesCount = postEl.querySelector('.post__likes-count');
    const likeIcon = likeBtn.querySelector('svg');

    likeBtn.classList.toggle('liked', post.isLiked);
    likeIcon.setAttribute('fill', post.isLiked ? 'currentColor' : 'none');
    likesCount.textContent = post.likes;

    likeBtn.style.transform = 'scale(1.2)';
    setTimeout(() => likeBtn.style.transform = 'scale(1)', 200);

    savePostsToStorage();
}

function toggleComments(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    post.showComments = !post.showComments;

    const commentsEl = document.getElementById(`comments-${postId}`);
    commentsEl.classList.toggle('hidden', !post.showComments);

    if (post.showComments) {
        setTimeout(() => {
            const input = commentsEl.querySelector('.comment-form__input');
            if (input) input.focus();
        }, 100);
    }
}

function addComment(event, postId) {
    event.preventDefault();

    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const form = event.target;
    const input = form.querySelector('.comment-form__input');
    const text = input.value.trim();

    if (!text) return;

    const newComment = {
        id: Date.now(),
        author: state.currentUser,
        text: text,
        time: 'только что'
    };

    post.comments.push(newComment);

    const commentsList = document.getElementById(`comments-list-${postId}`);
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    commentEl.style.animation = 'fadeIn 0.3s ease';
    commentEl.innerHTML = `
        <img src="${newComment.author.avatar}" alt="${newComment.author.name}" class="comment__avatar" 
             onerror="this.src='images/default-avatar.jpg'">
        <div class="comment__content">
            <div class="comment__author">${newComment.author.name}</div>
            <div class="comment__text">${escapeHtml(newComment.text)}</div>
            <div class="comment__time">${newComment.time}</div>
        </div>
    `;
    commentsList.appendChild(commentEl);

    const postEl = document.querySelector(`[data-post-id="${postId}"]`);
    const commentsCountEl = postEl.querySelector('.post__comments-count');
    commentsCountEl.textContent = `${post.comments.length} комментари${getCommentWord(post.comments.length)}`;

    input.value = '';
    savePostsToStorage();
}

function getCommentWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) return 'й';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'я';
    return 'ев';
}

// ============================================
// INFINITE SCROLL
// ============================================

function loadMorePosts() {
    if (state.isLoading || !state.hasMorePosts) return;

    state.isLoading = true;
    loader.classList.remove('hidden');

    setTimeout(() => {
        const newPosts = generatePosts(state.posts.length + 1, 5);

        if (state.page >= 5) {
            state.hasMorePosts = false;
            loader.innerHTML = '<span>Больше нет постов</span>';
        } else {
            state.posts.push(...newPosts);
            newPosts.forEach(post => {
                feedContainer.appendChild(renderPost(post));
            });
            state.page++;
        }

        state.isLoading = false;
        if (state.hasMorePosts) loader.classList.add('hidden');

    }, 800);
}

function setupInfiniteScroll() {
    const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                loadMorePosts();
            }
        });
    }, options);

    observer.observe(loader);
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => postContent.focus(), 100);
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    createPostForm.reset();
}

function handleCreatePost(event) {
    event.preventDefault();

    const content = postContent.value.trim();
    if (!content) return;

    const newPost = {
        id: Date.now(),
        author: state.currentUser,
        content: content,
        image: null,
        likes: 0,
        isLiked: false,
        comments: [],
        time: 'только что',
        showComments: false
    };

    state.posts.unshift(newPost);

    const postEl = renderPost(newPost);
    postEl.style.animation = 'fadeIn 0.5s ease';
    feedContainer.insertBefore(postEl, feedContainer.firstChild);

    closeModal();
    showNotification('Пост опубликован!');
    savePostsToStorage();
}

// ============================================
// LOCAL STORAGE
// ============================================

function savePostsToStorage() {
    try {
        localStorage.setItem('socialsphere_posts', JSON.stringify(state.posts));
    } catch (e) {
        console.warn('Не удалось сохранить в LocalStorage:', e);
    }
}

function loadPostsFromStorage() {
    try {
        const saved = localStorage.getItem('socialsphere_posts');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Не удалось загрузить из LocalStorage:', e);
    }
    return null;
}

// ============================================
// UTILITIES
// ============================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const savedPosts = loadPostsFromStorage();
    if (savedPosts && savedPosts.length > 0) {
        state.posts = savedPosts;
    } else {
        state.posts = generatePosts(1, 5);
    }

    state.posts.forEach(post => {
        feedContainer.appendChild(renderPost(post));
    });

    setupInfiniteScroll();

    openModalBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    createPostForm.addEventListener('submit', handleCreatePost);

    modal.querySelector('.modal__overlay').addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});
