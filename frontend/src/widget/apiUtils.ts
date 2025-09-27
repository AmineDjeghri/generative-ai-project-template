export const getApiBaseUrl = () => {
  const url = process.env.REACT_APP_BACK_API_URL;
  if (!url) throw new Error('REACT_APP_BACK_API_URL environment variable is not set');
  return url;
};
