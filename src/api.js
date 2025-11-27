// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/", // note the trailing slash
});

// helper to set/remove token header
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["X-Session-Token"] = token;
  } else {
    delete api.defaults.headers.common["X-Session-Token"];
  }
}

export default api;
