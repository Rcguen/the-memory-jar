"use client";

import { useEffect, useRef, useState } from 'react';
import "./animated-cards.css";

type Letter = { id: string; title: string; label: string; color: string; accent: string; stamp: string; stampFile: string; text: string; paragraphs?: string[]; hideSignature?: boolean };

const LETTERS: Letter[] = [
  { id: '01', label: 'LETTER 01', title: 'For my sweet flower', color: '#e7d2b5', accent: '#9c624c', stamp: '☼', stampFile: 'stamp-emancipation.jpg', text: 'Happy one month anniversary, my sweet flower.', hideSignature: true, paragraphs: [
    "Hello honey, happy one month anniversary baby mahwwhh, thank for write me a letter, I'm not good at writing a letter but I want to write for my flower a letter on our first anniversary too,xiiix if there something I say wrong sorry my baby mawhwh it my first time I write a letter 😚💕",
    'First time I meet you i never expect that we will been together this long. At that time I just thought I should help you and now we are here together hihihi ,and I really happy that you have spend your time playing with me talk with me I really happy every sec we play together.',
    'Thank for love me honey,the first time you confess to me I was just so happy and I think I will stay with my baby for a long time honey still this day I still think that I have choose right mahwhwhh🥰😚.',
    'One more time honey thank for everything you do to me I\'m very to have you stay with me in this life I hope we will stay strong together and hold each other hand for a long time baby mahwhw,thank again for everything you do to me every pic we share together every moment I have you I keep it safe all in my heart I love you selene 💋🫂🫂💋🫂💋',
    'From Phú',
    'To my flower i love you baby from the deep of my heart i love you honey ❤️‍🔥🤭😘🤭❤️‍🔥💗💗🫂💗💋💗💋💗💋💗💋💋💋🤭😘🤭🤭😘🤭😘🤭😘🤭😘',
    'P/s: first time I write a letter so it a bit short but this is my true feeling honey'
  ] },
  { id: '02', label: 'LETTER 02', title: 'Happy 2-Month Anniversary, Selene', color: '#ddd2c8', accent: '#80655b', stamp: '✦', stampFile: 'stamp-1894.jpg', text: 'Happy 2-month anniversary, my dearest love.', hideSignature: true, paragraphs: [
    'My dearest love,\n\nHappy 2-month anniversary Selene! Today is a very special day, and I want to take a moment to write this letter to you mawhwh💓💕💓💕💋💕💋.',
    'It feels like time goes by so fast when I am with you. These past two months have been so wonderful, and I just want to say that my feelings for you only grow stronger every day. Every morning when I wake up, I feel so lucky because I have you by my side 💗💕💕💗💕💓🫂💓🫂💓🫂💓love you so much Honey 💋💋🫂💋🫂💋🫂.',
    'I really love the simple things we do together. I love talking to you, and just looking at your beautiful smile. You always know how to make me feel better after a long, tiring day. Thank you for your kindness, your patience, and your warm hugs. Thank you for accepting me just the way I am🫂🫂🫂🫂🫂🫂.',
    'Two months is just the beginning of our beautiful story. I know life is not always easy or perfect, but as long as we hold hands, I believe we can get through anything together. I promise to always listen to you, take care of you, and be your best friend. I want to build a beautiful future and make many more happy memories with you 🫂🫂🫂🫂💋💗💋💗💋💗💋💕.',
    'Thank you for being my amazing girlfriend. Happy 2 months of love, my baby.\nI love you more than words can say.',
    'Forever yours,\nFrom phú with all my love mahwhw💓💋💓💋💋🫂🫂💋💋💋💋,love you so much honey always be with you amhwhw mahwhw 🫂💕🫂💕🫂💕💕🫂.'
  ] },
  { id: '03', label: 'LETTER 03', title: 'Happy 3-Month Anniversary', color: '#d1d8ca', accent: '#5d776a', stamp: '♡', stampFile: 'stamp-british-1883.jpg', text: 'To my beautiful Kristine, I love you so much.', paragraphs: [
    'June 04, 2026\n\nHappy 3-Month Anniversary\nTo my beautiful Kristine,',
    'Today, I wanted to write something a little different for you. When I look back at the last 90 days, I just smile. It is amazing how much my world has changed since you came into it.',
    'Before you, my days were just normal routines. Now, you are the favorite part of my everyday life. We are building our story day by day, step by step, and every new memory we make together is so precious to me.',
    'I love how comfortable I feel with you. I love our long talks, our silly jokes, and the quiet moments when we just sit next to each other. You have this sweet way of making everything feel warm and safe. Whenever I am tired, just seeing your smile makes everything better. You are so kind, so caring, and so patient with me. Knowing that I have you by my side gives me so much strength.',
    'Three months down, and we have so many more to go. I am so excited to keep creating beautiful things and happy memories with you. I promise to always be the man who holds your hand, listens to your heart, and makes you feel loved every single day.',
    'Thank you for being you, Kristine. I love you so much.'
  ] },
  { id: '04', label: 'LETTER 04', title: 'Happy 4th Monthsary', color: '#e6d9ae', accent: '#90743e', stamp: '☆', stampFile: 'stamp-franklin-1847.jpg', text: 'To my beautiful Kristine, with all my love.', paragraphs: [
    'July 1st, 2026\n\n4 month anniversary\nSa aking napakagandang Kristine,😘🤭🫂🫂💚💚💚',
    'Happy 4th monthsary, mahal ko! Hindi ako makapaniwala na 120 araw na ang lumipas, pero araw-araw kasama ka ay parang mahika.',
    "Sa totoo lang, mas lalo akong nahuhulog sa'yo bawat segundo. Tuwing tinitingnan ko ang iyong magagandang mata, bumibilis ang tibok ng puso ko. Kapag niyayakap kita nang mahigpit, parang humihinto ang buong mundo. Gustong-gusto ko kung paano bumabagay ang kamay mo sa kamay ko. Mahal ko ang iyong matatamis na halik, maiinit na yakap, at ang malambing mong boses.",
    "Ikaw ang pinakamagandang nangyari sa buhay ko. Gusto kong ibigay ang buong puso ko sa paggawa ng mga espesyal na bagay para sa'yo, dahil ang makita ang iyong ngiti ang pinakamalaking gantimpala para sa akin. Ikaw ang aking inspirasyon, ang pinakamatamis na musika sa buhay ko, at ang babae sa aking mga pangarap. Ang makasama ka ay nagpaparamdam sa akin na buhay na buhay ako.🫪🫪🫂🫂🫪🫂💚💚💚💚",
    "Ang apat na buwan ay isang maliit na kabanata lamang sa ating walang hanggang kwento ng pag-ibig. Pangako na palagi kitang yayakapin nang mahigpit, hahalikan bago matulog, at ibibigay sa'yo ang lahat ng pagmamahal na nararapat sa'yo. Gusto kong gumising sa tabi mo at iparamdam sa'yo na isa kang prinsesa araw-araw.",
    'Ako ay buong-buong sa\'yo, katawan at kaluluwa. Mahal na mahal kita, Kristine.',
    'Magpakailanman,\nNguyễn Thành phú, nahigugma ko nimo Kristine 🫂💚💚💚💚💚'
  ] },
  { id: '05', label: 'LETTER 05', title: 'Happy 5-Month Anniversary', color: '#cbd1d8', accent: '#5c6c80', stamp: '∞', stampFile: 'stamp-1894.jpg', text: 'To my beautiful HamHam, with all my love.', paragraphs: [
    'August 3rd, 2026\n\nTo my beautiful HamHam',
    'Happy 5-month anniversary, my love! Today marks exactly 150 days of us being together, and I wanted to write a letter to tell you everything that is inside my heart. I want this to be very real and simple, just like the beautiful love we share.',
    'Sometimes, my days get so busy and stressful. When I spend hours looking at my computer screen, trying to finish my work and fix my projects, my head feels so heavy. But then I get to see your face or hear your voice, and suddenly, everything is okay again. My mind is at peace. You always know how to make me smile, even on my hardest days.',
    'I love our simple moments the most. I love it when we just sit next to each other, playing some chill indie songs in the background, watching the city traffic, and talking about our day. Even when the weather outside is raining or too hot, just being inside your arms makes everything perfect.',
    'I always like to build things carefully, step by step. And that is exactly how I feel about us. We are building our story day by day, understanding each other a little more, and loving each other a little deeper. Thank you for seeing the real me—the tired me, the quiet me—and still choosing to love me so much. Thank you for your warm hugs and your endless patience.',
    'Five months is just the start, but I know I want you in my life for a very long time. I want to keep holding your hand through all the good days and the bad days ahead. I will always be here to listen to you, care for you, and protect you.',
    'I love you so much, my lovely wife. Happy anniversary.',
    'And one more thing, thank for alway stay with me understand me you make me happy a lot thank for coming to my live, my lovely hamham i love you',
    'Yours always,\nyour bunbun'
  ] },
  { id: '06', label: 'LETTER 06', title: 'Happy 6-Month Anniversary', color: '#d8c8bd', accent: '#8d6655', stamp: '☾', stampFile: 'stamp-emancipation.jpg', text: 'To my dearest Kristine, with all my love.', paragraphs: [
    'To my dearest Kristine,💞🌹💞🫂💞🫂',
    'Happy 6-month anniversary! 🫂💞🫂😍🫂😍💞🫂Today is a huge milestone for us—half a year of being together! I honestly cannot believe it has been 180 days already. Time really does fly when I am with you.',
    'I want to use this special day to look back at our journey. When I think about the last six months, my heart feels so full. We have shared so many beautiful moments, so many laughs, and so many sweet conversations. Every memory we make together feels like a precious photograph that I want to keep safe in my mind forever. Before I met you, I did not know that love could feel this happy and this easy.',
    'You have changed my life in the most wonderful way. You are not just my girlfriend; you are my favorite person in the whole world. I love how we can just look at each other and start smiling. I love how you listen to my stories, and how you always know exactly what to say to make me feel special. You bring so much sunshine and joy into my everyday life.',
    'Half a year is a beautiful chapter, but I know our story is still very long🫂🫂🫂. If these first six months were this amazing, I cannot wait to see what our future holds. I promise to keep filling our days with love, to take good care of you, and to build even more beautiful memories with you.🫂🫂🫂',
    'Thank you for the best six months of my life. I love you more than words can say.',
    'Forever yours,\nNguyễn Thành phú 😍🌹🌹🌹'
  ] },
  { id: '07', label: 'LETTER 07', title: 'Happy 7-Month Anniversary', color: '#d5d8c1', accent: '#65724f', stamp: '❀', stampFile: 'stamp-british-1883.jpg', text: 'My dearest love, my hamham, my Kristine.', paragraphs: [
    'My dearest love, my hamham, my Kristine 💓🥰💓🥰',
    'Happy 7-month anniversary to us! Today is a very special day, so I want to write a letter to tell you how much you mean to me. I cannot believe it has already been 215 days since we started this beautiful journey together. Time goes by so fast when I am happy.',
    'These past seven months have been the best time of my life. Before I had you, my days were just normal. But now, you bring so much color and joy into my world. We have shared so many smiles, stories, and sweet moments. I feel like I understand you so much more now. And the more I know you, the more I fall in love with you. From my deepest love, I\'m really thankful that the world brought you to me 🥰💋💋🥰🫂.',
    'I love all the little things about you. I love the way your eyes shine when you laugh. I love the way you talk to me after a long day. You are not just my girlfriend; you are my safe place that I want to stay with after a tired day. Every moment we spend together feels like a beautiful movie. I always want to create wonderful things just for you, to give you the best surprises and see your happy smile.',
    'Thank you for always being by my side. Thank you for supporting me, for holding my hand, and for accepting me just the way I am. Life is not always easy, but with you, I feel strong enough to do anything. You give me so much energy and peace.',
    'Seven months is a beautiful milestone, but it is still just the beginning of our story. I am so excited for all the days, months, and years ahead of us. I promise to always listen to you, take care of you, and love you even more than yesterday.',
    'Happy 7 months of love, my beautiful girl. I love you to the moon and back, and where you go I\'ll follow you. I love you, my baby 🫂💋💋🫂💋🫂💓🥰💓🥰',
    'Forever yours,\nNguyễn Thành phú — the man that loves you so much'
  ] },
  { id: '08', label: 'LETTER 08', title: 'Happy 8-Month Anniversary', color: '#e4d4aa', accent: '#a17332', stamp: '✧', stampFile: 'stamp-franklin-1847.jpg', text: 'My beautiful Kristine, with all my heart.', paragraphs: [
    'My beautiful Kristine,',
    'Happy 8-month anniversary, my love! Time is moving so fast, but my love for you is growing even faster.',
    'Eight months is not a lifetime, but in this short time, you have become the most important part of my life. Every day I spend with you is a beautiful gift. I still remember our very first days, and looking at us now, I am so happy and proud of how far we have come together.',
    'You are my happy place. When the world outside is noisy and tiring, your voice is my favorite song, and your arms are my favorite home. I love our late-night messages, our sweet kisses, and the warm way you look at me. You make me want to be a better man for you. You give me so much peace and so much strength to do anything.',
    'Thank you for loving me, for taking care of me, and for always staying by my side. I promise to keep making you smile, to hold your hand through every problem, and to love you more today than I did yesterday.',
    'Happy 8 months, my sweet baby. I love you with all my heart.',
    'Yours always,\nNguyễn Thành phú'
  ] },
];

