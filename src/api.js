export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

export const api = {
  me: () => request("/api/me"),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  login: (credentials) => post("/api/auth/login", credentials),
  register: (credentials) => post("/api/auth/register", credentials),
  createPoll: ({ question, options }) => post("/api/polls", { question, options }),
  getPoll: (id) => request(`/api/polls/${encodeURIComponent(id)}`),
  vote: (id, optionId) => post(`/api/polls/${encodeURIComponent(id)}/vote`, { optionId }),
};
