const API_BASE = '/api';
const state = {
    token: localStorage.getItem('sa_token'),
    user: null,
    view: 'feed',
    scope: 'all',
    posts: [],
    profile: null,
    searchTimer: null,
    searchRequestId: 0,
    lastQuoteIndex: -1
};

const dailyQuotes = [
    'A small act of attention can change the shape of someone’s day.',
    'You do not have to be loud to leave a lasting mark.',
    'Good questions make room for better answers.',
    'A little curiosity goes a long way toward understanding.',
    'The best ideas get better when they are shared.',
    'There is courage in beginning before you feel ready.',
    'Make something useful. Make someone feel seen.',
    'The world gets wider when we listen past our own experience.',
    'A good conversation is a place both people can grow.',
    'Progress often arrives dressed as an ordinary Tuesday.',
    'Leave a little more kindness in the room than you found.',
    'Every expert was once someone willing to ask.'
];

const byId = (id) => document.getElementById(id);

async function api(path, options = {}) {
    const headers = {};
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(`${API_BASE}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && state.token) clearSession();
        throw new Error(data.error || 'Something went wrong. Please try again.');
    }
    return data;
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function avatarFor(username, className = 'avatar') {
    const avatar = element('span', className, (username || 'S').slice(0, 1).toUpperCase());
    avatar.setAttribute('aria-hidden', 'true');
    return avatar;
}

function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
}

function syncThemeControls() {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
        button.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
        button.title = `Switch to ${nextTheme} mode`;
    });
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = document.documentElement.dataset.theme === 'light' ? '#f3f6f2' : '#0b100d';
}

function showToast(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function showDailyQuote() {
    let quoteIndex = Math.floor(Math.random() * dailyQuotes.length);
    if (dailyQuotes.length > 1 && quoteIndex === state.lastQuoteIndex) {
        quoteIndex = (quoteIndex + 1) % dailyQuotes.length;
    }
    state.lastQuoteIndex = quoteIndex;
    byId('daily-quote').textContent = dailyQuotes[quoteIndex];
}

function setAuthMode(mode) {
    const registering = mode === 'register';
    const form = byId('auth-form');
    const wrapper = byId('auth-form-wrap');
    const identitySwitcher = byId('auth-fields-switcher');
    const modeChanged = Boolean(form.dataset.mode && form.dataset.mode !== mode);
    if (wrapper.modeAnimation) wrapper.modeAnimation.cancel();
    if (identitySwitcher.heightAnimationFrame) cancelAnimationFrame(identitySwitcher.heightAnimationFrame);
    if (identitySwitcher.heightTransitionEnd) {
        identitySwitcher.removeEventListener('transitionend', identitySwitcher.heightTransitionEnd);
        identitySwitcher.heightTransitionEnd = null;
    }
    const startPanelHeight = modeChanged ? identitySwitcher.getBoundingClientRect().height : 0;
    if (modeChanged) {
        identitySwitcher.classList.remove('is-sizing');
        identitySwitcher.style.height = 'auto';
    }

    byId('login-tab').classList.toggle('is-active', !registering);
    byId('register-tab').classList.toggle('is-active', registering);
    byId('login-tab').setAttribute('aria-selected', String(!registering));
    byId('register-tab').setAttribute('aria-selected', String(registering));
    byId('auth-switch').dataset.mode = mode;
    byId('auth-heading').textContent = registering ? 'Find your people.' : 'Welcome back.';
    byId('auth-description').textContent = registering
        ? 'Create your corner of the conversation.'
        : 'Pick up where your conversations left off.';
    byId('login-identity').classList.toggle('is-active', !registering);
    byId('login-identity').inert = registering;
    byId('login-identity').setAttribute('aria-hidden', String(registering));
    byId('register-identity').classList.toggle('is-active', registering);
    byId('register-identity').inert = !registering;
    byId('register-identity').setAttribute('aria-hidden', String(!registering));
    byId('auth-username').required = registering;
    byId('auth-email').required = registering;
    byId('auth-identifier').required = !registering;
    byId('auth-submit-label').textContent = registering ? 'Create account' : 'Log in';
    byId('auth-password').autocomplete = registering ? 'new-password' : 'current-password';
    byId('auth-error').textContent = '';
    form.dataset.mode = mode;
    if (modeChanged) {
        const targetPanelHeight = identitySwitcher.getBoundingClientRect().height;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            identitySwitcher.style.height = '';
        } else {
            identitySwitcher.style.height = `${startPanelHeight}px`;
            identitySwitcher.offsetHeight;
            identitySwitcher.classList.add('is-sizing');
            identitySwitcher.heightTransitionEnd = (event) => {
                if (event.target !== identitySwitcher || event.propertyName !== 'height') return;
                identitySwitcher.style.height = '';
                identitySwitcher.classList.remove('is-sizing');
                identitySwitcher.removeEventListener('transitionend', identitySwitcher.heightTransitionEnd);
                identitySwitcher.heightTransitionEnd = null;
            };
            identitySwitcher.addEventListener('transitionend', identitySwitcher.heightTransitionEnd);
            identitySwitcher.heightAnimationFrame = requestAnimationFrame(() => {
                identitySwitcher.style.height = `${targetPanelHeight}px`;
                identitySwitcher.heightAnimationFrame = null;
            });
        }
    }
    if (modeChanged && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        wrapper.modeAnimation = wrapper.animate([
            { opacity: 0.84, transform: 'translate3d(0, 4px, 0)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
}

function showAuth() {
    byId('auth-screen').hidden = false;
    byId('app-shell').hidden = true;
}

function clearSession() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_username');
    showAuth();
}

function updateUserChrome() {
    byId('sidebar-username').textContent = `@${state.user.username}`;
    byId('sidebar-avatar').textContent = state.user.username.slice(0, 1).toUpperCase();
    byId('composer-avatar').textContent = state.user.username.slice(0, 1).toUpperCase();
}

async function startApp() {
    try {
        state.user = await api('/users/me');
        byId('auth-screen').hidden = true;
        byId('app-shell').hidden = false;
        updateUserChrome();
        setFeedView('all');
        await loadSuggestions();
    } catch (error) {
        if (state.token) showToast(error.message);
    }
}

byId('login-tab').addEventListener('click', () => setAuthMode('login'));
byId('register-tab').addEventListener('click', () => setAuthMode('register'));
byId('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = byId('auth-username').value.trim().toLowerCase();
    const email = byId('auth-email').value.trim().toLowerCase();
    const identifier = byId('auth-identifier').value.trim().toLowerCase();
    const password = byId('auth-password').value;
    const mode = event.currentTarget.dataset.mode || 'login';
    const submit = byId('auth-submit');
    submit.disabled = true;
    byId('auth-error').textContent = '';
    try {
        if (mode === 'register') {
            await api('/auth/register', { method: 'POST', body: { username, email, password } });
        }
        const session = await api('/auth/login', { method: 'POST', body: { identifier: mode === 'register' ? username : identifier, password } });
        state.token = session.token;
        localStorage.setItem('sa_token', session.token);
        localStorage.setItem('sa_username', session.username);
        await startApp();
    } catch (error) {
        byId('auth-error').textContent = error.message;
    } finally {
        submit.disabled = false;
    }
});

function setFeedView(scope = 'all') {
    state.view = 'feed';
    state.scope = scope;
    byId('feed-view').hidden = false;
    byId('profile-view').hidden = true;
    byId('page-title').textContent = scope === 'following' ? 'Your following feed.' : 'Make your circle count.';
    document.querySelectorAll('[data-view]').forEach((button) => {
        const active = button.dataset.view === (scope === 'following' ? 'following' : 'feed');
        button.classList.toggle('is-active', active);
    });
    document.querySelectorAll('[data-scope]').forEach((button) => {
        const active = button.dataset.scope === scope;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
    });
    loadFeed();
}

async function loadFeed() {
    const feed = byId('feed-list');
    feed.replaceChildren(element('p', 'loading-state', 'Gathering the latest…'));
    const params = new URLSearchParams();
    if (state.scope === 'following') params.set('scope', 'following');
    try {
        state.posts = await api(`/posts${params.size ? `?${params}` : ''}`);
        renderPosts(state.posts, feed);
    } catch (error) {
        feed.replaceChildren(element('p', 'empty-state', error.message));
    }
}

function formatTime(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function profileButton(username, userId, className = 'post-author') {
    const button = element('button', className, `@${username}`);
    button.type = 'button';
    button.addEventListener('click', () => openProfile(userId));
    return button;
}

function renderPosts(posts, mount) {
    mount.replaceChildren();
    const filtered = state.search
        ? posts.filter((post) => `${post.username} ${post.content}`.toLowerCase().includes(state.search))
        : posts;
    if (!filtered.length) {
        mount.append(element('p', 'empty-state', state.search ? 'No posts match that search.' : 'It’s quiet here for now. Start the conversation.'));
        return;
    }

    filtered.forEach((post) => {
        const card = element('article', 'post-card');
        const header = element('header', 'post-header');
        header.append(avatarFor(post.username));
        const identity = element('div', 'post-identity');
        identity.append(profileButton(post.username, post.user));
        identity.append(element('time', 'post-time', formatTime(post.createdAt)));
        header.append(identity);
        const viewProfile = element('button', 'post-more icon-button');
        viewProfile.type = 'button';
        viewProfile.setAttribute('aria-label', `View @${post.username}'s profile`);
        const moreIcon = element('i');
        moreIcon.setAttribute('data-lucide', 'arrow-up-right');
        viewProfile.append(moreIcon);
        viewProfile.addEventListener('click', () => openProfile(post.user));
        header.append(viewProfile);
        card.append(header);

        card.append(element('p', 'post-content', post.content));
        const footer = element('div', 'post-actions');
        const like = element('button', `action-button like-button${post.isLiked ? ' is-liked' : ''}`);
        like.type = 'button';
        like.setAttribute('aria-pressed', String(Boolean(post.isLiked)));
        const heart = element('i');
        heart.setAttribute('data-lucide', 'heart');
        const likeLabel = element('span', '', `${post.likes.length} ${post.likes.length === 1 ? 'like' : 'likes'}`);
        like.append(heart, likeLabel);
        like.addEventListener('click', () => toggleLike(post, like, likeLabel));
        const commentCount = element('span', 'action-meta');
        const commentIcon = element('i');
        commentIcon.setAttribute('data-lucide', 'message-circle');
        commentCount.append(commentIcon, document.createTextNode(`${post.comments.length} ${post.comments.length === 1 ? 'reply' : 'replies'}`));
        footer.append(like, commentCount);
        card.append(footer);

        const comments = element('div', 'comments-list');
        if (post.comments.length) {
            post.comments.forEach((comment) => {
                const row = element('div', 'comment-row');
                row.append(avatarFor(comment.username, 'avatar avatar-tiny'));
                const detail = element('p', 'comment-copy');
                detail.append(profileButton(comment.username, comment.user, 'comment-author'));
                detail.append(document.createTextNode(` ${comment.content}`));
                row.append(detail);
                comments.append(row);
            });
        }
        const commentForm = document.createElement('form');
        commentForm.className = 'comment-form';
        const commentInput = document.createElement('input');
        commentInput.type = 'text';
        commentInput.maxLength = 240;
        commentInput.placeholder = 'Add a thoughtful reply…';
        commentInput.setAttribute('aria-label', 'Write a reply');
        const commentSubmit = element('button', 'icon-button comment-submit');
        commentSubmit.type = 'submit';
        commentSubmit.setAttribute('aria-label', 'Send reply');
        const sendIcon = element('i');
        sendIcon.setAttribute('data-lucide', 'arrow-up');
        commentSubmit.append(sendIcon);
        commentForm.append(commentInput, commentSubmit);
        commentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const content = commentInput.value.trim();
            if (!content) return;
            commentSubmit.disabled = true;
            try {
                await api(`/posts/${post._id}/comment`, { method: 'POST', body: { content } });
                await refreshActiveView();
            } catch (error) {
                showToast(error.message);
            } finally {
                commentSubmit.disabled = false;
            }
        });
        comments.append(commentForm);
        card.append(comments);
        mount.append(card);
    });
    refreshIcons();
}

