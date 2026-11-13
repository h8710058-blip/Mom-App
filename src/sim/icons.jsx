// All icons are inline SVG: no image files, no network.
export default function Icon({ name, size = 24 }) {
  const p = { width: size, height: size, viewBox: '0 0 32 32', 'aria-hidden': true, focusable: false };
  switch (name) {
    case 'start':
      return (
        <svg {...p}>
          <rect x="3" y="3" width="12.5" height="12.5" rx="1" fill="#0a78d4" />
          <rect x="16.5" y="3" width="12.5" height="12.5" rx="1" fill="#0a78d4" />
          <rect x="3" y="16.5" width="12.5" height="12.5" rx="1" fill="#0a78d4" />
          <rect x="16.5" y="16.5" width="12.5" height="12.5" rx="1" fill="#0a78d4" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...p}>
          <path d="M3 8a2 2 0 0 1 2-2h7l3 3h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#f4c542" />
          <path d="M3 12h26v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#ffd966" />
        </svg>
      );
    case 'explorer':
      return (
        <svg {...p}>
          <path d="M3 8a2 2 0 0 1 2-2h7l3 3h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#f4c542" />
          <path d="M3 12h26v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#ffd966" />
          <rect x="3" y="21" width="26" height="5" rx="1" fill="#3b9be8" opacity=".85" />
        </svg>
      );
    case 'notepad':
      return (
        <svg {...p}>
          <rect x="6" y="3" width="20" height="26" rx="2" fill="#fff" stroke="#7a8aa0" />
          <rect x="6" y="3" width="20" height="6" rx="2" fill="#3b82c4" />
          <path d="M10 14h12M10 18h12M10 22h8" stroke="#8a9bb0" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'word':
      return (
        <svg {...p}>
          <rect x="3" y="5" width="26" height="22" rx="3" fill="#185abd" />
          <text x="16" y="23" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" fontFamily="Segoe UI, Arial, sans-serif">W</text>
        </svg>
      );
    case 'browser':
      return (
        <svg {...p}>
          <circle cx="16" cy="16" r="13" fill="#2ea8e6" />
          <path d="M16 3a13 13 0 0 1 11 20c-4-1-8-5-9-10-1-5-4-8-2-10z" fill="#3ac569" opacity=".9" />
          <circle cx="16" cy="16" r="6" fill="#fff" opacity=".85" />
        </svg>
      );
    case 'recycle':
      return (
        <svg {...p}>
          <path d="M8 10h16l-1.6 17a2 2 0 0 1-2 1.8h-8.8a2 2 0 0 1-2-1.8z" fill="#9fb1c4" stroke="#6f8399" />
          <rect x="6" y="7" width="20" height="3" rx="1.5" fill="#7d93a9" />
          <path d="M13 5h6v2h-6z" fill="#7d93a9" />
          <path d="M13 14v10M16 14v10M19 14v10" stroke="#e8eef5" strokeWidth="1.5" />
        </svg>
      );
    case 'txt':
      return (
        <svg {...p}>
          <path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#7a8aa0" />
          <path d="M20 3v6h6" fill="#e3e9f0" stroke="#7a8aa0" />
          <path d="M11 15h11M11 19h11M11 23h7" stroke="#8a9bb0" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'docx':
      return (
        <svg {...p}>
          <path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#7a8aa0" />
          <path d="M20 3v6h6" fill="#e3e9f0" stroke="#7a8aa0" />
          <rect x="7" y="14" width="13" height="10" rx="1.5" fill="#185abd" />
          <text x="13.5" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="Segoe UI, Arial, sans-serif">W</text>
        </svg>
      );
    case 'pdf':
      return (
        <svg {...p}>
          <path d="M7 3h13l6 6v20H7z" fill="#fff" stroke="#7a8aa0" />
          <path d="M20 3v6h6" fill="#e3e9f0" stroke="#7a8aa0" />
          <rect x="7" y="14" width="19" height="9" rx="1.5" fill="#d33a2c" />
          <text x="16.5" y="21.3" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff" fontFamily="Segoe UI, Arial, sans-serif">PDF</text>
        </svg>
      );
    default:
      return null;
  }
}
