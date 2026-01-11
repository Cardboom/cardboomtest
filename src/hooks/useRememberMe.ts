import { useState, useEffect } from 'react';

const REMEMBER_ME_KEY = 'cardboom_remember_me';
const REMEMBER_ME_EMAIL_KEY = 'cardboom_remember_email';

export const useRememberMe = () => {
  const [rememberMe, setRememberMe] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

  useEffect(() => {
    // Load saved preferences on mount
    const remembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    const email = localStorage.getItem(REMEMBER_ME_EMAIL_KEY) || '';
    setRememberMe(remembered);
    setSavedEmail(email);
  }, []);

  const saveRememberMe = (email: string, shouldRemember: boolean) => {
    if (shouldRemember) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
      localStorage.setItem(REMEMBER_ME_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
      localStorage.removeItem(REMEMBER_ME_EMAIL_KEY);
    }
    setRememberMe(shouldRemember);
    setSavedEmail(shouldRemember ? email : '');
  };

  const clearRememberMe = () => {
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(REMEMBER_ME_EMAIL_KEY);
    setRememberMe(false);
    setSavedEmail('');
  };

  return {
    rememberMe,
    setRememberMe,
    savedEmail,
    saveRememberMe,
    clearRememberMe,
  };
};
