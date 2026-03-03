"use client";
import React from "react";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
}

export default function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: AvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const dimensionStyle = { width: size, height: size };

  if (src) {
    // next/image has trouble with data URIs/blobs and custom hosts,
    // so use a plain <img> which works for all cases (base64, blob, remote).
    return (
      <img
        src={src}
        alt="Avatar"
        width={size}
        height={size}
        style={{ objectFit: "cover" }}
        className={`rounded-full ${className}`}
      />
    );
  }

  return (
    <div
      style={dimensionStyle}
      className={`rounded-full bg-slate-400/20 flex items-center justify-center font-black text-slate-300 ${className}`}
    >
      {initial}
    </div>
  );
}
