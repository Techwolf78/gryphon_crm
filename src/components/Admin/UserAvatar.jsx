import React from 'react';
import PropTypes from 'prop-types';

const UserAvatar = ({ photoURL, name, size = 8 }) => {
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2) // Only use first two names
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  const sizeClasses = {
    8: 'w-8 h-8 text-xs',
    10: 'w-10 h-10 text-sm',
    12: 'w-12 h-12 text-base',
    32: 'w-8 h-8 text-xs', // Default for table
    40: 'w-10 h-10 text-sm', // For modal
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-medium ${
        sizeClasses[size] || sizeClasses[8]
      }`}
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
      ) : (
        <span className="text-xs">{initials}</span>
      )}
      {/* Fallback if image fails to load */}
      <span className="hidden text-xs">{initials}</span>
    </div>
  );
};

UserAvatar.propTypes = {
  photoURL: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf([8, 10, 12, 32, 40]),
};

export default UserAvatar;
