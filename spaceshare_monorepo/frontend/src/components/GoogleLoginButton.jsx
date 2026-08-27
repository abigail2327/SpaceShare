import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { API_BASE } from '../lib/apiClient.js';

function GoogleLoginButton({ onSuccess }) {
  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/google/`,
        { id_token: credentialResponse.credential }
      );
      localStorage.setItem('authToken', res.data.key);
      onSuccess(res.data);
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => console.error('Google login failed')}
    />
  );
}

export default GoogleLoginButton;