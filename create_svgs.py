import os

dir_path = 'src/components/jar/objects'
os.makedirs(dir_path, exist_ok=True)

svgs = {
    'Polaroid.tsx': '''"use client";
import { motion } from "framer-motion";
export function Polaroid({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md" animate={{ rotate: !isSleeping && Math.abs(velocityY) > 5 ? [-2, 2, 0] : 0 }} transition={{ duration: 0.2 }}>
      <rect x="5" y="5" width="90" height="110" rx="2" fill="#fdfbf7" stroke="#e5e5e5" strokeWidth="1" />
      <rect x="10" y="10" width="80" height="80" fill="#1a1a1a" />
      <polygon points="10,10 90,10 10,90" fill="rgba(255,255,255,0.05)" />
      <text x="50" y="105" fontFamily="'Cormorant Garamond', serif" fontSize="10" textAnchor="middle" fill="#666" fontStyle="italic" opacity="0.6">Captured</text>
    </motion.svg>
  );
}
''',
    'Cassette.tsx': '''"use client";
import { motion } from "framer-motion";
export function Cassette({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 64" className="w-full h-full drop-shadow-lg" animate={{ y: !isSleeping && Math.abs(velocityY) > 8 ? [-2, 0] : 0 }} transition={{ type: "spring", stiffness: 300 }}>
      <rect x="2" y="2" width="96" height="60" rx="4" fill="#2a2a2a" stroke="#111" strokeWidth="1" />
      <rect x="10" y="10" width="80" height="30" rx="2" fill="#dfd9c2" />
      <circle cx="30" cy="25" r="8" fill="#111" />
      <circle cx="70" cy="25" r="8" fill="#111" />
      <path d="M 30 25 L 70 25" stroke="#444" strokeWidth="2" />
      <polygon points="20,62 80,62 75,50 25,50" fill="#1a1a1a" />
      <text x="50" y="20" fontFamily="'Inter', sans-serif" fontSize="6" textAnchor="middle" fill="#882222" fontWeight="bold">MIX TAPE</text>
    </motion.svg>
  );
}
''',
    'Letter.tsx': '''"use client";
import { motion } from "framer-motion";
export function Letter({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 60" className="w-full h-full drop-shadow-md">
      <rect x="2" y="2" width="96" height="56" fill="#f4f1e1" stroke="#d3cec4" strokeWidth="1" />
      <path d="M 2 2 L 50 35 L 98 2" fill="none" stroke="#d3cec4" strokeWidth="1.5" />
      <path d="M 2 58 L 40 30 M 98 58 L 60 30" fill="none" stroke="#d3cec4" strokeWidth="1" />
      <rect x="80" y="5" width="12" height="15" fill="#e5e5e5" stroke="#ccc" strokeWidth="0.5" strokeDasharray="1 1" />
      <circle cx="86" cy="12.5" r="4" fill="#c95050" opacity="0.8" />
    </motion.svg>
  );
}
''',
    'OrigamiStar.tsx': '''"use client";
import { motion } from "framer-motion";
export function OrigamiStar({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm" animate={{ filter: !isSleeping ? "drop-shadow(0px 0px 8px rgba(253, 224, 71, 0.8))" : "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" }}>
      <polygon points="50,5 61,35 95,35 68,54 78,85 50,65 22,85 32,54 5,35 39,35" fill="#fef08a" stroke="#eab308" strokeWidth="1" strokeLinejoin="round" />
      <path d="M 50 5 L 50 65 M 50 65 L 95 35 M 50 65 L 5 35 M 50 65 L 78 85 M 50 65 L 22 85" stroke="#ca8a04" strokeWidth="0.5" opacity="0.5" />
    </motion.svg>
  );
}
''',
    'Postcard.tsx': '''"use client";
import { motion } from "framer-motion";
export function Postcard({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 120 80" className="w-full h-full drop-shadow-md">
      <rect x="2" y="2" width="116" height="76" rx="2" fill="#faf8f0" stroke="#e0dcd0" strokeWidth="1" />
      <line x1="60" y1="10" x2="60" y2="70" stroke="#d3cec4" strokeWidth="1" />
      <rect x="8" y="10" width="45" height="60" fill="#e8e4d9" />
      <line x1="65" y1="30" x2="110" y2="30" stroke="#d3cec4" strokeWidth="0.5" />
      <line x1="65" y1="45" x2="110" y2="45" stroke="#d3cec4" strokeWidth="0.5" />
      <line x1="65" y1="60" x2="110" y2="60" stroke="#d3cec4" strokeWidth="0.5" />
      <rect x="95" y="8" width="15" height="18" fill="#c95050" opacity="0.8" />
    </motion.svg>
  );
}
''',
    'GlowingNote.tsx': '''"use client";
import { motion } from "framer-motion";
export function GlowingNote({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 80 60" className="w-full h-full" animate={{ y: !isSleeping ? [0, -5, 0] : 0, filter: "drop-shadow(0px 0px 10px rgba(252, 165, 165, 0.6))" }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
      <path d="M 10 10 Q 40 5 70 15 Q 75 30 70 50 Q 40 55 10 45 Q 5 30 10 10" fill="#fecaca" opacity="0.9" />
      <text x="40" y="32" fontFamily="'Cormorant Garamond', serif" fontSize="14" textAnchor="middle" fill="#991b1b" opacity="0.7">Thankful</text>
    </motion.svg>
  );
}
''',
    'WaxSealDoc.tsx': '''"use client";
import { motion } from "framer-motion";
export function WaxSealDoc({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 80 100" className="w-full h-full drop-shadow-lg">
      <rect x="10" y="5" width="60" height="90" rx="2" fill="#fdfbf7" stroke="#e5e5e5" strokeWidth="1" />
      <rect x="8" y="3" width="64" height="94" rx="1" fill="none" stroke="#f4f1e1" strokeWidth="2" />
      <rect x="5" y="45" width="70" height="10" fill="#991b1b" />
      <circle cx="40" cy="50" r="12" fill="#7f1d1d" />
      <circle cx="40" cy="50" r="10" fill="#991b1b" />
      <path d="M 33 43 A 8 8 0 0 1 45 43" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
    </motion.svg>
  );
}
''',
    'TinySlip.tsx': '''"use client";
import { motion } from "framer-motion";
export function TinySlip({ velocityY, isSleeping }: { velocityY: number, isSleeping: boolean }) {
  return (
    <motion.svg viewBox="0 0 60 40" className="w-full h-full drop-shadow-sm" animate={{ rotate: !isSleeping ? [0, 5, 0] : 0 }}>
      <polygon points="5,5 55,2 58,35 2,38" fill="#fefce8" stroke="#fef08a" strokeWidth="1" />
      <line x1="10" y1="15" x2="50" y2="13" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="10" y1="25" x2="40" y2="23" stroke="#cbd5e1" strokeWidth="1" />
    </motion.svg>
  );
}
'''
}

for name, content in svgs.items():
    with open(os.path.join(dir_path, name), 'w') as f:
        f.write(content)

print('Created all SVGs')
