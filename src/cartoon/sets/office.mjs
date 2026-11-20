/**
 * An office in the evening: a screen on the wall to the left, a window and a
 * desk to the right, and a rug to stand on.
 *
 * A set is data and nothing else, because a film sends it to the page as
 * JSON. It gives its drawing and what a manuscript may name in it:
 * - `marks`, places to stand, for {gå};
 * - `things`, points to look and point at, for {se} and {peg};
 * - `screen`, where a picture from {vis} is shown;
 * - `shots`, parts of the room for {kamera}, all 16 by 9. `total` is the
 *   whole room and is where a film opens.
 * `floor` is the height the figure's feet stand at.
 */
export default {
  name: "office",
  width: 1920,
  height: 1080,
  floor: 905,
  marks: { midt: { x: 1240 }, skærm: { x: 900 } },
  things: { skærm: { x: 425, y: 400 }, vindue: { x: 1575, y: 355 }, bærbar: { x: 1560, y: 600 } },
  screen: { x: 150, y: 230, width: 550, height: 340 },
  shots: {
    total: { x: 0, y: 0, width: 1920, height: 1080 },
    skærm: { x: 105, y: 220, width: 640, height: 360 },
  },
  svg: `
<rect width="1920" height="800" fill="#45406e"/>
<g stroke="#3d3963" stroke-width="4">
  <path d="M240,0V780 M480,0V780 M720,0V780 M960,0V780 M1200,0V780 M1440,0V780 M1680,0V780"/>
</g>
<rect y="800" width="1920" height="280" fill="#6a5560"/>
<g stroke="#55434f" stroke-width="4">
  <path d="M0,870H1920 M0,950H1920 M0,1030H1920 M300,800V870 M900,800V870 M1500,800V870 M600,870V950 M1250,870V950 M150,950V1030 M1000,950V1030 M1700,950V1030"/>
</g>
<rect class="o" y="776" x="-10" width="1940" height="26" fill="#2c2947"/>
<ellipse cx="960" cy="925" rx="640" ry="88" fill="#37335a" class="o"/>

<path class="l" d="M960,0V70"/>
<path class="o" fill="#2c2947" d="M900,120 C900,80 1020,80 1020,120 Z"/>
<ellipse cx="960" cy="122" rx="58" ry="10" fill="#f4e9b8" class="o"/>

<rect class="o" x="1390" y="160" width="370" height="390" rx="8" fill="#1c1a35"/>
<circle cx="1660" cy="250" r="38" fill="#e9e6ff"/>
<g fill="#e9e6ff"><circle cx="1450" cy="220" r="3"/><circle cx="1520" cy="330" r="3"/><circle cx="1600" cy="400" r="2.5"/><circle cx="1470" cy="440" r="2.5"/><circle cx="1710" cy="360" r="3"/></g>
<path class="l" d="M1575,160V550 M1390,355H1760"/>
<rect class="o" x="1372" y="546" width="406" height="20" rx="6" fill="#2c2947"/>

<rect class="o" x="1340" y="640" width="500" height="26" rx="6" fill="#2c2947"/>
<path class="o" fill="#2c2947" d="M1370,666H1396V840H1370Z M1784,666H1810V840H1784Z"/>
<path class="o" fill="#1a182b" d="M1480,560H1640V640H1480Z"/>
<rect x="1492" y="572" width="136" height="58" fill="#8f89d6"/>
<path class="o" fill="#3a3760" d="M1456,640H1664L1650,628H1470Z"/>
<path class="o" fill="#b0614a" d="M1716,600H1780L1770,640H1726Z"/>
<path class="o" fill="#3f8f5f" d="M1748,602 C1700,560 1716,520 1740,548 C1736,500 1770,500 1760,550 C1790,520 1806,566 1748,602Z"/>

<path class="o" fill="#b0614a" d="M40,760H130L118,850H52Z"/>
<path class="o" fill="#3f8f5f" d="M85,762 C10,700 30,620 70,680 C50,580 120,580 104,680 C150,620 170,710 85,762Z"/>

<rect class="o" x="130" y="210" width="590" height="380" rx="16" fill="#1a182b"/>
<rect x="150" y="230" width="550" height="340" rx="4" fill="#e7e4fb"/>
`,
};
