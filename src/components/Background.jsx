import React from 'react';

const Background = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: "url('./public/images/background.jpg') center/cover no-repeat",
        opacity: 1,
        overflow: 'hidden',
      }}
    />
  );
};

export default Background;