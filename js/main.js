/* ==========================================================================
   愿望小厨房 · 页面交互脚本
   --------------------------------------------------------------------------
   1) 页面里的漂浮、旋转、弹窗缩放等动效仍由 css/style.css 完成，
      这里只负责购物车数据、搜索匹配、注册 / 登录这些需要记住状态的操作
   2) 菜品数据直接从菜品卡片读取，新增菜品时不需要再改 JS
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------- 1. 小工具 ---------------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* 每个大类的简短介绍，搜索弹窗里用来展示菜品说明 */
  const CATEGORY_DESC = {
    '主食': '现煮现做，热乎上桌，一碗就能把肚子填得妥妥的。',
    '特色菜品': '主厨私藏的招牌做法，是店里点单率最高的一类。',
    '荤菜': '大块肉、足火候，一份就能吃得心满意足。',
    '素菜': '当天现买的时令蔬菜，清爽不油腻。',
    '凉菜': '冰镇入味，开胃解腻的小份凉拌。',
    '点心': '手工现烤现蒸，甜口小食，下午茶首选。',
    '饮料': '现摇现调，冰镇满杯，配什么都合适。'
  };

  /* ---------------- 2. 读取 41 道菜品的数据 ---------------- */
  const dishes = $$('.dish').map(function (card) {
    const name = $('.dish-name', card).textContent.trim();
    const cat = $('.dish-cat', card).textContent.trim();
    const priceText = $('.dish-price', card).textContent || '';
    const price = Number(priceText.replace(/[^\d]/g, '')) || 0;
    const img = $('.dish-media img', card).getAttribute('src');

    return {
      name: name,
      cat: cat,
      price: price,
      img: img,
      desc: CATEGORY_DESC[cat] || '小厨房当天现做，热乎送到您手上。'
    };
  });

  function findDish(name) {
    return dishes.find(function (dish) { return dish.name === name; });
  }

  /* ---------------- 3. 购物车数据 ---------------- */
  /* 用 Map 保存：菜名 → { dish, qty }，同名菜品自动累加数量 */
  const cart = new Map();

  function totalQty() {
    let count = 0;
    cart.forEach(function (item) { count += item.qty; });
    return count;
  }

  function totalAmount() {
    let amount = 0;
    cart.forEach(function (item) { amount += item.dish.price * item.qty; });
    return amount;
  }

  /* ---------------- 4. 弹窗的打开与关闭 ---------------- */
  const body = document.body;

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    closeAllModals(true);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';

    /* 打开后把焦点放进弹窗，键盘操作更顺手 */
    const focusable = modal.querySelector('input, button');
    if (focusable) {
      window.setTimeout(function () { focusable.focus(); }, 260);
    }
  }

  function closeModalElement(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');

    /* 没有其他弹窗时恢复页面滚动 */
    if (!$$('.modal-layer.is-open').length) {
      body.style.overflow = '';
    }
  }

  function closeModal(id) {
    closeModalElement(document.getElementById(id));
  }

  function closeAllModals(silent) {
    $$('.modal-layer.is-open').forEach(function (modal) {
      closeModalElement(modal);
    });
    if (!silent) {
      body.style.overflow = '';
    }
  }

  /* 点击遮罩、关闭按钮都能关掉对应弹窗 */
  $$('[data-close]').forEach(function (el) {
    el.addEventListener('click', function () { closeModal(el.dataset.close); });
  });

  /* Esc 键关闭最上层的弹窗 */
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeAllModals();
    }
  });

  /* ---------------- 5. “已成功添加菜品” 弹窗（点击任意位置关闭） ---------------- */
  const addToastModal = $('#addToastModal');

  function openAddToast() {
    if (!addToastModal) return;
    addToastModal.classList.add('is-open');
    addToastModal.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';
  }

  function closeAddToast() {
    if (!addToastModal) return;
    addToastModal.classList.remove('is-open');
    addToastModal.setAttribute('aria-hidden', 'true');
    /* 关闭后回到原来的界面：若下层还有弹窗（如搜索弹窗），继续锁定页面滚动 */
    if (!$$('.modal-layer.is-open').length) {
      body.style.overflow = '';
    }
  }

  /* 弹窗铺满整个屏幕，点击页面上任意位置都会关闭它 */
  if (addToastModal) {
    addToastModal.addEventListener('click', closeAddToast);
  }
  const toast = $('#toast');
  const toastText = $('#toastText');
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toastText.textContent = message;
    toast.classList.add('is-show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-show');
    }, 1800);
  }

  /* ---------------- 6. 购物车渲染 ---------------- */
  const cartList = $('#cartList');
  const cartCount = $('#cartCount');
  const cartTotal = $('#cartTotal');
  const cartCheckout = $('#cartCheckout');

  function renderCart() {
    const count = totalQty();
    cartCount.textContent = count;
    cartTotal.textContent = '¥' + totalAmount();
    cartCheckout.disabled = cart.size === 0;

    if (cart.size === 0) {
      cartList.innerHTML = '<p class="cart-empty">餐篮还是空的，去「菜品大全」点几道菜吧～</p>';
      return;
    }

    let html = '';
    cart.forEach(function (item) {
      html +=
        '<div class="cart-item">' +
          '<img class="cart-thumb" src="' + item.dish.img + '" alt="' + item.dish.name + '">' +
          '<div class="cart-info">' +
            '<p class="cart-name">' + item.dish.name + '</p>' +
            '<p class="cart-price">¥' + item.dish.price + ' × ' + item.qty + '</p>' +
          '</div>' +
          '<span class="cart-line-total">¥' + item.dish.price * item.qty + '</span>' +
        '</div>';
    });
    cartList.innerHTML = html;
  }

  function addToCart(dish) {
    if (!dish) return;
    const item = cart.get(dish.name);
    if (item) {
      item.qty += 1;
    } else {
      cart.set(dish.name, { dish: dish, qty: 1 });
    }
    renderCart();
    openAddToast();
  }

  renderCart();

  /* 左侧购物车按钮：打开面板 */
  $('#cartFab').addEventListener('click', function () {
    renderCart();
    openModal('cartModal');
  });

  /* 购物车右下角“下单” */
  cartCheckout.addEventListener('click', function () {
    if (cart.size === 0) return;
    cart.clear();
    renderCart();
    closeModal('cartModal');
    openModal('checkoutModal');
  });

  /* ---------------- 7. 菜品卡片上的“点单” ---------------- */
  $$('.dish-order').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      const card = button.closest('.dish');
      const name = $('.dish-name', card).textContent.trim();
      addToCart(findDish(name));
    });
  });

  /* ---------------- 8. 搜索菜品 ---------------- */
  const searchForm = $('.search-form');
  const searchInput = $('.search-input');
  const searchBody = $('#searchBody');
  const searchEmpty = $('#searchEmpty');
  const searchSub = $('#searchSub');

  function showSearchResult(keyword) {
    /* 先精确匹配菜名，再退一步做包含匹配 */
    let matched = dishes.find(function (dish) { return dish.name === keyword; });
    if (!matched) {
      matched = dishes.find(function (dish) { return dish.name.indexOf(keyword) !== -1; });
    }
    if (!matched) {
      matched = dishes.find(function (dish) { return dish.cat.indexOf(keyword) !== -1; });
    }

    if (!matched) {
      searchBody.hidden = true;
      searchEmpty.hidden = false;
      searchSub.textContent = '没有搜到「' + keyword + '」，换一个关键词再试试。';
      openModal('searchModal');
      return;
    }

    searchBody.hidden = false;
    searchEmpty.hidden = true;
    searchSub.textContent = '这是离「' + keyword + '」最近的一道菜。';
    searchBody.innerHTML =
      '<img class="search-thumb" src="' + matched.img + '" alt="' + matched.name + '">' +
      '<div>' +
        '<span class="search-cat">' + matched.cat + '</span>' +
        '<h4 class="search-name">' + matched.name + '</h4>' +
        '<p class="search-desc">' + matched.desc + '</p>' +
        '<span class="search-price">¥' + matched.price + '</span>' +
        '<div class="search-actions">' +
          '<button class="search-order" type="button" id="searchOrder">' +
            '<i class="fa-solid fa-circle-plus" aria-hidden="true"></i> 点单' +
          '</button>' +
        '</div>' +
      '</div>';

    /* 搜索结果右下角的动态点单图标：点击加入购物车（搜索弹窗保留在下方，关闭提示弹窗后回到这里） */
    $('#searchOrder').addEventListener('click', function () {
      addToCart(matched);
    });

    openModal('searchModal');
  }

  searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const keyword = searchInput.value.trim();
    if (!keyword) {
      searchInput.focus();
      return;
    }
    showSearchResult(keyword);
  });

  /* ---------------- 9. 注册 / 登录 ---------------- */
  const registerBtn = $('#registerBtn');
  const loginBtn = $('#loginBtn');
  const userChip = $('#userChip');
  const registerForm = $('#registerForm');
  const loginForm = $('#loginForm');
  const loginAccount = $('#loginAccount');
  const loginPassword = $('#loginPassword');
  const loginSubmit = $('#loginSubmit');
  const welcomeCircle = $('#welcomeCircle');
  const regNickname = $('#regNickname');
  const regAvatar = $('#regAvatar');
  const avatarPickText = $('#avatarPickText');
  const avatarPick = $('.avatar-pick');
  let avatarDataUrl = '';

  /* 从相册选择头像：显示文件名，并读成可预览的地址 */
  if (regAvatar) {
    regAvatar.addEventListener('change', function () {
      const file = regAvatar.files && regAvatar.files[0];
      if (!file) return;
      avatarPickText.textContent = file.name;
      avatarPick.classList.add('is-picked');
      const reader = new FileReader();
      reader.onload = function () { avatarDataUrl = reader.result; };
      reader.readAsDataURL(file);
    });
  }

  /* 注册或登录成功后：隐藏注册、登录，显示头像与昵称 */
  function markLoggedIn() {
    registerBtn.hidden = true;
    loginBtn.hidden = true;
    userChip.hidden = false;
  }

  registerBtn.addEventListener('click', function (event) {
    event.preventDefault();
    openModal('registerModal');
  });

  loginBtn.addEventListener('click', function (event) {
    event.preventDefault();
    openModal('loginModal');
  });

  registerForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const password = $('#regPassword').value;
    const passwordAgain = $('#regPassword2').value;

    if (password !== passwordAgain) {
      showToast('两次输入的密码不一致');
      $('#regPassword2').focus();
      return;
    }

    /* 昵称与头像：头像选了就用选中的，没选就保留默认头像 */
    const nickname = regNickname.value.trim() || '新朋友';
    userChip.querySelector('.user-name').textContent = nickname;
    if (avatarDataUrl) {
      userChip.querySelector('img').src = avatarDataUrl;
    }

    registerForm.reset();
    avatarDataUrl = '';
    avatarPickText.textContent = '请从相册选择您的头像';
    avatarPick.classList.remove('is-picked');
    closeModal('registerModal');
    markLoggedIn();
    openModal('welcomeModal');
  });

  welcomeCircle.addEventListener('click', function () {
    closeModal('welcomeModal');
  });

  /* 登录框两个输入都填好之后，“登录”按钮才出现 */
  function toggleLoginButton() {
    const ready = loginAccount.value.trim() !== '' && loginPassword.value.trim() !== '';
    loginSubmit.hidden = !ready;
  }

  loginAccount.addEventListener('input', toggleLoginButton);
  loginPassword.addEventListener('input', toggleLoginButton);

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (loginSubmit.hidden) return;
    loginForm.reset();
    loginSubmit.hidden = true;
    closeModal('loginModal');
    markLoggedIn();
    showToast('登录成功，欢迎回来～');
  });

  /* ---------------- 10. 提交留言：追加到留言栏 ---------------- */
  const feedbackForm = $('#feedbackForm');
  const reviewGrid = $('.review-grid');

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  if (feedbackForm && reviewGrid) {
    feedbackForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const name = $('#feedName').value.trim() || '匿名客人';
      const dish = $('#feedDish').value.trim();
      const now = new Date();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const date = now.getFullYear() + '.' +
        (month < 10 ? '0' + month : month) + '.' +
        (day < 10 ? '0' + day : day);
      const avatarSrc = userChip && !userChip.hidden
        ? userChip.querySelector('img').getAttribute('src')
        : 'images/user/面包大王.jpg';
      const text = dish
        ? '最想吃「' + escapeHtml(dish) + '」，希望厨师们快快安排上～'
        : '期待小厨房的新菜单～';

      /* 新留言插到留言栏最前面，样式与原有留言一致 */
      const card = document.createElement('article');
      card.className = 'review-card';
      card.innerHTML =
        '<div class="review-head">' +
          '<img class="review-avatar" src="' + avatarSrc + '" alt="' + escapeHtml(name) + '的头像">' +
          '<div>' +
            '<h3 class="review-name">' + escapeHtml(name) + '</h3>' +
            '<p class="review-date">' + date + '</p>' +
          '</div>' +
          '<i class="fa-solid fa-quote-left review-quote" aria-hidden="true"></i>' +
        '</div>' +
        '<p class="review-text">' + text + '</p>' +
        '<div class="review-stars">' +
          '<i class="fa-solid fa-star"></i>'.repeat(5) +
        '</div>';
      reviewGrid.prepend(card);

      feedbackForm.reset();
      showToast('留言已发布，谢谢你～');
    });
  }

  /* ---------------- 11. 背景音乐：循环播放，正常音量 ---------------- */
  const bgm = $('#bgm');
  if (bgm) {
    bgm.volume = 1;   /* 正常音量 */
    const playBgm = function () { bgm.play().catch(function () {}); };
    playBgm();   /* 浏览器允许时自动播放 */
    /* 不允许自动播放的浏览器，在用户第一次点击 / 触摸 / 按键时开始播放 */
    ['click', 'touchstart', 'keydown'].forEach(function (type) {
      document.addEventListener(type, playBgm, { once: true, passive: true });
    });
  }
})();
