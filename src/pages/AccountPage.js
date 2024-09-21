import React from 'react';
import { Navigate } from 'react-router-dom';

const AccountPage = ({ isDarkMode }) => {
  const username = localStorage.getItem('username');

  if (!username) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={`container mx-auto mt-8 p-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <h1 className="text-3xl font-bold mb-4">My Account</h1>
      <p>Welcome, {username}!</p>
      <p>This is a stub for the account page. More features will be added here in the future.</p>
    </div>
  );
};

export default AccountPage;