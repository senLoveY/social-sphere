function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatRuCommentsLabel(count) {
  return `${count} комментари${
    count % 10 === 1 && count % 100 !== 11
      ? 'й'
      : count % 10 >= 2 &&
          count % 10 <= 4 &&
          (count % 100 < 10 || count % 100 >= 20)
        ? 'я'
        : 'ев'
  }`;
}

function formatMinutesAgo(dateLike) {
  const date = new Date(dateLike);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));

  if (minutes < 60) {
    return `${minutes} мин назад`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} ч назад`;
}

export { escapeHtml, formatRuCommentsLabel, formatMinutesAgo };
