import React from 'react';

interface BookIconProps {
  position?: 'top-left' | 'top-center' | 'top-right';
  size?: 'small' | 'medium' | 'large';
}

export default function BookIcon({ position = 'top-center', size = 'medium' }: BookIconProps) {
  const positionClass = {
    'top-left': 'book-icon-top-left',
    'top-center': 'book-icon-top-center', 
    'top-right': 'book-icon-top-right'
  }[position];

  const sizeClass = {
    'small': 'book-icon-small',
    'medium': 'book-icon-medium',
    'large': 'book-icon-large'
  }[size];

  return (
    <div className={`book-icon ${positionClass} ${sizeClass}`}>
      {/* 책 SVG 아이콘 */}
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20V4H6.5C5.83696 4 5.20107 4.26339 4.73223 4.73223C4.26339 5.20107 4 5.83696 4 6.5V19.5Z" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="rgba(255,255,255,0.1)"
        />
        <path 
          d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20V20H6.5C5.83696 20 5.20107 19.7366 4.73223 19.2678C4.26339 18.7989 4 18.163 4 17.5V19.5Z" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="rgba(255,255,255,0.2)"
        />
        <line x1="9" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}