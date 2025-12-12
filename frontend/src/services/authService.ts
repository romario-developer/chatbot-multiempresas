import { api } from './api';

const TOKEN_KEY = 'token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  setToken(res.data.token);
  return res.data;
}

async function register(name: string, email: string, password: string) {
  const res = await api.post('/auth/register', { name, email, password });
  setToken(res.data.token);
  return res.data;
}

async function me() {
  const res = await api.get('/auth/me');
  return res.data.user;
}

export const authService = {
  login,
  register,
  me,
  getToken,
  setToken,
  clearToken,
};
