import React, { useState } from 'react';

function StarIcon({ fill = 0, size = 16 }) {
  // fill: 0=empty, 0.5=half, 1=full
  const id = `star-${Math.random().toString(36).slice(2, 7)}`;
  if (fill === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="1.5">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    );
  }
  if (fill === 0.5) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.5">
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
          fill={`url(#${id})`} stroke="#eab308" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}

export default function StarRating({ value = 0, onChange, size = 16, readonly = false }) {
  const [hover, setHover] = useState(null);

  const display = hover !== null ? hover : value;

  function getStarFill(starIndex) {
    const starValue = starIndex + 1;
    if (display >= starValue) return 1;
    if (display >= starValue - 0.5) return 0.5;
    return 0;
  }

  function handleMouseMove(e, starIndex) {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = x < rect.width / 2;
    setHover(half ? starIndex + 0.5 : starIndex + 1);
  }

  function handleClick(e, starIndex) {
    if (readonly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = x < rect.width / 2;
    const newVal = half ? starIndex + 0.5 : starIndex + 1;
    // Toggle off if same value
    onChange(newVal === value ? 0 : newVal);
  }

  return (
    <div
      className={`flex items-center gap-0.5 ${readonly ? '' : 'cursor-pointer'}`}
      onMouseLeave={() => !readonly && setHover(null)}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          onMouseMove={(e) => handleMouseMove(e, i)}
          onClick={(e) => handleClick(e, i)}
        >
          <StarIcon fill={getStarFill(i)} size={size} />
        </span>
      ))}
      {value > 0 && (
        <span className="text-xs text-txt-muted ml-1">{value}</span>
      )}
    </div>
  );
}
