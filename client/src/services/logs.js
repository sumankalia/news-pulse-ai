import axiosInstance from "./axiosInstance";

// Log related API calls
export const getLogs = async (page = 1, limit = 50, status, startDate, endDate) => {
  try {
    const params = new URLSearchParams({
      page,
      limit,
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
    const response = await axiosInstance.get(`/logs?${params}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching logs:", error);
    throw error;
  }
};

export const getLogStats = async () => {
  try {
    const response = await axiosInstance.get("/logs/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching log statistics:", error);
    throw error;
  }
};

export const getLogById = async (id) => {
  try {
    const response = await axiosInstance.get(`/logs/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching log by ID:", error);
    throw error;
  }
};

export const getParentLogs = async (parentId, page = 1, limit = 50) => {
  try {
    const params = new URLSearchParams({ page, limit });
    const response = await axiosInstance.get(`/logs/parent/${parentId}?${params}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching parent logs:", error);
    throw error;
  }
};

export const getArticleStats = async () => {
  try {
    const response = await axiosInstance.get("/logs/article-stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching article statistics:", error);
    throw error;
  }
};