// Backward compatibility wrapper — استخدم notifications.js مباشرة في الكود الجديد
import { showToast as _showToast } from "./notifications.js";

export function showToast(message) {
  _showToast({ type: "info", message });
}
