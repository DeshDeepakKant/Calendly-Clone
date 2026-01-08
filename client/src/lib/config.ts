export const getApiUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Ensure protocol is present
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    // Remove trailing slash if present to avoid double slashes when appending paths
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }

    return url;
};

export const API_URL = getApiUrl();
