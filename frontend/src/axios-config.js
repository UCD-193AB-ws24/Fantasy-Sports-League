import axios from 'axios';

// Only apply the interceptor when the sessionId exists
const sessionId = sessionStorage.getItem("sessionId");
if (sessionId) {
    axios.interceptors.request.use(config => {
        // Only add sessionId to API requests
        if (config.url && config.url.includes('localhost:5001') && !config.url.includes('logout')) {
            const separator = config.url.includes('?') ? '&' : '?';
            config.url = `${config.url}${separator}sessionId=${sessionId}`;
        }
        return config;
    });
}


