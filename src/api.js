import axios from 'axios';
import { getConfig } from './config.js';

const BASE_URL = 'https://www.zoomconnect.com';

function getClient() {
  const email = getConfig('email');
  const token = getConfig('token');
  const baseUrl = getConfig('baseUrl') || BASE_URL;

  return axios.create({
    baseURL: baseUrl,
    headers: {
      'email': email,
      'token': token,
      'Content-Type': 'application/json'
    }
  });
}

export async function makeRequest(method, path, data = null, params = null) {
  const client = getClient();
  try {
    const response = await client.request({
      method,
      url: path,
      data,
      params
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Request failed: ${error.message}`);
  }
}
