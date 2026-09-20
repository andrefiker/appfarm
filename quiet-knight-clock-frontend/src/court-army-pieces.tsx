import type { ReactElement, ReactNode } from 'react';
import type { Color, Kind } from './pieces';

type CourtArmyPieceProps = {
  color: Color;
  kind: Kind;
  scope: string;
  label?: string;
};

type HeadProps = {
  x?: number;
  y?: number;
  rx?: number;
  ry?: number;
  helmet?: boolean;
};

/**
 * Original Quiet Knight artwork. Court & Army uses local SVG primitives so
 * every role stays crisp, packageable, and legally unambiguous.
 *
 * The figures deliberately use human anatomy rather than Staunton geometry:
 * head, shoulders, torso, articulated arms, a divided stance, and feet.
 */
export function CourtArmyPiece({
  color,
  kind,
  scope,
  label,
}: CourtArmyPieceProps): ReactElement {
  const id = (`qk-court-${scope}-${color}-${kind}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const white = color === 'w';
  const outline = white ? '#5b402c' : '#030708';
  const cloth = white ? '#ead4a7' : '#20292c';
  const clothShade = white ? '#9b6840' : '#080d0f';
  const metal = white ? '#fff3cf' : '#78898b';
  const metalShade = white ? '#b88750' : '#303b3d';
  const accent = white ? '#d3a344' : '#77252e';
  const accentLight = white ? '#f2d486' : '#b94d53';
  const skin = white ? '#d7a477' : '#9c6a50';
  const skinShade = white ? '#9a684a' : '#57372e';
  const hair = white ? '#735038' : '#161214';
  const highlight = white ? '#fffbed' : '#bccac7';
  const eye = white ? '#37271f' : '#f0e4cf';
  const leather = white ? '#79543a' : '#251a19';
  const horse = white ? '#c99c67' : '#34383a';
  const horseShade = white ? '#81563a' : '#101416';
  const body = `url(#${id}-body)`;
  const armor = `url(#${id}-armor)`;
  const cape = `url(#${id}-cape)`;
  const shadow = `url(#${id}-shadow)`;

  const Head = ({ x = 50, y = 25, rx = 6.4, ry = 7.2, helmet = false }: HeadProps) => (
    <g className="figure-head" data-anatomy="head">
      <ellipse cx={x} cy={y + 1} rx={rx + 1.2} ry={ry} fill={hair} />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={skin} />
      <path
        d={`M${x - 3.2} ${y + 1.2} Q${x} ${y + 3.6} ${x + 3.2} ${y + 1.2}`}
        fill="none"
        stroke={skinShade}
        strokeWidth=".75"
      />
      <circle cx={x - 2.1} cy={y - 1} r=".65" fill={eye} stroke="none" />
      <circle cx={x + 2.1} cy={y - 1} r=".65" fill={eye} stroke="none" />
      {helmet ? (
        <path
          d={`M${x - rx - 1} ${y - 1} Q${x - rx + 1} ${y - ry - 5} ${x} ${y - ry - 5.5} Q${x + rx - 1} ${y - ry - 5} ${x + rx + 1} ${y - 1} Q${x} ${y - 4} ${x - rx - 1} ${y - 1}Z`}
          fill={armor}
        />
      ) : null}
    </g>
  );

  const Ground = ({ wide = 23 }: { wide?: number }) => (
    <ellipse className="figure-shadow" cx="50" cy="90" rx={wide} ry="5.2" fill={shadow} stroke="none" />
  );

  const Feet = ({ left = 43, right = 57, y = 85 }: { left?: number; right?: number; y?: number }) => (
    <g className="figure-feet" data-anatomy="feet">
      <ellipse cx={left} cy={y} rx="6" ry="3.4" fill={leather} />
      <ellipse cx={right} cy={y} rx="6" ry="3.4" fill={leather} />
      <path d={`M${left - 3} ${y - 1} h6 M${right - 3} ${y - 1} h6`} stroke={highlight} strokeOpacity=".32" />
    </g>
  );

  const HumanFrame = ({
    torso,
    beltY = 58,
    shoulders = 17,
    leftArm = 'M39 43 Q31 53 32 67',
    rightArm = 'M61 43 Q69 53 68 67',
    leftLeg = 'M45 60 L42 83',
    rightLeg = 'M55 60 L58 83',
    children,
  }: {
    torso: string;
    beltY?: number;
    shoulders?: number;
    leftArm?: string;
    rightArm?: string;
    leftLeg?: string;
    rightLeg?: string;
    children?: ReactNode;
  }) => (
    <g className="figure-body" data-anatomy="shoulders torso arms legs">
      <path d={`M${50 - shoulders} 43 Q50 35 ${50 + shoulders} 43`} fill="none" stroke={armor} strokeWidth="8" />
      <path d={torso} fill={body} />
      <path d={leftArm} fill="none" stroke={armor} strokeWidth="7" />
      <path d={rightArm} fill="none" stroke={armor} strokeWidth="7" />
      <circle cx="32" cy="67" r="3.7" fill={skin} />
      <circle cx="68" cy="67" r="3.7" fill={skin} />
      <path d={`M39 ${beltY} H61`} stroke={accent} strokeWidth="3" />
      <path d={leftLeg} fill="none" stroke={clothShade} strokeWidth="8" />
      <path d={rightLeg} fill="none" stroke={clothShade} strokeWidth="8" />
      {children}
    </g>
  );

  return (
    <svg
      className={`chess-art court-army-art art-${color}`}
      data-piece-style="court-army"
      data-figure-kind={kind}
      viewBox="0 0 100 100"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={highlight} />
          <stop offset=".34" stopColor={cloth} />
          <stop offset="1" stopColor={clothShade} />
        </linearGradient>
        <linearGradient id={`${id}-armor`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={highlight} />
          <stop offset=".28" stopColor={metal} />
          <stop offset="1" stopColor={metalShade} />
        </linearGradient>
        <linearGradient id={`${id}-cape`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={accentLight} />
          <stop offset=".55" stopColor={accent} />
          <stop offset="1" stopColor={clothShade} />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#020504" stopOpacity=".6" />
          <stop offset="1" stopColor="#020504" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g stroke={outline} strokeWidth="1.15" strokeLinejoin="round" strokeLinecap="round">
        {kind === 'p' ? (
          <g className="court-infantry" data-figure-role="infantry soldier">
            <Ground wide={18} />
            <Feet left={44} right={57} y={86} />
            <HumanFrame
              torso="M39 43 Q50 38 61 43 L60 62 Q50 68 40 62Z"
              shoulders={14}
              beltY={58}
              leftArm="M39 45 Q33 53 34 64"
              rightArm="M61 45 Q65 52 65 64"
              leftLeg="M46 61 L43 83"
              rightLeg="M54 61 L58 83"
            >
              <path d="M43 47 H57 L56 57 Q50 61 44 57Z" fill={armor} />
              <path d="M49 46 V59" stroke={accent} strokeWidth="1.7" />
            </HumanFrame>
            <Head y={31} rx={6.1} ry={6.7} helmet />
            <path d="M50 19 V27" stroke={accent} strokeWidth="2" />
            <path d="M72 19 L72 81" stroke={leather} strokeWidth="2.6" />
            <path d="M72 18 L76 28 L72 25 L68 28Z" fill={metal} />
            <path d="M65 62 Q69 59 72 58" fill="none" stroke={skin} strokeWidth="4" />
          </g>
        ) : null}

        {kind === 'r' ? (
          <g className="court-guard" data-figure-role="palace guard">
            <Ground wide={27} />
            <Feet left={47} right={67} y={87} />
            <path d="M43 45 Q55 36 68 43 L68 65 Q57 70 47 64Z" fill={armor} data-anatomy="torso shoulders" />
            <path d="M52 63 L48 84 M63 63 L67 84" fill="none" stroke={clothShade} strokeWidth="9" data-anatomy="legs" />
            <path d="M66 44 Q75 51 75 65" fill="none" stroke={armor} strokeWidth="7" data-anatomy="arm" />
            <circle cx="75" cy="66" r="3.8" fill={skin} />
            <Head x={57} y={29} rx={6.8} ry={7.2} helmet />
            <path d="M49 20 L53 14 L57 19 L61 14 L66 20 L65 27 Q57 23 49 27Z" fill={armor} />
            <path d="M18 36 L50 38 L53 80 Q34 87 17 78Z" fill={body} data-equipment="tower shield" />
            <path d="M18 36 L25 30 L33 36 L41 30 L50 38" fill={armor} />
            <path d="M25 44 H47 M25 53 H49 M26 62 H50 M27 71 H51" stroke={outline} strokeOpacity=".38" />
            <path d="M34 38 V81" stroke={highlight} strokeOpacity=".55" />
            <path d="M70 35 L82 80" stroke={accentLight} strokeWidth="2.8" />
          </g>
        ) : null}

        {kind === 'b' ? (
          <g className="court-cleric" data-figure-role="cleric bishop">
            <Ground wide={21} />
            <Feet left={43} right={58} y={87} />
            <path d="M34 44 Q50 34 66 44 L62 71 Q50 78 38 71Z" fill={body} data-anatomy="torso robe shoulders" />
            <path d="M40 69 L42 84 M60 69 L59 84" fill="none" stroke={clothShade} strokeWidth="8" data-anatomy="legs" />
            <path d="M38 46 Q30 54 31 67 M62 46 Q68 53 70 62" fill="none" stroke={body} strokeWidth="7" data-anatomy="arms" />
            <circle cx="31" cy="68" r="3.7" fill={skin} />
            <circle cx="70" cy="63" r="3.7" fill={skin} />
            <path d="M38 61 Q50 66 62 61" fill="none" stroke={accent} strokeWidth="2.5" />
            <Head y={29} rx={6.2} ry={6.7} />
            <path d="M40 28 Q42 12 50 5 Q58 12 60 28 Q50 22 40 28Z" fill={armor} data-equipment="mitre" />
            <path d="M50 6 L47 25" stroke={accent} strokeWidth="2.4" />
            <path d="M76 20 V82" stroke={metal} strokeWidth="2.8" data-equipment="crozier" />
            <path d="M76 21 Q85 21 83 30 Q82 36 75 35" fill="none" stroke={metal} strokeWidth="3.1" />
            <path d="M69 62 Q72 58 76 57" fill="none" stroke={skin} strokeWidth="3.5" />
          </g>
        ) : null}

        {kind === 'q' ? (
          <g className="court-queen" data-figure-role="standing queen">
            <Ground wide={24} />
            <Feet left={43} right={59} y={88} />
            <path d="M29 44 Q38 35 44 39 Q50 44 56 39 Q63 35 71 44 L65 79 Q50 87 35 79Z" fill={cape} data-equipment="mantle" />
            <path d="M38 43 Q50 36 62 43 L59 68 Q50 74 41 68Z" fill={body} data-anatomy="torso shoulders" />
            <path d="M43 66 L42 85 M57 66 L60 85" fill="none" stroke={clothShade} strokeWidth="8" data-anatomy="legs" />
            <path d="M39 46 Q30 53 29 66 M61 46 Q70 49 74 59" fill="none" stroke={body} strokeWidth="6.5" data-anatomy="arms" />
            <circle cx="29" cy="67" r="3.6" fill={skin} />
            <circle cx="75" cy="60" r="3.6" fill={skin} />
            <Head y={28} rx={6.5} ry={7} />
            <path d="M39 22 L42 12 L47 18 L51 9 L56 18 L61 12 L63 23 Q51 18 39 22Z" fill={armor} data-equipment="tiara" />
            <circle cx="51" cy="10" r="2" fill={accent} />
            <path d="M43 53 H57 M42 59 H58" stroke={accent} strokeWidth="1.6" />
            <path d="M77 29 L76 63" stroke={metal} strokeWidth="2.4" data-equipment="royal staff" />
            <circle cx="77" cy="26" r="4" fill={accentLight} />
          </g>
        ) : null}

        {kind === 'k' ? (
          <g className="court-king" data-figure-role="standing king">
            <Ground wide={26} />
            <Feet left={42} right={60} y={89} />
            <path d="M26 45 Q36 34 43 39 Q50 43 57 39 Q66 34 74 45 L67 80 Q50 89 33 80Z" fill={cape} data-equipment="royal cloak" />
            <path d="M36 42 Q50 34 64 42 L62 68 Q50 75 38 68Z" fill={body} data-anatomy="torso shoulders" />
            <path d="M42 66 L41 86 M58 66 L61 86" fill="none" stroke={clothShade} strokeWidth="9" data-anatomy="legs" />
            <path d="M38 45 Q29 53 29 66 M62 45 Q70 51 71 64" fill="none" stroke={armor} strokeWidth="7.5" data-anatomy="arms" />
            <circle cx="29" cy="67" r="4" fill={skin} />
            <circle cx="71" cy="65" r="4" fill={skin} />
            <Head y={27} rx={7.2} ry={7.6} />
            <path d="M36 21 L38 8 L45 16 L50 5 L56 16 L63 8 L65 22 Q50 16 36 21Z" fill={armor} data-equipment="crown" />
            <path d="M50 6 V19 M44 12 H56" stroke={accent} strokeWidth="2.1" />
            <path d="M43 52 L50 57 L57 52" fill="none" stroke={accent} strokeWidth="2" />
            <path d="M78 23 V78" stroke={metal} strokeWidth="3" data-equipment="scepter" />
            <path d="M73 25 H83 M78 20 V31" stroke={accentLight} strokeWidth="2.7" />
            <path d="M71 64 Q75 59 78 58" fill="none" stroke={skin} strokeWidth="4" />
          </g>
        ) : null}

        {kind === 'n' ? (
          <g className="court-cavalry" data-figure-role="mounted cavalry">
            <Ground wide={34} />
            <g className="horse" data-anatomy="horse head neck body four legs">
              <path d="M25 58 Q25 43 35 35 Q48 27 66 34 Q78 39 80 56 Q77 68 67 72 L38 70 Q28 67 25 58Z" fill={horse} data-equipment="horse body" />
              <path d="M35 43 L19 39 L15 29 L23 18 L32 21 L38 17 L45 36Z" fill={horse} data-equipment="horse head neck" />
              <path d="M18 29 L14 19 L23 24 M31 21 L33 12 L38 25" fill={horseShade} />
              <circle cx="22" cy="30" r="1.7" fill={eye} stroke="none" />
              <path d="M17 39 Q23 45 31 40" fill="none" stroke={outline} />
              <path d="M31 63 L27 84 M43 68 L42 86 M65 68 L65 86 M76 60 L78 82" fill="none" stroke={horseShade} strokeWidth="6.5" data-anatomy="horse legs" />
              <ellipse cx="26" cy="86" rx="5" ry="2.7" fill={leather} />
              <ellipse cx="42" cy="88" rx="5" ry="2.7" fill={leather} />
              <ellipse cx="65" cy="88" rx="5" ry="2.7" fill={leather} />
              <ellipse cx="79" cy="84" rx="5" ry="2.7" fill={leather} />
              <path d="M77 43 Q88 46 84 61" fill="none" stroke={horseShade} strokeWidth="4" />
            </g>
            <path d="M39 45 Q52 38 67 44 L65 55 Q52 61 40 54Z" fill={accent} data-equipment="saddle" />
            <g className="rider" data-anatomy="rider head torso arms legs">
              <path d="M46 32 Q56 26 66 33 L64 48 Q56 53 48 48Z" fill={armor} data-anatomy="rider torso" />
              <path d="M48 45 L39 59 M63 46 L71 59" fill="none" stroke={clothShade} strokeWidth="5.5" data-anatomy="rider legs" />
              <path d="M48 35 L37 40 M64 35 L72 29" fill="none" stroke={armor} strokeWidth="5" data-anatomy="rider arms" />
              <Head x={56} y={22} rx={5.8} ry={6.4} helmet />
              <path d="M56 11 V17" stroke={accent} strokeWidth="2" />
              <path d="M37 39 Q49 45 64 39" fill="none" stroke={accentLight} strokeWidth="1.7" data-equipment="reins" />
              <path d="M72 18 L79 62" stroke={accentLight} strokeWidth="2.5" data-equipment="lance" />
            </g>
          </g>
        ) : null}
      </g>
    </svg>
  );
}
