// Simple greeting on page load
console.log('SocialSphere loaded!');

// Add current date to the heading
window.addEventListener('DOMContentLoaded', function () {
  const heading = document.querySelector('h1');

  if (heading) {
    const now = new Date();
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    const dateStr = now.toLocaleDateString('ru-RU', options);

    // Add date below the heading
    const dateElement = document.createElement('p');
    dateElement.textContent = `Loaded: ${dateStr}`;
    dateElement.style.textAlign = 'center';
    dateElement.style.fontSize = '0.9rem';
    dateElement.style.color = '#777';
    dateElement.style.marginTop = '10px';

    heading.parentNode.insertBefore(dateElement, heading.nextSibling);
  }
});

// Simple hover animation for the heading
const heading = document.querySelector('h1');
if (heading) {
  heading.addEventListener('mouseenter', function () {
    this.style.color = '#3498db';
    this.style.transform = 'scale(1.05)';
    this.style.transition = 'all 0.3s ease';
  });

  heading.addEventListener('mouseleave', function () {
    this.style.color = '#2c3e50';
    this.style.transform = 'scale(1)';
  });
}

// Notification function (can be used later)
function showNotification(message) {
  console.log('Notification:', message);
}

// Test notification
setTimeout(() => {
  showNotification('Application is ready to work!');
}, 1000);