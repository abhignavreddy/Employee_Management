// src/components/ProfileAvatar.jsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useProfileImage } from '../hooks/useProfileImage';

export const ProfileAvatar = ({ 
  empId, 
  firstName, 
  size = 'default', 
  className = '' 
}) => {
  const { profileImgUrl, imageError, handleImageError } = useProfileImage(empId);

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    default: 'w-10 h-10 text-base',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {profileImgUrl && !imageError ? (
        <AvatarImage 
          src={profileImgUrl} 
          alt={`${firstName || 'User'}'s profile`}
          onError={handleImageError}
          className="object-cover"
        />
      ) : (
        <AvatarFallback className="bg-blue-600 text-white font-bold">
          {firstName?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      )}
    </Avatar>
  );
};