async function toggleLike(post, button, label) {
    const wasLiked = Boolean(post.isLiked);
    const originalLikes = post.likes;
    const nextLiked = !wasLiked;
    post.isLiked = nextLiked;
    post.likes = nextLiked
        ? [...post.likes, state.user.id]
        : post.likes.filter((id) => id.toString() !== state.user.id);
    const updateButton = (count) => {
        button.classList.toggle('is-liked', post.isLiked);
        button.setAttribute('aria-pressed', String(post.isLiked));
        label.textContent = `${count} ${count === 1 ? 'like' : 'likes'}`;
    };
    updateButton(post.likes.length);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        button.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.12)' },
            { transform: 'scale(1)' }
        ], { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
    button.disabled = true;
    try {
        const updated = await api(`/posts/${post._id}/like`, { method: 'POST' });
        post.isLiked = updated.isLiked;
        if (Array.isArray(updated.likes)) post.likes = updated.likes;
        updateButton(typeof updated.likeCount === 'number' ? updated.likeCount : post.likes.length);
    } catch (error) {
        post.isLiked = wasLiked;
        post.likes = originalLikes;
        updateButton(originalLikes.length);
        showToast(error.message);
    } finally {
        button.disabled = false;
    }
}

async function refreshActiveView() {
    if (state.view === 'profile' && state.profile) {
        await loadProfilePosts(state.profile.id);
    } else {
        await loadFeed();
    }
}

