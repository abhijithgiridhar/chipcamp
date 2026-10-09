/* Characters for the slide decks. Anything without a drawing falls back to a big emoji. */
(function (root) {
  'use strict';
  const svg = (inner) => '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' + inner + '</svg>';
  const ART = {
    chipbot: svg(
      '<ellipse cx="100" cy="188" rx="56" ry="8" fill="#000" opacity=".12"/>' +
      '<rect x="62" y="140" width="26" height="40" rx="10" fill="#1e8e80"/><rect x="112" y="140" width="26" height="40" rx="10" fill="#1e8e80"/>' +
      '<rect x="46" y="48" width="108" height="100" rx="32" fill="#2bb3a3" stroke="#17756a" stroke-width="7"/>' +
      '<circle cx="78" cy="88" r="17" fill="#fff" stroke="#17756a" stroke-width="5"/><circle cx="122" cy="88" r="17" fill="#fff" stroke="#17756a" stroke-width="5"/>' +
      '<circle cx="82" cy="90" r="7" fill="#17302d"/><circle cx="118" cy="90" r="7" fill="#17302d"/>' +
      '<path d="M82 120 Q100 136 118 120" stroke="#17756a" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<rect x="92" y="28" width="16" height="22" rx="6" fill="#17756a"/><circle cx="100" cy="24" r="9" fill="#ffd93b" stroke="#e0a800" stroke-width="4"/>'),
    peeko: svg(
      '<ellipse cx="100" cy="188" rx="64" ry="8" fill="#000" opacity=".12"/>' +
      '<rect x="92" y="14" width="16" height="30" rx="6" fill="#d94c40"/><circle cx="100" cy="18" r="13" fill="#ffd93b" stroke="#e0a800" stroke-width="5"/>' +
      '<rect x="26" y="42" width="148" height="130" rx="46" fill="#ff6b5e" stroke="#d94c40" stroke-width="8"/>' +
      '<rect x="48" y="66" width="104" height="80" rx="20" fill="#050b14" stroke="#1b2236" stroke-width="6"/>' +
      '<circle cx="78" cy="102" r="12" fill="#e8f6ff"/><circle cx="122" cy="102" r="12" fill="#e8f6ff"/>'),
    jarvis: svg(
      '<ellipse cx="100" cy="188" rx="60" ry="8" fill="#000" opacity=".12"/>' +
      '<rect x="40" y="68" width="120" height="112" rx="26" fill="#e6f6ff" fill-opacity=".8" stroke="#9cc4e4" stroke-width="7"/>' +
      '<rect x="46" y="138" width="108" height="36" rx="14" fill="#8a5a2b"/>' +
      '<path d="M100 140 C100 118 100 104 100 90" stroke="#3aa85c" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="82" cy="104" rx="20" ry="9" fill="#43c06b"/><ellipse cx="120" cy="98" rx="20" ry="9" fill="#43c06b"/><ellipse cx="100" cy="82" rx="9" ry="16" fill="#4fd079"/>' +
      '<circle cx="166" cy="40" r="15" fill="#ffd93b" stroke="#fff" stroke-width="5"/><circle cx="166" cy="40" r="26" fill="#ffd93b" opacity=".25"/>'),
    bug: svg(
      '<ellipse cx="100" cy="186" rx="50" ry="7" fill="#000" opacity=".12"/>' +
      '<g stroke="#2d6a35" stroke-width="7" stroke-linecap="round"><path d="M64 100 L36 84M64 122 L32 124M68 144 L42 164M136 100 L164 84M136 122 L168 124M132 144 L158 164"/><path d="M84 52 L70 26M116 52 L130 26"/></g>' +
      '<ellipse cx="100" cy="126" rx="48" ry="52" fill="#59c059" stroke="#2d6a35" stroke-width="7"/>' +
      '<path d="M100 76 V178" stroke="#2d6a35" stroke-width="5"/><circle cx="80" cy="118" r="8" fill="#2d6a35"/><circle cx="120" cy="140" r="8" fill="#2d6a35"/><circle cx="82" cy="152" r="6" fill="#2d6a35"/>' +
      '<circle cx="100" cy="62" r="28" fill="#59c059" stroke="#2d6a35" stroke-width="7"/><circle cx="90" cy="58" r="8" fill="#fff"/><circle cx="110" cy="58" r="8" fill="#fff"/><circle cx="91" cy="60" r="4" fill="#17302d"/><circle cx="109" cy="60" r="4" fill="#17302d"/>'),
    dad: svg(
      '<ellipse cx="100" cy="188" rx="58" ry="8" fill="#000" opacity=".12"/>' +
      '<path d="M44 190 Q44 140 100 140 Q156 140 156 190Z" fill="#4C97FF"/>' +
      '<circle cx="100" cy="88" r="52" fill="#f6c9a0" stroke="#c98f5f" stroke-width="6"/>' +
      '<path d="M54 74 Q60 34 100 34 Q140 34 146 74 Q124 52 100 52 Q76 52 54 74Z" fill="#4a3426"/>' +
      '<circle cx="78" cy="88" r="14" fill="#fff" stroke="#2b2f4a" stroke-width="5"/><circle cx="122" cy="88" r="14" fill="#fff" stroke="#2b2f4a" stroke-width="5"/><path d="M92 88 H108" stroke="#2b2f4a" stroke-width="5"/>' +
      '<circle cx="78" cy="89" r="4" fill="#2b2f4a"/><circle cx="122" cy="89" r="4" fill="#2b2f4a"/>' +
      '<path d="M72 114 Q100 100 128 114 Q100 126 72 114Z" fill="#4a3426"/><path d="M90 128 H110" stroke="#c98f5f" stroke-width="5" stroke-linecap="round"/>'),
    chip: svg(
      '<g stroke="#b9bdd6" stroke-width="9" stroke-linecap="round"><path d="M70 30V12M100 30V12M130 30V12M70 170v18M100 170v18M130 170v18M30 70H12M30 100H12M30 130H12M170 70h18M170 100h18M170 130h18"/></g>' +
      '<rect x="30" y="30" width="140" height="140" rx="22" fill="#7c4dff" stroke="#4b2fc4" stroke-width="7"/>' +
      '<circle cx="78" cy="92" r="13" fill="#fff"/><circle cx="122" cy="92" r="13" fill="#fff"/><circle cx="80" cy="94" r="6" fill="#2b2f4a"/><circle cx="120" cy="94" r="6" fill="#2b2f4a"/>' +
      '<path d="M78 124 Q100 142 122 124" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>')
  };
  const EMOJI = { sandwich: '🥪', plant: '🌱', brain: '🧠', camera: '📸', spark: '⚡', party: '🎉', body: '🦴', nerve: '⚡' };
  root.CampArt = {
    html(key, cls) {
      if (ART[key]) return '<div class="art ' + (cls || '') + '">' + ART[key] + '</div>';
      return '<div class="art emoji ' + (cls || '') + '" aria-hidden="true">' + (EMOJI[key] || '⭐') + '</div>';
    },
    emoji(key) { return EMOJI[key] || { chipbot: '🤖', peeko: '👀', jarvis: '🌱', bug: '🐛', dad: '👨', chip: '💾' }[key] || '⭐'; }
  };
})(typeof self !== 'undefined' ? self : this);
