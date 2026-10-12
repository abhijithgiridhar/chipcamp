/* Characters and brush strokes for the slide decks. */
(function (root) {
  'use strict';
  const svg = (inner, vb) => '<svg viewBox="' + (vb || '0 0 240 240') + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' + inner + '</svg>';
  const shadow = (cx, cy, rx) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="9" fill="#2c2c34" opacity=".13"/>';
  const cheeks = (x1, x2, y, c) => '<circle cx="' + x1 + '" cy="' + y + '" r="9" fill="' + (c || '#ff8fa3') + '" opacity=".55"/><circle cx="' + x2 + '" cy="' + y + '" r="9" fill="' + (c || '#ff8fa3') + '" opacity=".55"/>';

  const ART = {
    chipbot: svg(
      shadow(120, 228, 66) +
      '<rect x="72" y="168" width="32" height="50" rx="14" fill="#1e8e80"/><rect x="136" y="168" width="32" height="50" rx="14" fill="#1e8e80"/>' +
      '<ellipse cx="86" cy="220" rx="26" ry="9" fill="#17756a"/><ellipse cx="154" cy="220" rx="26" ry="9" fill="#17756a"/>' +
      '<rect x="40" y="108" width="22" height="46" rx="11" fill="#1e8e80" transform="rotate(14 51 108)"/><rect x="178" y="108" width="22" height="46" rx="11" fill="#1e8e80" transform="rotate(-14 189 108)"/>' +
      '<rect x="54" y="58" width="132" height="120" rx="40" fill="#2bb3a3"/>' +
      '<path d="M62 150 Q120 190 178 150 L178 138 Q120 174 62 138Z" fill="#17756a" opacity=".22"/>' +
      '<rect x="68" y="76" width="104" height="66" rx="30" fill="#f4fffd"/>' +
      '<circle cx="100" cy="106" r="17" fill="#fff" stroke="#17756a" stroke-width="5"/><circle cx="140" cy="106" r="17" fill="#fff" stroke="#17756a" stroke-width="5"/>' +
      '<circle cx="104" cy="108" r="8" fill="#17302d"/><circle cx="136" cy="108" r="8" fill="#17302d"/><circle cx="107" cy="104" r="3" fill="#fff"/><circle cx="139" cy="104" r="3" fill="#fff"/>' +
      cheeks(82, 158, 130) + '<path d="M106 130 Q120 142 134 130" stroke="#17756a" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<rect x="112" y="30" width="16" height="30" rx="7" fill="#17756a"/><circle cx="120" cy="28" r="12" fill="#fdb515" stroke="#d99700" stroke-width="5"/>'),
    peeko: svg(
      shadow(120, 228, 70) +
      '<rect x="100" y="188" width="40" height="34" rx="10" fill="#d94c40"/>' +
      '<rect x="112" y="18" width="16" height="36" rx="7" fill="#d94c40"/><circle cx="120" cy="20" r="14" fill="#fdb515" stroke="#d99700" stroke-width="5"/>' +
      '<rect x="14" y="96" width="24" height="52" rx="12" fill="#d94c40"/><rect x="202" y="96" width="24" height="52" rx="12" fill="#d94c40"/>' +
      '<rect x="28" y="46" width="184" height="148" rx="58" fill="#ff6b5e"/>' +
      '<path d="M40 160 Q120 206 200 160 L200 150 Q120 190 40 150Z" fill="#b73c32" opacity=".25"/>' +
      '<rect x="48" y="68" width="144" height="98" rx="30" fill="#0f1626" stroke="#1b2236" stroke-width="6"/>' +
      '<circle cx="90" cy="112" r="15" fill="#e8f6ff"/><circle cx="150" cy="112" r="15" fill="#e8f6ff"/><circle cx="94" cy="108" r="5" fill="#0f1626"/><circle cx="154" cy="108" r="5" fill="#0f1626"/>' +
      '<path d="M104 142 Q120 154 136 142" stroke="#e8f6ff" stroke-width="5" fill="none" stroke-linecap="round"/>' + cheeks(66, 174, 142, '#ff8fa3')),
    jarvis: svg(
      shadow(120, 228, 72) +
      '<rect x="56" y="98" width="128" height="124" rx="34" fill="#eaf4ff" stroke="#9cc4e4" stroke-width="7"/>' +
      '<rect x="74" y="70" width="92" height="34" rx="12" fill="#8b7fe8" stroke="#5f52c4" stroke-width="5"/>' +
      '<rect x="62" y="172" width="116" height="44" rx="18" fill="#8a5a2b"/><ellipse cx="90" cy="186" rx="9" ry="4" fill="#a97641"/><ellipse cx="150" cy="198" rx="10" ry="4" fill="#a97641"/>' +
      '<path d="M120 100 C120 74 118 56 120 42" stroke="#3aa85c" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="96" cy="48" rx="26" ry="11" fill="#43c06b" transform="rotate(-24 96 48)"/><ellipse cx="146" cy="40" rx="26" ry="11" fill="#4fd079" transform="rotate(22 146 40)"/>' +
      '<circle cx="100" cy="146" r="9" fill="#2b2f4a"/><circle cx="140" cy="146" r="9" fill="#2b2f4a"/><circle cx="103" cy="143" r="3" fill="#fff"/><circle cx="143" cy="143" r="3" fill="#fff"/>' +
      '<path d="M108 158 Q120 168 132 158" stroke="#2b2f4a" stroke-width="5" fill="none" stroke-linecap="round"/>' + cheeks(86, 154, 160) +
      '<circle cx="204" cy="40" r="15" fill="#fdb515" stroke="#fff" stroke-width="5"/><circle cx="204" cy="40" r="28" fill="#fdb515" opacity=".25"/>'),
    bug: svg(
      shadow(120, 226, 58) +
      '<g stroke="#2d6a35" stroke-width="8" stroke-linecap="round" fill="none"><path d="M76 120 L42 100M76 146 L36 148M82 172 L50 196M164 120 L198 100M164 146 L204 148M158 172 L190 196"/><path d="M98 66 L84 34M142 66 L156 34"/></g>' +
      '<circle cx="84" cy="32" r="7" fill="#fdb515"/><circle cx="156" cy="32" r="7" fill="#fdb515"/>' +
      '<ellipse cx="120" cy="150" rx="56" ry="62" fill="#59c059" stroke="#2d6a35" stroke-width="8"/>' +
      '<path d="M120 92 V210" stroke="#2d6a35" stroke-width="6"/><circle cx="94" cy="140" r="10" fill="#2d6a35"/><circle cx="146" cy="168" r="10" fill="#2d6a35"/><circle cx="96" cy="184" r="7" fill="#2d6a35"/>' +
      '<circle cx="120" cy="78" r="34" fill="#59c059" stroke="#2d6a35" stroke-width="8"/><circle cx="106" cy="74" r="11" fill="#fff"/><circle cx="134" cy="74" r="11" fill="#fff"/><circle cx="108" cy="77" r="5" fill="#17302d"/><circle cx="132" cy="77" r="5" fill="#17302d"/>' +
      '<path d="M108 92 Q120 100 132 92" stroke="#2d6a35" stroke-width="5" fill="none" stroke-linecap="round"/>'),
    dad: svg(
      shadow(120, 228, 66) +
      '<path d="M54 232 Q54 170 120 170 Q186 170 186 232Z" fill="#5b5b9f"/><path d="M96 170 L120 200 L144 170Z" fill="#faf8f3"/>' +
      '<rect x="164" y="150" width="62" height="34" rx="12" fill="#e8b96a" stroke="#b9842f" stroke-width="5" transform="rotate(-12 195 167)"/><rect x="168" y="144" width="54" height="12" rx="6" fill="#7bd389" transform="rotate(-12 195 150)"/>' +
      '<circle cx="120" cy="104" r="60" fill="#f2bf92" stroke="#c98f5f" stroke-width="6"/>' +
      '<path d="M62 92 Q66 38 120 38 Q174 38 178 92 Q150 62 120 62 Q90 62 62 92Z" fill="#4a3426"/>' +
      '<circle cx="94" cy="108" r="17" fill="#fff" stroke="#2b2f4a" stroke-width="5"/><circle cx="146" cy="108" r="17" fill="#fff" stroke="#2b2f4a" stroke-width="5"/><path d="M111 108 H129" stroke="#2b2f4a" stroke-width="5"/>' +
      '<circle cx="94" cy="109" r="5" fill="#2b2f4a"/><circle cx="146" cy="109" r="5" fill="#2b2f4a"/>' +
      '<path d="M76 82 L110 78M130 78 L164 74" stroke="#4a3426" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M86 138 Q120 122 154 138 Q120 152 86 138Z" fill="#4a3426"/><path d="M108 156 H132" stroke="#c98f5f" stroke-width="6" stroke-linecap="round"/>'),
    chip: svg(
      '<g stroke="#b9bdd6" stroke-width="10" stroke-linecap="round"><path d="M80 40V14M120 40V14M160 40V14M80 200v26M120 200v26M160 200v26M40 80H14M40 120H14M40 160H14M200 80h26M200 120h26M200 160h26"/></g>' +
      '<rect x="38" y="38" width="164" height="164" rx="26" fill="#5b5b9f"/><rect x="54" y="54" width="132" height="132" rx="16" fill="#6e6eb5"/>' +
      '<circle cx="94" cy="108" r="15" fill="#fff"/><circle cx="146" cy="108" r="15" fill="#fff"/><circle cx="97" cy="110" r="7" fill="#2b2f4a"/><circle cx="143" cy="110" r="7" fill="#2b2f4a"/>' +
      '<path d="M92 146 Q120 168 148 146" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>' + cheeks(76, 164, 140, '#ff8fa3')),
    sandwich: svg(
      shadow(120, 214, 84) +
      '<path d="M32 118 Q32 62 120 62 Q208 62 208 118Z" fill="#e8b96a" stroke="#b9842f" stroke-width="7"/>' +
      '<path d="M24 124 Q50 138 74 124 Q98 138 122 124 Q146 138 170 124 Q194 138 216 124 L216 142 L24 142Z" fill="#7bd389" stroke="#3f9a52" stroke-width="5"/>' +
      '<rect x="30" y="140" width="180" height="22" rx="8" fill="#ff6b5e"/><rect x="26" y="160" width="188" height="20" rx="8" fill="#fdb515"/>' +
      '<path d="M30 176 H210 Q210 206 120 206 Q30 206 30 176Z" fill="#e8b96a" stroke="#b9842f" stroke-width="7"/>' +
      '<circle cx="92" cy="94" r="5" fill="#b9842f"/><circle cx="130" cy="84" r="5" fill="#b9842f"/><circle cx="160" cy="100" r="5" fill="#b9842f"/>'),
    brain: svg(
      shadow(120, 214, 70) +
      '<path d="M120 58 C92 34 50 54 56 92 C32 100 34 142 62 148 C58 178 96 196 120 176 C144 196 182 178 178 148 C206 142 208 100 184 92 C190 54 148 34 120 58Z" fill="#ff9fb3" stroke="#d96b86" stroke-width="7"/>' +
      '<path d="M120 62 V176M84 92 Q100 100 120 96M156 92 Q140 100 120 96M76 138 Q98 132 120 140M164 138 Q142 132 120 140" stroke="#d96b86" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="98" cy="116" r="6" fill="#2b2f4a"/><circle cx="142" cy="116" r="6" fill="#2b2f4a"/>'),
    camera: svg(
      shadow(120, 214, 82) +
      '<rect x="30" y="76" width="180" height="124" rx="30" fill="#5b5b9f"/><rect x="82" y="56" width="76" height="30" rx="12" fill="#5b5b9f"/>' +
      '<circle cx="120" cy="138" r="46" fill="#faf8f3"/><circle cx="120" cy="138" r="34" fill="#2b2f4a"/><circle cx="120" cy="138" r="18" fill="#3b82ff"/><circle cx="112" cy="130" r="6" fill="#fff" opacity=".85"/>' +
      '<circle cx="184" cy="98" r="8" fill="#fdb515"/>'),
    plant: svg(
      shadow(120, 220, 64) +
      '<path d="M78 164 H162 L152 218 H88Z" fill="#e07a4f" stroke="#b9582f" stroke-width="6"/><rect x="72" y="154" width="96" height="20" rx="8" fill="#e98f66" stroke="#b9582f" stroke-width="5"/>' +
      '<path d="M120 156 C120 120 118 98 120 74" stroke="#3aa85c" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="90" cy="96" rx="34" ry="16" fill="#43c06b" transform="rotate(-28 90 96)"/><ellipse cx="152" cy="82" rx="34" ry="16" fill="#4fd079" transform="rotate(26 152 82)"/><ellipse cx="120" cy="60" rx="14" ry="26" fill="#59d985"/>'),
    spark: svg(
      '<path d="M138 16 L66 132 H118 L96 224 L180 100 H128Z" fill="#fdb515" stroke="#d99700" stroke-width="8" stroke-linejoin="round"/>'),
    party: svg(
      shadow(120, 224, 60) +
      '<path d="M62 214 L112 86 L162 174Z" fill="#fdb515" stroke="#d99700" stroke-width="7" stroke-linejoin="round"/><path d="M84 160 L130 140M70 190 L146 166" stroke="#ff6b5e" stroke-width="8" stroke-linecap="round"/>' +
      '<g stroke-linecap="round" stroke-width="7" fill="none"><path d="M128 62 Q150 20 176 40" stroke="#2bb3a3"/><path d="M152 100 Q196 80 204 116" stroke="#ff8fa3"/><path d="M104 54 Q96 22 70 22" stroke="#5b5b9f"/></g>' +
      '<circle cx="186" cy="64" r="8" fill="#3b82ff"/><circle cx="88" cy="40" r="7" fill="#ff6b5e"/><circle cx="208" cy="140" r="7" fill="#59c059"/><circle cx="150" cy="30" r="6" fill="#fdb515"/>')
  };
  ART.body = ART.spark; ART.nerve = ART.spark;

  /* a kid engineer: goggles on the forehead, friendly face */
  function kid(x, skin, hair, style, shirt, goggles) {
    const base = '<g transform="translate(' + x + ' 0)">';
    const hairBack = style === 'curls' ? '<circle cx="60" cy="74" r="42" fill="' + hair + '"/>' : style === 'braids' ? '<path d="M24 78 Q30 20 60 20 Q90 20 96 78Z" fill="' + hair + '"/><rect x="22" y="76" width="14" height="70" rx="7" fill="' + hair + '"/><rect x="84" y="76" width="14" height="70" rx="7" fill="' + hair + '"/>' : '<path d="M24 80 Q24 22 60 22 Q96 22 96 80Z" fill="' + hair + '"/>' + (style === 'bun' ? '<circle cx="60" cy="14" r="17" fill="' + hair + '"/>' : '');
    return base + shadow(60, 232, 44) +
      '<rect x="40" y="170" width="16" height="56" rx="8" fill="#3d4566"/><rect x="64" y="170" width="16" height="56" rx="8" fill="#3d4566"/><ellipse cx="46" cy="228" rx="15" ry="6" fill="#2b2f4a"/><ellipse cx="74" cy="228" rx="15" ry="6" fill="#2b2f4a"/>' +
      '<rect x="26" y="112" width="68" height="70" rx="22" fill="' + shirt + '"/><rect x="12" y="116" width="18" height="46" rx="9" fill="' + shirt + '" transform="rotate(10 21 116)"/><rect x="90" y="116" width="18" height="46" rx="9" fill="' + shirt + '" transform="rotate(-10 99 116)"/>' +
      hairBack +
      '<circle cx="60" cy="86" r="34" fill="' + skin + '"/>' +
      '<rect x="26" y="52" width="68" height="14" rx="7" fill="' + goggles + '"/><circle cx="46" cy="59" r="9" fill="#eaf4ff" stroke="#2b2f4a" stroke-width="3"/><circle cx="74" cy="59" r="9" fill="#eaf4ff" stroke="#2b2f4a" stroke-width="3"/>' +
      '<circle cx="48" cy="92" r="4.5" fill="#2b2f4a"/><circle cx="72" cy="92" r="4.5" fill="#2b2f4a"/>' +
      '<path d="M46 106 Q60 120 74 106" stroke="#2b2f4a" stroke-width="4.5" fill="#fff" stroke-linecap="round"/><circle cx="38" cy="102" r="6" fill="#ff8fa3" opacity=".5"/><circle cx="82" cy="102" r="6" fill="#ff8fa3" opacity=".5"/></g>';
  }
  ART.kid = svg(kid(60, '#c98f5f', '#4a3426', 'bun', '#5b5b9f', '#fdb515'));
  ART.kids = svg(
    kid(0, '#c98f5f', '#4a3426', 'bun', '#fdb515', '#5b5b9f') + kid(112, '#8d5a3a', '#b8532a', 'curls', '#5b5b9f', '#fdb515') +
    kid(224, '#6b4429', '#1f1a1a', 'braids', '#2bb3a3', '#ff6b5e') + kid(336, '#e8b48a', '#2b2b33', 'bun', '#ff6b5e', '#5b5b9f') +
    kid(448, '#a8714a', '#2b2b33', 'curls', '#8b7fe8', '#fdb515'), '0 0 580 240');

  /* brush strokes behind the characters (a nod to the painted look of the reference) */
  const stroke = (d, c, w, o) => '<path d="' + d + '" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" fill="none" opacity="' + (o || .85) + '"/>';
  const SPLASH = svg(
    stroke('M20 250 Q120 190 220 230 T420 190 T600 170', '#fdb515', 34, .9) + stroke('M10 300 Q130 250 250 285 T470 255 T610 235', '#7fd1c4', 26, .85) +
    stroke('M60 170 Q190 120 300 150 T520 110', '#ffb3b3', 22, .85) + stroke('M130 330 Q260 300 380 325 T600 295', '#7aa7d9', 18, .8) +
    '<circle cx="90" cy="110" r="9" fill="#7aa7d9"/><circle cx="520" cy="60" r="7" fill="#e98f66"/><circle cx="560" cy="330" r="8" fill="#fdb515"/><circle cx="40" cy="330" r="6" fill="#7fd1c4"/><circle cx="330" cy="70" r="6" fill="#ffb3b3"/>',
    '0 0 640 360');
  const BLOB = svg(
    '<path d="M40 150 Q30 60 110 36 Q190 12 226 84 Q262 156 200 214 Q138 272 70 232 Q44 214 40 150Z" fill="currentColor"/>', '0 0 280 280');

  root.CampArt = {
    html(key, cls) {
      if (ART[key]) return '<div class="art ' + (cls || '') + '">' + ART[key] + '</div>';
      return '<div class="art emoji ' + (cls || '') + '" aria-hidden="true">⭐</div>';
    },
    splash: () => '<div class="splash" aria-hidden="true">' + SPLASH + '</div>',
    blob: () => '<div class="blob" aria-hidden="true">' + BLOB + '</div>',
    keys: () => Object.keys(ART),
    raw: (k) => ART[k]
  };
})(typeof self !== 'undefined' ? self : this);