async function loadProfilePosts(userId) {
    const mount = byId('profile-posts');
    mount.replaceChildren(element('p', 'loading-state', 'Finding those posts…'));
    try {
        const posts = await api(`/posts?author=${encodeURIComponent(userId)}`);
        renderPosts(posts, mount);
    } catch (error) {
        mount.replaceChildren(element('p', 'empty-state', error.message));
    }
}

async function openProfile(userId) {
    byId('search-results').hidden = true;
    byId('feed-search').setAttribute('aria-expanded', 'false');
    state.view = 'profile';
    byId('feed-view').hidden = true;
    byId('profile-view').hidden = false;
    byId('page-title').textContent = 'A closer look.';
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === 'profile'));
    byId('profile-posts').replaceChildren(element('p', 'loading-state', 'Loading profile…'));
    try {
        const profile = await api(`/users/${encodeURIComponent(userId)}`);
        state.profile = profile;
        byId('profile-avatar').textContent = profile.username.slice(0, 1).toUpperCase();
        byId('profile-name').textContent = profile.username;
        byId('profile-handle').textContent = `@${profile.username}`;
        byId('profile-bio').textContent = profile.bio || 'Still finding the words for this space.';
        byId('profile-followers').textContent = profile.followerCount;
        byId('profile-following').textContent = profile.followingCount;
        const isOwnProfile = profile.id === state.user.id;
        byId('bio-form').hidden = !isOwnProfile;
        byId('bio-input').value = profile.bio || '';
        byId('bio-count').textContent = `${(profile.bio || '').length} / 160`;
        const actions = byId('profile-actions');
        actions.replaceChildren();
        if (!isOwnProfile) {
            const follow = element('button', `button ${profile.isFollowing ? 'button-secondary' : 'button-primary'}`, profile.isFollowing ? 'Following' : 'Follow');
            follow.type = 'button';
            follow.addEventListener('click', () => toggleFollow(profile.id));
            actions.append(follow);
        } else {
            const settings = element('button', 'button button-secondary', 'Account settings');
            settings.type = 'button';
            settings.addEventListener('click', () => openInfo('settings'));
            actions.append(settings);
        }
        await loadProfilePosts(profile.id);
        refreshIcons();
    } catch (error) {
        byId('profile-posts').replaceChildren(element('p', 'empty-state', error.message));
    }
}