const SPARKLES = [
  [8, 18, 8, 0], [17, 72, 5, 1.4], [27, 28, 4, 2.2], [38, 12, 6, .8], [52, 78, 5, 2.8], [64, 20, 9, 1.1], [76, 68, 5, 3.1], [88, 24, 7, 1.8], [94, 82, 4, .4], [12, 47, 3, 2.5], [31, 88, 7, 1.7], [47, 29, 3, .2], [72, 89, 8, 2.3], [83, 43, 3, 1.2], [58, 8, 4, 3.4], [4, 88, 5, 2], [97, 52, 7, 1.5], [23, 8, 3, .6],
];

function EnvelopeFace({ letter, back = false }: { letter: Letter; back?: boolean }) {
  if (back) return <div className="letter-face back-face" style={{ '--accent': letter.accent } as React.CSSProperties}><div className="back-header">{letter.label}<span>{letter.id}</span></div><div className="back-rule" /><h2>{letter.title}</h2><p>{letter.text}</p><div className="back-sign">With love,<br /><em>Phú</em></div></div>;
  return <div className="letter-face envelope-face" style={{ '--paper': letter.color, '--accent': letter.accent } as React.CSSProperties}><div className="envelope-paper" /><img className="postage-stamp" src={`/stamps/${letter.stampFile}`} alt="Vintage postage stamp" /><div className="envelope-fold left" /><div className="envelope-fold right" /><div className="envelope-fold bottom" /><div className="envelope-flap" /><div className="envelope-address"><span>To Kristine Ann Flores,</span><strong>{letter.title}</strong></div><div className="seal">{letter.id}</div><div className="envelope-label">{letter.label}</div></div>;
}

