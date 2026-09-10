const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  nav.classList.toggle('is-open', !isOpen);
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', () => nav?.classList.remove('is-open'));
});

document.querySelector('.publish-button')?.addEventListener('click', () => {
  const original = '첫 레시피 작성하기 →';
  document.querySelector('.publish-button').textContent = '레시피 작성 화면을 준비 중이에요!';
  setTimeout(() => { document.querySelector('.publish-button').textContent = original; }, 2400);
});