async function toggleFollow(userId) {
    try {
        const result = await api(`/users/${userId}/follow`, { method: 'POST' });
        showToast(result.isFollowing ? 'You’re following this person.' : 'You unfollowed this person.');
        await loadSuggestions();
        if (state.profile && state.profile.id === userId) await openProfile(userId);
        if (state.scope === 'following') await loadFeed();
    } catch (error) {
        showToast(error.message);
    }
}

async function loadSuggestions() {
    const list = byId('suggestion-list');
    list.replaceChildren(element('p', 'loading-state', 'Finding good company…'));
    try {
        const users = await api('/users/suggestions');
        list.replaceChildren();
        if (!users.length) {
            list.append(element('p', 'empty-state suggestion-empty', 'You’re all caught up. Check back as more people join.'));
            return;
        }
        users.forEach((user) => {
            const row = element('div', 'suggestion-row');
            row.append(avatarFor(user.username, 'avatar avatar-small'));
            const info = element('div', 'suggestion-info');
            info.append(profileButton(user.username, user.id, 'suggestion-name'));
            info.append(element('span', 'suggestion-bio', user.bio || 'New around here'));
            const follow = element('button', 'follow-mini', 'Follow');
            follow.type = 'button';
            follow.addEventListener('click', () => toggleFollow(user.id));
            row.append(info, follow);
            list.append(row);
        });
        refreshIcons();
    } catch (error) {
        list.replaceChildren(element('p', 'empty-state suggestion-empty', error.message));
    }
}

byId('post-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const contentInput = byId('post-content');
    const content = contentInput.value.trim();
    if (!content) return;
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
        await api('/posts', { method: 'POST', body: { content } });
        contentInput.value = '';
        byId('post-count').textContent = '0 / 500';
        setFeedView('all');
        showToast('Your post is out in the world.');
    } catch (error) {
        showToast(error.message);
    } finally {
        submit.disabled = false;
    }
});

