import axios from 'axios';

import { config } from '@/config/env';

const api = axios.create({
  baseURL: `${config.API_URL}`,
  headers: {}
});

export default api;
