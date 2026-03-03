// Configuration constants
// Add your configuration settings here

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: '/api/v1'
};

export default config;
