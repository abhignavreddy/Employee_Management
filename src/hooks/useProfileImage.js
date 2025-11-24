// src/hooks/useProfileImage.js
import { useState, useEffect } from 'react';

export const useProfileImage = (empId) => {
  const [profileImgUrl, setProfileImgUrl] = useState('');
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empId) {
      setImageError(true);
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      setLoading(true);
      setImageError(false);

      try {
        const res = await fetch(`/api/employees/empid/${empId}/profile-image`, {
          method: 'GET',
        });

        if (!res.ok) {
          setProfileImgUrl(null);
          setImageError(true);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          setProfileImgUrl(null);
          setImageError(true);
          return;
        }

        setImageError(false);
        setProfileImgUrl(`/api/employees/empid/${empId}/profile-image?ts=${Date.now()}`);
      } catch (err) {
        console.error('Profile image fetch failed:', err);
        setProfileImgUrl(null);
        setImageError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [empId]);

  const handleImageError = () => {
    setImageError(true);
    setProfileImgUrl(null);
  };

  return { profileImgUrl, imageError, loading, handleImageError };
};
