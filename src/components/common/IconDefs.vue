<!-- SVG 图标库(Material Symbols 风格,从原型原样移植;IconSvg 通过 #i-名称 引用) -->
<template>
  <svg width="0" height="0" style="position: absolute" aria-hidden="true">
    <defs>
      <linearGradient id="kbyGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4285f4" />
        <stop offset="52%" stop-color="#9b72cb" />
        <stop offset="100%" stop-color="#d96570" />
      </linearGradient>
      <!-- 钢铁质感:亮钢 → 深铁 -->
      <linearGradient id="ironGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8a9099" />
        <stop offset="55%" stop-color="#5a5f66" />
        <stop offset="100%" stop-color="#3c4046" />
      </linearGradient>
    </defs>
    <symbol id="i-spark" viewBox="0 0 24 24">
      <path fill="url(#kbyGrad)" d="M12 1.5C12.5 7.5 16.5 11.5 22.5 12 16.5 12.5 12.5 16.5 12 22.5 11.5 16.5 7.5 12.5 1.5 12 7.5 11.5 11.5 7.5 12 1.5Z" />
    </symbol>
    <symbol id="i-workbench" viewBox="0 0 24 24">
      <!-- 铁砧:钢材渐变(左角为砧角,下方为收腰与砧座) -->
      <path fill="url(#ironGrad)" d="M3.2 13.9 L7.6 13 L20 13 L20 14.9 L16.8 14.9 L14.8 16.2 L14.8 17.3 L17.6 17.3 L17.6 20.4 L6.4 20.4 L6.4 17.3 L9.2 17.3 L9.2 16.2 L7.6 14.9 Z" />
      <!-- 锤子:45° 斜放,锤头右下角落在砧面上(敲击姿态),铁灰色 -->
      <g transform="rotate(45 11 9)">
        <rect x="7.5" y="7.6" width="7" height="3.4" rx="1.2" fill="#363a40" />
        <rect x="10" y="2.6" width="2" height="5.6" rx="1" fill="#8a8f96" />
      </g>
      <!-- 敲击火花:从落点向四周迸溅 -->
      <g stroke="#f76c05" stroke-width="1.3" stroke-linecap="round" fill="none">
        <path d="M11 12.2 9.6 11.8" />
        <path d="M10.7 11.7 9.9 10.8" />
        <path d="M13.6 12.3 15 11.9" />
        <path d="M8.6 12.6 7.6 12.2" />
      </g>
    </symbol>
    <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </symbol>
    <symbol id="i-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </symbol>
    <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m16.6 16.6 4.4 4.4" />
    </symbol>
    <symbol id="i-library" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
      <path d="m4 8 8-4 8 4-8 4-8-4Z" /><path d="m4 12 8 4 8-4" /><path d="m4 16 8 4 8-4" />
    </symbol>
    <symbol id="i-robot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="7.5" width="14" height="12" rx="3.5" />
      <path d="M12 7.5V5.2" />
      <circle cx="12" cy="3.8" r="1.1" />
      <path d="M9 12.2h.01M15 12.2h.01" />
      <path d="M9.5 15.8h5" />
      <path d="M2.5 12v3M21.5 12v3" />
    </symbol>
    <symbol id="i-bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </symbol>
    <symbol id="i-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </symbol>
    <symbol id="i-help" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.2-3 4" /><path d="M12 17.5h.01" />
    </symbol>
    <symbol id="i-mic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><path d="M12 18v4M8 22h8" />
    </symbol>
    <symbol id="i-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
    </symbol>
    <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M12 5v14M5 12h14" />
    </symbol>
    <symbol id="i-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m6 9 6 6 6-6" />
    </symbol>
    <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m5 12 5 5L20 7" />
    </symbol>
    <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </symbol>
    <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    </symbol>
  </svg>
</template>
