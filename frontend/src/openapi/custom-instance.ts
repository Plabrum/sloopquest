import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { queryClient } from "@/lib/query-client";

const authMeQueryKey = ["auth", "me"] as const;

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      queryClient.invalidateQueries({ queryKey: authMeQueryKey });
    }
    return Promise.reject(error);
  },
);

export const customInstance = async <T>(
  config: AxiosRequestConfig,
): Promise<T> => {
  const { data } = await instance(config);
  return data;
};

export default customInstance;
export { instance };
