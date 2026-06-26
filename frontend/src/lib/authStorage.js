const TOKEN_KEY = 'token';

export function saveToken(token) {
  let saved = false;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    saved = true;
  } catch {
    // Safari private mode / blocked storage
  }
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    saved = true;
  } catch {
    // ignore
  }
  if (!saved) {
    throw new Error('STORAGE_BLOCKED');
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return sessionStorage.getItem(TOKEN_KEY);
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function formatAuthError(err) {
  if (err?.message === 'STORAGE_BLOCKED') {
    return 'Браузер блокирует сохранение сессии. Отключите режим инкогнито или разрешите cookies для woner.ru.';
  }
  if (!err?.response) {
    if (err?.code === 'ECONNABORTED') {
      return 'Превышено время ожидания. Проверьте интернет или попробуйте Wi‑Fi. Зарядите телефон, если батарея ниже 10%.';
    }
    return 'Нет связи с сервером. Проверьте интернет и обновите страницу.';
  }
  if (err.response.data?.error) return err.response.data.error;
  if (err.response.data?.errors?.length) {
    const first = err.response.data.errors[0];
    if (first?.param === 'email') return 'Введите корректный email';
    if (first?.param === 'code') return 'Введите код из письма';
    return first?.msg || 'Проверьте введённые данные';
  }
  if (err.response.status === 401) return 'Неверный код или email';
  if (err.response.status === 404) {
    if (err.response.data?.code === 'NOT_REGISTERED') {
      return 'Вы не зарегистрированы. Перейдите на страницу регистрации.';
    }
    return err.response.data?.error || 'Аккаунт не найден';
  }
  if (err.response.status === 503) {
    return err.response.data?.error || 'Сервис отправки писем временно недоступен. Попробуйте позже.';
  }
  return 'Не удалось войти. Попробуйте ещё раз.';
}