byId('post-content').addEventListener('input', (event) => {
    byId('post-count').textContent = `${event.currentTarget.value.length} / 500`;
});

document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
        if (button.dataset.view === 'profile') openProfile(state.user.id);
        else setFeedView(button.dataset.view === 'following' ? 'following' : 'all');
    });
});

document.querySelectorAll('[data-scope]').forEach((button) => {
    button.addEventListener('click', () => setFeedView(button.dataset.scope));
});

byId('bio-input').addEventListener('input', (event) => {
    byId('bio-count').textContent = `${event.currentTarget.value.length} / 160`;
});

byId('bio-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
        state.profile = await api('/users/me', { method: 'PATCH', body: { bio: byId('bio-input').value } });
        state.user = state.profile;
        byId('profile-bio').textContent = state.profile.bio || 'Still finding the words for this space.';
        showToast('Your profile is up to date.');
    } catch (error) {
        showToast(error.message);
    }
});

function renderPeopleSearch(users, requestId) {
    if (requestId !== state.searchRequestId) return;
    const results = byId('search-results');
    results.replaceChildren();
    if (!users.length) {
        results.append(element('p', 'search-empty', 'No people found. Try another name.'));
    } else {
        users.forEach((user) => {
            const result = element('button', 'search-result');
            result.type = 'button';
            result.setAttribute('role', 'option');
            result.append(avatarFor(user.username, 'avatar avatar-small'));
            const details = element('span', 'search-result-copy');
            details.append(element('strong', '', `@${user.username}`));
            details.append(element('small', '', user.bio || 'New around here'));
            result.append(details);
            result.addEventListener('click', () => openProfile(user.id));
            results.append(result);
        });
    }
    results.hidden = false;
    byId('feed-search').setAttribute('aria-expanded', 'true');
}

byId('feed-search').addEventListener('input', (event) => {
    const query = event.currentTarget.value.trim();
    const requestId = ++state.searchRequestId;
    clearTimeout(state.searchTimer);
    if (query.length < 2) {
        byId('search-results').replaceChildren();
        byId('search-results').hidden = true;
        event.currentTarget.setAttribute('aria-expanded', 'false');
        return;
    }
    byId('search-results').replaceChildren(element('p', 'search-empty', 'Looking for people…'));
    byId('search-results').hidden = false;
    event.currentTarget.setAttribute('aria-expanded', 'true');
    state.searchTimer = setTimeout(async () => {
        try {
            const users = await api(`/users/search?q=${encodeURIComponent(query)}`);
            renderPeopleSearch(users, requestId);
        } catch (error) {
            if (requestId === state.searchRequestId) {
                renderPeopleSearch([], requestId);
                showToast(error.message);
            }
        }
    }, 220);
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-wrap')) {
        byId('search-results').hidden = true;
        byId('feed-search').setAttribute('aria-expanded', 'false');
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        byId('search-results').hidden = true;
        byId('feed-search').setAttribute('aria-expanded', 'false');
    }
});

function addInfoParagraph(parent, text) {
    parent.append(element('p', 'dialog-paragraph', text));
}

function addInfoSection(parent, section) {
    const wrapper = element('section', 'policy-section');
    wrapper.append(element('h3', '', section.heading));
    section.paragraphs.forEach((paragraph) => addInfoParagraph(wrapper, paragraph));
    parent.append(wrapper);
}

function addSettingsField(form, id, labelText, type, value, placeholder, helpText, disabled = false) {
    const label = element('label', 'settings-label', labelText);
    const input = document.createElement('input');
    input.id = id;
    input.type = type;
    input.value = value;
    input.placeholder = placeholder;
    input.disabled = disabled;
    label.append(input);
    form.append(label);
    if (helpText) form.append(element('small', 'settings-help', helpText));
    return input;
}

function formatAvailability(dateValue) {
    if (!dateValue) return 'Available now. You can change this once every 30 days.';
    return `Available again ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(dateValue))}.`;
}

