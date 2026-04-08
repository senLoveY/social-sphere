const KEYS = {
  uiStatus: 'socialsphere.uiStatus',
};

function saveToSessionStorage(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function readFromSessionStorage(key, fallbackValue) {
  const raw = sessionStorage.getItem(key);

  if (!raw) {
    return fallbackValue;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Failed to parse sessionStorage key "${key}"`, error);
    return fallbackValue;
  }
}

function saveUiStatus(status) {
  saveToSessionStorage(KEYS.uiStatus, status);
}

function getUiStatus() {
  return readFromSessionStorage(KEYS.uiStatus, null);
}

export { saveUiStatus, getUiStatus };
