// 모든 페이지 공통: 로그인 상태에 따라 헤더의 로그인 링크를 "로그인" 또는 "내 프로필"로 바꾼다.
// 관리자 계정이면 네비게이션에 "관리자 페이지" 링크도 추가로 노출한다.
(async () => {
  const loginLink = document.querySelector('.login-link');
  if (!loginLink) return;
  const current = await window.RecipeAuth?.getCurrentUser?.();
  if (current && current.profile) {
    loginLink.textContent = `@${current.profile.username}`;
    loginLink.href = 'profile.html';

    if (current.profile.is_admin) {
      const nav = document.querySelector('.main-nav');
      if (nav && !nav.querySelector('.admin-nav-link')) {
        const adminLink = document.createElement('a');
        adminLink.href = 'admin.html';
        adminLink.className = 'admin-nav-link';
        adminLink.textContent = '관리자 페이지';
        nav.appendChild(adminLink);
      }
    }
  } else {
    loginLink.textContent = '로그인';
    loginLink.href = 'login.html';
  }
})();