function openInfo(type) {
    const dialog = byId('info-dialog');
    const body = byId('dialog-body');
    body.replaceChildren();
    const documents = {
        privacy: {
            eyebrow: 'THE IMPORTANT DETAILS',
            title: 'Privacy, in plain language',
            sections: [
                { heading: '1. Information this app stores', paragraphs: [
                    'When you create an account, Social Alpha stores your username, email address, and a one-way password hash. Your profile bio, follow relationships, posts, comments, likes, and account-change dates are stored to provide the social features.',
                    'If you submit a support request, its topic, subject, message, account ID, username, and status are saved as a support ticket. Do not include passwords, payment details, or other secrets in a support message.'
                ] },
                { heading: '2. How information is used', paragraphs: [
                    'Account information is used to register and authenticate you, identify your posts and comments, show profile details, maintain follow and like state, and process support requests.',
                    'The current project code does not include an advertising or analytics integration. Your hosting provider, database provider, or network infrastructure may still create operational logs under their own terms.'
                ] },
                { heading: '3. What other members can see', paragraphs: [
                    'Your username, bio, posts, comments, and social activity shown by the app are visible to signed-in members. Treat anything you publish as information that can be copied or shared by someone else.',
                    'Your email address and password hash are not returned by public profile endpoints. Email is used as a sign-in identifier and is not displayed on your public profile.'
                ] },
                { heading: '4. Service providers', paragraphs: [
                    'The app stores its records in the configured MongoDB database and runs on the server chosen by its operator. Those providers process data to host and operate the service.',
                    'The sign-in page currently loads fonts, icons, and its community image from third-party asset hosts. Your browser may send those providers ordinary connection information, such as your IP address, when requesting those assets.'
                ] },
                { heading: '5. Storage and retention', paragraphs: [
                    'Account and social data remain in the configured database while the operator keeps the service and records. This project does not currently provide a self-service account deletion or a published retention schedule.',
                    'You can use Support to ask the operator about a correction or deletion. That request is stored as a ticket and requires a human with database access to handle it; submitting a ticket does not automatically delete records.'
                ] },
                { heading: '6. Security', paragraphs: [
                    'Passwords are hashed with bcrypt before storage, and account changes require the current password. Username and email changes are limited to once every 30 days.',
                    'No internet service can promise perfect security. Use a unique password, sign out on shared devices, and contact Support if you believe someone has accessed your account.'
                ] },
                { heading: '7. Your account choices', paragraphs: [
                    'You can edit your bio from your profile and update your username, email, or password from Account settings. Username and email changes require your current password and have a 30-day cooldown.',
                    'Email verification, password-reset email, account export, and automatic account deletion are not implemented. Email changes therefore do not currently prove that you control the new address.'
                ] },
                { heading: '8. Children and age requirements', paragraphs: [
                    'This prototype does not include age checks or parental-consent tools. Its operator should establish and publish an age policy appropriate to the audience and applicable law before opening it to the public.'
                ] },
                { heading: '9. Changes and questions', paragraphs: [
                    'The operator may revise this notice as the app changes. Material changes should be reflected here before they take effect.',
                    'Use the Support form for privacy questions. This text describes the current starter app and should be reviewed for the operator’s actual hosting, jurisdiction, and data practices before public launch.'
                ] }
            ]
        },
        terms: {
            eyebrow: 'USING THE SPACE',
            title: 'Terms of use',
            sections: [
                { heading: '1. About the service', paragraphs: [
                    'Social Alpha is an early-stage social app for profiles, posts, comments, likes, and following. The operator may add, change, or remove features as the project develops.'
                ] },
                { heading: '2. Your account', paragraphs: [
                    'Provide a valid email address and choose a username that you are allowed to use. You are responsible for activity under your account and for keeping your password private.',
                    'Contact the operator through Support if you suspect unauthorized access. Email verification and automated password recovery are not available in this version.'
                ] },
                { heading: '3. Your content', paragraphs: [
                    'You keep ownership of content you create. By posting it, you give the service permission to store, process, and display it as needed to operate the app and show it to the audience you chose.',
                    'Only post content you have the rights and permissions to share. Do not upload confidential or personal information about another person without their consent.'
                ] },
                { heading: '4. Conduct', paragraphs: [
                    'Do not use the service to break the law, threaten or harass people, impersonate someone, distribute spam or malware, infringe others’ rights, or disrupt the app or its database.',
                    'The Community Guidelines provide examples of the behavior expected here. They are part of these project terms.'
                ] },
                { heading: '5. Moderation and account action', paragraphs: [
                    'The operator may review reports or support tickets and may remove content or restrict accounts that appear to violate these terms or put the service or community at risk.',
                    'A full report, appeal, and moderation dashboard is not implemented yet. Support submissions are stored for manual review and do not promise a response time.'
                ] },
                { heading: '6. Availability and data', paragraphs: [
                    'This prototype is provided as-is for development and evaluation. The operator does not promise uninterrupted availability, permanent storage, or that every feature will remain available.',
                    'Self-service account deletion, data export, and password recovery are not currently available. Review the Privacy notice for what the app stores and how to request help.'
                ] },
                { heading: '7. Third-party services', paragraphs: [
                    'The service relies on hosting, database, and asset providers selected by its operator. Their services are also subject to their own terms and privacy notices.'
                ] },
                { heading: '8. Updates and contact', paragraphs: [
                    'These terms may be updated as the app changes. Continued use after a posted update means you accept the revised terms where permitted by law.',
                    'For questions, use the in-app Support form. These starter terms are not legal advice and should be reviewed by qualified counsel before a public production launch.'
                ] }
            ]
        },
        community: {
            eyebrow: 'HOW WE SHOW UP',
            title: 'Community guidelines',
            sections: [
                { heading: 'Start with respect', paragraphs: [
                    'Speak to people as people. Debate ideas without insults, pile-ons, or attempts to drive someone out of the conversation.',
                    'Ask questions in good faith, credit others’ work, and leave room for experiences different from your own.'
                ] },
                { heading: 'Keep people safe', paragraphs: [
                    'Threats, hate, targeted harassment, stalking, sexual exploitation, and encouragement of real-world harm are not welcome.',
                    'Do not publish someone else’s private information, messages, or images without permission. Do not impersonate another person or organization.'
                ] },
                { heading: 'Share responsibly', paragraphs: [
                    'Post material you have the right to share. Avoid spam, scams, malware, deceptive links, and repetitive promotion that overwhelms conversation.',
                    'Do not use the service to coordinate illegal activity or to evade another person’s safety boundaries.'
                ] },
                { heading: 'When something goes wrong', paragraphs: [
                    'Use Support to describe a concern and include enough context for the operator to understand it. Avoid reposting harmful material while asking for help.',
                    'The project does not yet have in-feed reporting, a staffed emergency response, or a formal appeals workflow. Do not rely on it for urgent safety matters.'
                ] },
                { heading: 'How the guidelines are applied', paragraphs: [
                    'The operator may review available information and remove content or restrict accounts when needed to protect people or the service. Actions should be proportionate to the issue, although a complete moderation process is still being developed.',
                    'These guidelines are a starting point and may be updated with community feedback.'
                ] }
            ]
        }
    };
    if (type === 'settings') {
        byId('dialog-eyebrow').textContent = 'YOUR ACCOUNT';
        byId('dialog-title').textContent = 'Account settings';
        addInfoParagraph(body, 'Username and email changes require your current password and are limited to once every 30 days. Email verification and password recovery are not available yet.');
        const form = document.createElement('form');
        form.className = 'support-form account-settings-form';
        const username = addSettingsField(
            form,
            'settings-username',
            'Username',
            'text',
            state.user.username,
            'Choose a handle',
            formatAvailability(state.user.usernameChangeAvailableAt),
            Boolean(state.user.usernameChangeAvailableAt)
        );
        username.minLength = 3;
        username.maxLength = 20;
        username.pattern = '[A-Za-z0-9_]+';
        username.required = true;
        const email = addSettingsField(
            form,
            'settings-email',
            'Email address',
            'email',
            state.user.email || '',
            'you@example.com',
            formatAvailability(state.user.emailChangeAvailableAt),
            Boolean(state.user.emailChangeAvailableAt)
        );
        email.maxLength = 254;
        email.required = true;
        const currentPassword = addSettingsField(form, 'settings-current-password', 'Current password', 'password', '', 'Required to save account changes', '');
        currentPassword.autocomplete = 'current-password';
        currentPassword.required = true;
        const newPassword = addSettingsField(form, 'settings-new-password', 'New password (optional)', 'password', '', 'At least 8 characters', 'Leave blank to keep your current password.');
        newPassword.autocomplete = 'new-password';
        newPassword.minLength = 8;
        newPassword.maxLength = 72;
        const status = element('p', 'form-message');
        status.setAttribute('aria-live', 'polite');
        const submit = element('button', 'button button-primary', 'Save account changes');
        submit.type = 'submit';
        form.append(status, submit);
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            submit.disabled = true;
            status.textContent = '';
            const previousUsername = state.user.username;
            const updates = {
                username: username.value,
                email: email.value,
                currentPassword: currentPassword.value
            };
            if (newPassword.value) updates.newPassword = newPassword.value;
            try {
                const updated = await api('/users/me', { method: 'PATCH', body: updates });
                if (updated.token) {
                    state.token = updated.token;
                    localStorage.setItem('sa_token', updated.token);
                }
                state.user = updated;
                state.profile = { ...state.profile, ...updated };
                updateUserChrome();
                byId('profile-name').textContent = updated.username;
                byId('profile-handle').textContent = `@${updated.username}`;
                byId('dialog-title').textContent = 'Changes saved';
                body.replaceChildren(element('p', 'dialog-paragraph', 'Your account details have been updated.'));
                showToast(previousUsername !== updated.username ? `Your new handle is @${updated.username}.` : 'Account settings saved.');
                if (state.view === 'profile') await loadProfilePosts(updated.id);
            } catch (error) {
                status.textContent = error.message;
            } finally {
                submit.disabled = false;
            }
        });
        body.append(form);
    } else if (type === 'support') {
        byId('dialog-eyebrow').textContent = 'WE’RE LISTENING';
        byId('dialog-title').textContent = 'Talk to the team';
        addInfoParagraph(body, 'Send a note about your account, privacy, safety, or ideas. It is stored as a support ticket; email replies are not configured in this version.');
        const form = document.createElement('form');
        form.className = 'support-form';
        const categoryLabel = element('label', '', 'What is this about?');
        const category = document.createElement('select');
        category.setAttribute('aria-label', 'Support topic');
        [['account', 'Account'], ['privacy', 'Privacy'], ['safety', 'Safety'], ['feedback', 'Feedback'], ['other', 'Something else']].forEach(([value, label]) => {
            const option = element('option', '', label);
            option.value = value;
            category.append(option);
        });
        categoryLabel.append(category);
        const subjectLabel = element('label', '', 'Subject');
        const subject = document.createElement('input');
        subject.maxLength = 120;
        subject.minLength = 4;
        subject.required = true;
        subject.placeholder = 'A short summary';
        subjectLabel.append(subject);
        const messageLabel = element('label', '', 'Message');
        const message = document.createElement('textarea');
        message.maxLength = 3000;
        message.minLength = 10;
        message.rows = 5;
        message.required = true;
        message.placeholder = 'Tell us a little more…';
        messageLabel.append(message);
        const status = element('p', 'form-message');
        status.setAttribute('aria-live', 'polite');
        const submit = element('button', 'button button-primary', 'Send to support');
        submit.type = 'submit';
        form.append(categoryLabel, subjectLabel, messageLabel, status, submit);
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            submit.disabled = true;
            try {
                await api('/support/tickets', { method: 'POST', body: { category: category.value, subject: subject.value, message: message.value } });
                status.textContent = 'Your support note was saved. Replies are not yet automated.';
                form.reset();
            } catch (error) {
                status.textContent = error.message;
            } finally {
                submit.disabled = false;
            }
        });
        body.append(form);
    } else {
        const documentContent = documents[type];
        byId('dialog-eyebrow').textContent = documentContent.eyebrow;
        byId('dialog-title').textContent = documentContent.title;
        documentContent.sections.forEach((section) => addInfoSection(body, section));
    }
    dialog.showModal();
    refreshIcons();
}

document.querySelectorAll('[data-info]').forEach((button) => {
    button.addEventListener('click', () => openInfo(button.dataset.info));
});
byId('dialog-close').addEventListener('click', () => byId('info-dialog').close());
byId('info-dialog').addEventListener('click', (event) => {
    if (event.target === byId('info-dialog')) byId('info-dialog').close();
});
byId('new-quote').addEventListener('click', showDailyQuote);

document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
        const root = document.documentElement;
        const nextTheme = root.dataset.theme === 'light' ? 'dark' : 'light';
        root.dataset.theme = nextTheme;
        clearTimeout(root.themeTransitionTimer);
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            root.classList.remove('theme-transitioning');
        } else {
            root.classList.add('theme-transitioning');
            root.themeTransitionTimer = setTimeout(() => root.classList.remove('theme-transitioning'), 560);
        }
        try {
            localStorage.setItem('sa_theme', nextTheme);
        } catch (error) {
            showToast('Theme changed for this visit. Browser storage is unavailable.');
        }
        syncThemeControls();
    });
});

byId('logout-button').addEventListener('click', clearSession);

setAuthMode('login');
showDailyQuote();
syncThemeControls();
refreshIcons();
if (state.token) startApp();
else showAuth();
