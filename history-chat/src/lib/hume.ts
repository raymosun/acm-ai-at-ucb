import { HumeClient } from "hume";

const client = new HumeClient({
  apiKey: import.meta.env.VITE_HUME_API_KEY,
  secretKey: import.meta.env.VITE_HUME_SECRET_KEY,
});

export default client;
