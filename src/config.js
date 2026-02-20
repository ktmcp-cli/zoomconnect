import Conf from 'conf';

const config = new Conf({
  projectName: 'ktmcp-zoomconnect'
});

export function getConfig(key) {
  return config.get(key);
}

export function setConfig(key, value) {
  config.set(key, value);
}

export function isConfigured() {
  return !!config.get('email') && !!config.get('token');
}

export function clearConfig() {
  config.clear();
}
