import { GoogleLogin } from '@react-oauth/google';
import { request } from '../lib/apiClient.js';
import { setTokens } from '../lib/tokens.js';

function GoogleLoginButton({ onSuccess }) {
  const handleSuccess = async (credentialResponse) => {
    try {
      const data = await request('/api/auth/google/', {
        method: 'POST',
        body: { idToken: credentialResponse.credential },
        auth: false,
      });
      setTokens({ access: data.access, refresh: data.refresh });
      onSuccess(data.user);
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