
// ============================================
// STATE
// ============================================

let cycleIndex = 0;
let isLoading = false;
let postCounter = 3;

const currentUser = {
    id: 999,
    name: 'Valery Malaichuk',
    avatar: 'images/valery_avatar.jpg'
};

// ============================================
// DOM
// ============================================

const feedContainer = document.getElementById('feed');
const loader = document.getElementById('loader');
const modal = document.getElementById('createPostModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const createPostForm = document.getElementById('createPostForm');
const postContent = document.getElementById('postContent');

// ============================================
// ACTIONS
// ============================================

function toggleLike(postId) {
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    if (!post) return;

    const likeBtn = post.querySelector('.post__action-btn--like');
    const likesCount = post.querySelector('.post__likes-count');
    const svg = likeBtn.querySelector('svg');
    
    const isLiked = likeBtn.classList.contains('liked');
    let count = parseInt(likesCount.textContent);

    if (isLiked) {
        likeBtn.classList.remove('liked');
        svg.setAttribute('fill', 'none');
        likesCount.textContent = count - 1;
    } else {
        likeBtn.classList.add('liked');
        svg.setAttribute('fill', 'currentColor');
        likesCount.textContent = count + 1;
    }
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection) {
        commentsSection.classList.toggle('hidden');
    }
}

function addComment(e, postId) {
    e.preventDefault();
    const input = e.target.querySelector('.comment-form__input');
    const text = input.value.trim();
    if (!text) return;

    const list = document.getElementById(`comments-list-${postId}`);
    const post = document.querySelector(`[data-post-id="${postId}"]`);
    const commentsCount = post.querySelector('.post__comments-count');

    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
        <img src="${currentUser.avatar}" alt="" class="comment__avatar" onerror="this.src='images/default_avatar.jpg'">
        <div class="comment__content">
            <div class="comment__author">${currentUser.name}</div>
            <div class="comment__text">${text}</div>
            <div class="comment__time">только что</div>
        </div>
    `;
    list.appendChild(div);

    const count = list.children.length;
    commentsCount.textContent = `${count} комментари${count % 10 === 1 && count % 100 !== 11 ? 'й' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'я' : 'ев'}`;

    input.value = '';
} 


// ============================================
// UTILS
// ============================================

function getTimeAgo() {
    const hours = Math.floor(Math.random() * 23) + 1;
    
    let text;
    if (hours === 1) {
        text = 'час';
    } else if (hours >= 2 && hours <= 4) {
        text = 'часа';
    } else {
        text = 'часов';
    }
    
    return `${hours} ${text} назад`;
}

function getLikesCount() {
    const likes = Math.floor(Math.random() * 1000);
    return `${likes}`;
}


// ============================================
// INFINITE SCROLL (ИСПРАВЛЕННЫЙ)
// ============================================

function loadMore() {
    if (isLoading) return;
    isLoading = true;
    loader.classList.remove('hidden');

    setTimeout(() => {
        const templateNum = (cycleIndex % 3) + 1;
        const originalPost = document.querySelector(`[data-template="${templateNum}"]`);
        
        if (originalPost) {
            const clone = originalPost.cloneNode(true);
            postCounter++;
            const newId = Date.now() + Math.random(); 
            
            clone.dataset.postId = newId;
            clone.removeAttribute('data-template');
            
            const timeEl = clone.querySelector('.post__time');
            timeEl.textContent = getTimeAgo();
            
            const likeBtn = clone.querySelector('.post__action-btn--like');
            likeBtn.classList.remove('liked');
            likeBtn.setAttribute('onclick', `toggleLike(${newId})`);
            const svg = likeBtn.querySelector('svg');
            svg.setAttribute('fill', 'none');
            
            const likesCount = clone.querySelector('.post__likes-count');
            likesCount.textContent = getLikesCount();
            
            const commentsCount = clone.querySelector('.post__comments-count');
            commentsCount.setAttribute('onclick', `toggleComments(${newId})`);
            commentsCount.textContent = 'Комментарии';
            
            const commentBtn = clone.querySelectorAll('.post__action-btn')[1];
            commentBtn.setAttribute('onclick', `toggleComments(${newId})`);
            
            const commentsSection = clone.querySelector('.post__comments');
            commentsSection.id = `comments-${newId}`;
            commentsSection.classList.add('hidden');
            
            const commentsList = clone.querySelector('.comments-list');
            commentsList.id = `comments-list-${newId}`;
            commentsList.innerHTML = '';
            
            const form = clone.querySelector('.comment-form');
            form.setAttribute('onsubmit', `addComment(event, ${newId})`);
            
            feedContainer.appendChild(clone);
            
            console.log(`Добавлен пост #${postCounter} (шаблон ${templateNum})`);
        }

        cycleIndex++;
        isLoading = false;
        
        checkIfNeedMore();
    }, 300);
}

function checkIfNeedMore() {
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    if (scrollHeight <= clientHeight * 1.5) {
        loadMore();
    }
}

// ============================================
// MODAL
// ============================================

function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    postContent.focus();
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    createPostForm.reset();
}

function createPost(e) {
    e.preventDefault();
    const text = postContent.value.trim();
    if (!text) return;

    postCounter++;
    const newId = Date.now();

    const article = document.createElement('article');
    article.className = 'post';
    article.dataset.postId = newId;
    
    article.innerHTML = `
        <div class="post__header">
            <img src="${currentUser.avatar}" alt="" class="post__avatar" onerror="this.src='images/default_avatar.jpg'">
            <div class="post__meta">
                <a href="#" class="post__author">${currentUser.name}</a>
                <span class="post__time">только что</span>
            </div>
        </div>
        <div class="post__content">${text.replace(/\n/g, '<br>')}</div>
        <div class="post__stats">
            <span class="post__likes-count">0</span>
            <span class="post__comments-count" onclick="toggleComments(${newId})">Комментарии</span>
        </div>
        <div class="post__actions">
            <button class="post__action-btn post__action-btn--like" onclick="toggleLike(${newId})">
                <svg class="post__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span>Нравится</span>
            </button>
            <button class="post__action-btn" onclick="toggleComments(${newId})">
                <svg class="post__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span>Комментировать</span>
            </button>
            <button class="post__action-btn">
                <svg class="post__action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                <span>Поделиться</span>
            </button>
        </div>
        <div class="post__comments hidden" id="comments-${newId}">
            <div class="comments-list" id="comments-list-${newId}"></div>
            <form class="comment-form" onsubmit="addComment(event, ${newId})">
                <img src="${currentUser.avatar}" alt="" class="comment-form__avatar" onerror="this.src='images/default_avatar.jpg'">
                <div class="comment-form__input-wrapper">
                    <input type="text" class="comment-form__input" placeholder="Напишите комментарий..." required>
                    <button type="submit" class="comment-form__submit">Отправить</button>
                </div>
            </form>
        </div>
    `;

    feedContainer.insertBefore(article, feedContainer.firstChild);
    closeModal();
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkIfNeedMore, 100);
    
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMore();
        }
    }, { 
        root: null,
        rootMargin: '200px',
        threshold: 0
    });

    observer.observe(loader);

    openModalBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    createPostForm.addEventListener('submit', createPost);
    modal.querySelector('.modal__overlay').addEventListener('click', closeModal);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
});