export default function(key, value) {
  return window.SANDBOX_PROXY.setStorage(key, value);
}