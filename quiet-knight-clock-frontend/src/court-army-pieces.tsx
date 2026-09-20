import type { ReactElement } from "react";
import type { Color, Kind } from "./pieces";

type CourtArmyPieceProps = {
  color: Color;
  kind: Kind;
  scope: string;
  label?: string;
};

/**
 * Original Quiet Knight artwork. Court & Army is deliberately built from
 * local SVG primitives so it stays crisp, packageable and legally unambiguous.
 */
export function CourtArmyPiece({
  color,
  kind,
  scope,
  label,
}: CourtArmyPieceProps): ReactElement {
  const id = ("qk-court-" + scope + "-" + color + "-" + kind).replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  );
  const white = color === "w";
  const outline = white ? "#63472f" : "#05090b";
  const cloth = white ? "#f2dfb5" : "#202a2d";
  const clothShade = white ? "#b8864f" : "#080f12";
  const metal = white ? "#fff8df" : "#78898a";
  const accent = white ? "#d8ad57" : "#7c2830";
  const accentLight = white ? "#f5d995" : "#b64b50";
  const skin = white ? "#d6a574" : "#8b604a";
  const hair = white ? "#7b5739" : "#171416";
  const highlight = white ? "#fffdf2" : "#b8c8c5";
  const eye = white ? "#403025" : "#eee5d1";
  const body = "url(#" + id + "-body)";
  const armor = "url(#" + id + "-armor)";
  const cape = "url(#" + id + "-cape)";
  const base = "url(#" + id + "-base)";

  const Head = ({
    x = 50,
    y = 31,
    r = 7,
  }: {
    x?: number;
    y?: number;
    r?: number;
  }) => (
    <>
      <ellipse cx={x} cy={y + 1.5} rx={r + 1} ry={r - 1} fill={hair} />
      <circle cx={x} cy={y} r={r} fill={skin} />
      <path
        d={"M" + (x - 2.6) + " " + (y + 1) + " Q" + x + " " + (y + 2.2) + " " + (x + 2.6) + " " + (y + 1)}
        fill="none"
        stroke={eye}
        strokeWidth=".8"
        strokeLinecap="round"
      />
    </>
  );

  const FigureBase = () => (
    <>
      <ellipse cx="51" cy="92" rx="29" ry="5.5" fill={"url(#" + id + "-shadow)"} />
      <path
        d="M24 82 Q50 76 76 82 L79 88 Q78 95 50 96 Q22 95 21 88Z"
        fill={base}
      />
      <ellipse cx="50" cy="83" rx="26" ry="7" fill={armor} />
      <path
        d="M25 88 Q50 96 76 88"
        fill="none"
        stroke={highlight}
        strokeOpacity=".35"
        strokeWidth="1.1"
      />
    </>
  );

  return (
    <svg
      className={"chess-art court-army-art art-" + color}
      data-piece-style="court-army"
      viewBox="0 0 100 100"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={id + "-body"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={highlight} />
          <stop offset=".36" stopColor={cloth} />
          <stop offset="1" stopColor={clothShade} />
        </linearGradient>
        <linearGradient id={id + "-armor"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={highlight} />
          <stop offset=".28" stopColor={metal} />
          <stop offset="1" stopColor={clothShade} />
        </linearGradient>
        <linearGradient id={id + "-cape"} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={accentLight} />
          <stop offset=".55" stopColor={accent} />
          <stop offset="1" stopColor={clothShade} />
        </linearGradient>
        <linearGradient id={id + "-base"} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={white ? "#f7e8c5" : "#536468"} />
          <stop offset=".45" stopColor={white ? "#c89b60" : "#222e31"} />
          <stop offset="1" stopColor={white ? "#765137" : "#070d0f"} />
        </linearGradient>
        <radialGradient id={id + "-shadow"}>
          <stop stopColor="#020504" stopOpacity=".65" />
          <stop offset="1" stopColor="#020504" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke={outline} strokeWidth="1.15" strokeLinejoin="round" strokeLinecap="round">
        <FigureBase />

        {kind === "p" ? (
          <>
            <path d="M37 79 L42 53 Q50 48 58 53 L63 79 Q50 85 37 79Z" fill={body} />
            <path d="M43 76 L46 57 M57 76 L54 57" fill="none" stroke={highlight} strokeOpacity=".45" />
            <Head y={42} r={7} />
            <path d="M40 40 Q50 27 60 40 L58 45 Q50 48 42 45Z" fill={armor} />
            <path d="M50 30 V45" stroke={accent} strokeWidth="2" />
            <path d="M64 28 L65 78" stroke={outline} strokeWidth="2.2" />
            <path d="M64 28 L68 36 L64 34 L60 36Z" fill={accent} />
          </>
        ) : null}

        {kind === "r" ? (
          <>
            <path d="M34 78 L38 44 Q50 38 62 44 L66 78 Q50 85 34 78Z" fill={armor} />
            <Head y={32} r={7.5} />
            <path d="M40 29 L43 21 L48 25 L52 20 L57 25 L61 21 L61 34 Q50 39 40 34Z" fill={metal} />
            <path d="M24 39 L57 41 L60 77 Q42 83 25 76Z" fill={body} />
            <path d="M24 39 L31 34 L39 39 L47 34 L57 41" fill={armor} />
            <path d="M31 47 H53 M32 56 H55 M33 65 H56" stroke={outline} strokeOpacity=".45" />
            <path d="M39 41 V78" stroke={highlight} strokeOpacity=".55" />
            <path d="M67 27 V76" stroke={accentLight} strokeWidth="2.5" />
          </>
        ) : null}

        {kind === "b" ? (
          <>
            <path d="M31 79 Q35 53 42 44 L58 44 Q66 57 69 79 Q50 87 31 79Z" fill={body} />
            <path d="M36 75 Q50 81 64 75" fill="none" stroke={accent} strokeWidth="2" />
            <Head y={34} r={7} />
            <path d="M39 34 Q42 18 50 10 Q58 18 61 34 Q50 40 39 34Z" fill={armor} />
            <path d="M50 11 L46 33" stroke={accent} strokeWidth="2.5" />
            <path d="M71 26 V77" stroke={metal} strokeWidth="2.7" />
            <path d="M71 27 Q78 27 76 34 Q75 38 70 37" fill="none" stroke={metal} strokeWidth="3" />
            <path d="M43 49 Q50 55 57 49" fill="none" stroke={accent} strokeWidth="2" />
          </>
        ) : null}

        {kind === "q" ? (
          <>
            <path d="M27 79 Q32 49 39 41 Q50 47 61 41 Q68 50 73 79 Q50 88 27 79Z" fill={cape} />
            <path d="M38 78 L41 48 Q50 53 59 48 L62 78 Q50 84 38 78Z" fill={body} />
            <Head y={31} r={7.5} />
            <path d="M37 25 L40 13 L46 20 L50 9 L55 20 L61 13 L63 25 Q50 32 37 25Z" fill={armor} />
            <circle cx="50" cy="11" r="2.2" fill={accent} />
            <path d="M38 46 Q28 52 28 63 M62 46 Q72 52 72 63" fill="none" stroke={metal} strokeWidth="4" />
            <circle cx="72" cy="64" r="4" fill={accentLight} />
            <path d="M43 57 H57 M42 65 H58" stroke={accent} strokeWidth="1.6" />
          </>
        ) : null}

        {kind === "k" ? (
          <>
            <path d="M24 79 Q30 48 39 39 Q50 45 61 39 Q70 49 76 79 Q50 89 24 79Z" fill={cape} />
            <path d="M37 78 L40 45 Q50 51 60 45 L63 78 Q50 85 37 78Z" fill={body} />
            <Head y={29} r={8} />
            <path d="M35 23 L37 9 L45 17 L50 6 L55 17 L63 9 L65 23 Q50 31 35 23Z" fill={armor} />
            <path d="M50 7 V20 M44 13 H56" stroke={accent} strokeWidth="2.2" />
            <path d="M70 29 V77" stroke={metal} strokeWidth="3" />
            <path d="M65 30 H75 M70 25 V36" stroke={accentLight} strokeWidth="2.5" />
            <path d="M43 53 L50 58 L57 53" fill="none" stroke={accent} strokeWidth="2" />
          </>
        ) : null}

        {kind === "n" ? (
          <>
            <path d="M25 72 Q23 57 31 44 L38 35 Q47 29 61 35 Q73 40 76 55 L72 76 Q54 84 34 78Z" fill={body} />
            <path d="M31 46 L21 38 L24 28 L33 20 L39 25 L45 21 L48 39Z" fill={armor} />
            <path d="M24 28 L20 20 L29 25 M34 22 L36 14 L41 26" fill={metal} />
            <circle cx="29" cy="31" r="1.8" fill={eye} />
            <path d="M22 38 Q27 42 34 38" fill="none" stroke={outline} />
            <path d="M31 45 Q35 56 34 75 M69 47 Q73 59 69 76" fill="none" stroke={clothShade} strokeWidth="3.2" />
            <ellipse cx="54" cy="43" rx="12" ry="8" fill={accent} />
            <path d="M43 50 Q54 55 66 50 L64 66 Q54 72 44 66Z" fill={armor} />
            <Head x={55} y={29} r={6.5} />
            <path d="M48 27 Q55 17 62 27 L61 32 Q55 35 49 32Z" fill={metal} />
            <path d="M48 45 L37 37 M61 44 L68 35" fill="none" stroke={metal} strokeWidth="3.4" />
            <path d="M35 36 Q49 43 64 37" fill="none" stroke={accentLight} strokeWidth="1.6" />
            <path d="M63 22 L72 69" stroke={accentLight} strokeWidth="2.2" />
          </>
        ) : null}
      </g>
    </svg>
  );
}
