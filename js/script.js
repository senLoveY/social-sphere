document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger-menu');
  const menu = document.getElementById('mobile-menu');

  if (burger && menu) {
    burger.addEventListener('click', () => {
      menu.classList.toggle('is-open');
    });
  }
});
