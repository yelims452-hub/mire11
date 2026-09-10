// 모든 페이지 공통: 로그인 상태에 따라 헤더의 로그인 링크를 "로그인" 또는 "내 프로필"로 바꾼다.
(async () => {
  const loginLink = document.querySelector('.login-link');
  if (!loginLink) return;
  const current = await window.RecipeAuth?.getCurrentUser?.();
  if (current && current.profile) {
    loginLink.textContent = `@${current.profile.username}`;
    loginLink.href = 'profile.html';
  } else {
    loginLink.textContent = '로그인';
    loginLink.href = 'login.html';
  }
})();
