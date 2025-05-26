import axios from "axios";
import BASE_URI from "./baseUri";

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: BASE_URI + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;