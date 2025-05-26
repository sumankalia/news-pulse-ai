import axiosInstance from "./axiosInstance";

export const connectToChatService = async ({ query, userId }) => {
  try {
    const response = await axiosInstance.post("/articles/analysis/query", {
      query,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error("Error connecting to chat service:", error);
    throw error;
  }
};