export function AnimatedLettersExperience() {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]); const progress = useRef(0); const targetProgress = useRef<number | null>(null); const velocity = useRef(0); const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 }); const frame = useRef(0);
  const [size, setSize] = useState({ w: 335, h: 212 }); const [reading, setReading] = useState<Letter | null>(null);

  useEffect(() => {
    const resize = () => { const w = Math.min(350, Math.max(210, Math.round(window.innerWidth * .18 + 125))); setSize({ w, h: Math.round(w / 1.58) }); };
    const move = (e: MouseEvent) => { mouse.current.tx = Math.max(-1, Math.min(1, (e.clientX - innerWidth / 2) / (innerWidth / 2))); mouse.current.ty = Math.max(-1, Math.min(1, (e.clientY - innerHeight / 2) / (innerHeight / 2))); };
    const leave = () => { mouse.current.tx = 0; mouse.current.ty = 0; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); velocity.current = Math.max(-.065, Math.min(.065, velocity.current + e.deltaY * .00045)); };
    let touchStartY = 0;
    const touchStart = (e: TouchEvent) => { touchStartY = e.changedTouches[0]?.clientY ?? 0; };
    const touchEnd = (e: TouchEvent) => { const endY = e.changedTouches[0]?.clientY ?? touchStartY; const swipeDistance = touchStartY - endY; if (Math.abs(swipeDistance) < 35) return; velocity.current = Math.max(-.08, Math.min(.08, velocity.current + Math.sign(swipeDistance) * .035)); };
    window.addEventListener('resize', resize); window.addEventListener('mousemove', move); document.addEventListener('mouseleave', leave); window.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('touchstart', touchStart, { passive: true }); window.addEventListener('touchend', touchEnd, { passive: true }); resize();
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('mousemove', move); document.removeEventListener('mouseleave', leave); window.removeEventListener('wheel', wheel); window.removeEventListener('touchstart', touchStart); window.removeEventListener('touchend', touchEnd); };
  }, []);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => { const dt = Math.min((now - last) / 1000, .06); last = now; const scale = dt * 60; const target = targetProgress.current; if (target === null) { velocity.current *= Math.pow(.92, scale); progress.current += (.00042 + velocity.current) * scale; } else { const distance = target - progress.current; progress.current += distance * Math.min(1, .025 * scale); velocity.current = 0; if (Math.abs(distance) < .004) { progress.current = target; targetProgress.current = null; } } mouse.current.x += (mouse.current.tx - mouse.current.x) * (1 - Math.pow(.08, scale)); mouse.current.y += (mouse.current.ty - mouse.current.y) * (1 - Math.pow(.08, scale));
      const active = Math.round(progress.current); const diff = progress.current - active; const virtual = active + Math.sign(diff) * Math.pow(Math.abs(diff) * 2, 4.2) / 2; const half = LETTERS.length / 2;
      itemRefs.current.forEach((item, i) => { if (!item) return; let offset = i - virtual; while (offset > half) offset -= LETTERS.length; while (offset < -half) offset += LETTERS.length; const a = Math.abs(offset); const sign = Math.sign(offset); if (a > 3) { item.style.visibility = 'hidden'; return; } item.style.visibility = 'visible'; const gap = 34, D = 1350, h = innerHeight; let y = 0, z = 0, rot = 0;
        if (a <= 1) { const t = a * a * (3 - 2 * a); y = -sign * t * (size.h + gap); z = 420 - t * 190; rot = t * 132; } else if (a <= 2) { const t = (a - 1) ** 2 * (3 - 2 * (a - 1)); const end = (h / 2 + 55) / (D / (D + 60)) - size.h / 2; y = -sign * (size.h + gap + t * (end - size.h - gap)); z = 230 - t * 290; rot = 132 + t * 43; } else { const t = Math.min(a - 2, 1); const end1 = (h / 2 + 55) / (D / (D + 60)) - size.h / 2; const end2 = (h / 2 + 110) / (D / (D + 250)) + size.h / 2; y = -sign * (end1 + t * (end2 - end1)); z = -60 - t * 190; rot = 175 + t * 20; }
        const center = Math.max(0, 1 - a); item.style.zIndex = String(Math.round(z)); item.style.transform = `translateY(${y.toFixed(1)}px) translateZ(${z.toFixed(1)}px) rotateX(${(-sign * rot - mouse.current.y * 12 * center).toFixed(1)}deg) rotateY(${(mouse.current.x * 15 * center).toFixed(1)}deg) rotateZ(-3deg)`;
      }); frame.current = requestAnimationFrame(tick); };
    frame.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame.current);
  }, [size]);

  const handleLetterClick = (index: number, letter: Letter) => {
    const current = Math.round(progress.current);
    let delta = index - current;
    const half = LETTERS.length / 2;
    while (delta > half) delta -= LETTERS.length;
    while (delta < -half) delta += LETTERS.length;
    if (Math.abs(delta) < 0.5 && targetProgress.current === null) setReading(letter);
    else targetProgress.current = current + delta;
  };

  return <main className="carousel-page"><div className="sparkle-field" aria-hidden="true">{SPARKLES.map(([left, top, size, delay], index) => <span key={index} className="sparkle" style={{ left: `${left}%`, top: `${top}%`, width: `${size}px`, height: `${size}px`, animationDelay: `${delay}s` }} />)}</div><div className="carousel-perspective"><div className="carousel-stage" style={{ width: size.w, height: size.h }}>{LETTERS.map((letter, i) => <button key={letter.id} ref={(el) => { itemRefs.current[i] = el; }} className={`carousel-item ${letter.id === '08' ? 'special-envelope' : ''}`} style={{ width: size.w, height: size.h }} onClick={() => handleLetterClick(i, letter)} aria-label={`Open ${letter.title}`}>{letter.id === '08' && <div className="special-glow" aria-hidden="true" />}<div className="envelope-thickness" style={{ '--edge': letter.color } as React.CSSProperties} /> <EnvelopeFace letter={letter} /><EnvelopeFace letter={letter} back /></button>)}</div></div><div className="carousel-hint"><span>Scroll or swipe</span><b aria-hidden="true">·</b><span>Choose a letter</span></div><div className="carousel-title"><small>PRIVATE CORRESPONDENCE · 2026</small><h1>Letters<br /><em>in motion</em></h1></div>{reading && <div className="reading-overlay" onClick={() => setReading(null)}><article className={`reading-letter ${reading.paragraphs ? 'long-letter' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="reading-title" style={{ '--accent': reading.color } as React.CSSProperties}><button onClick={() => setReading(null)} className="reading-close" aria-label="Close letter">×</button><div className="reading-stamp">{reading.id}</div><small>{reading.label} · PRIVATE CORRESPONDENCE</small><h2 id="reading-title">{reading.title}</h2><div className="reading-line" /><div className="reading-body">{(reading.paragraphs ?? [reading.text]).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><div className="reading-sign">With love,<br /><em>Phú</em></div></article></div>}</main>;
}


