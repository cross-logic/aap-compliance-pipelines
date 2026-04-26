import React from 'react';
import { Typography, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(1, 0),
    width: '100%',
  },
  label: {
    marginTop: theme.spacing(0.5),
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
}));

interface ComplianceGaugeProps {
  value: number;
  label?: string;
}

const getColor = (value: number): string => {
  if (value >= 90) return '#3E8635';
  if (value >= 75) return '#F0AB00';
  if (value >= 50) return '#EC7A08';
  return '#C9190B';
};

export const ComplianceGauge: React.FC<ComplianceGaugeProps> = ({
  value,
  label,
}) => {
  const classes = useStyles();

  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // We want an arc that opens at the bottom.
  // Using standard math angles where 0° = right, 90° = bottom:
  // Start at bottom-left (about 120°), sweep clockwise to bottom-right (about 420° = 60°)
  // That's a 300° arc with a 60° gap at the bottom... but we want wider.
  // Let's do: start at 210° in SVG coords (bottom-left), end at 330° (bottom-right)
  // going the LONG way around (through top). That's a 240° arc, 120° gap.

  // SVG angles: 0° = 3 o'clock, goes clockwise
  // We want gap centered at 6 o'clock (270° in SVG)
  // So start = 270 - 120 = 150° ... no wait.
  // Gap is 120°, centered at bottom (180° in our math).
  // Start angle (bottom-left): 180 + 60 = 240° from top...

  // Simplest approach: use parametric angles.
  // 0° = top center. Clockwise.
  // We want the arc to start at bottom-left and go clockwise all the way around to bottom-right.
  // Bottom = 180°. Gap = 120° centered at bottom.
  // So: arc starts at 180+60 = 240° (if 0=top, CW) and ends at 180-60 = 120°
  // Going CW from 240° to 120° (next revolution) = 240° of arc. ✓

  // Convert to SVG path coords:
  const degToRad = (d: number) => (d * Math.PI) / 180;

  // Angle 0 = top, clockwise
  const pointOnCircle = (angleDeg: number) => ({
    x: cx + radius * Math.sin(degToRad(angleDeg)),
    y: cy - radius * Math.cos(degToRad(angleDeg)),
  });

  const arcStartDeg = 240; // bottom-left
  const arcEndDeg = 120 + 360; // bottom-right (next revolution)
  const totalSweepDeg = arcEndDeg - arcStartDeg; // 240°

  const clampedValue = Math.min(Math.max(value, 0), 100);
  const valueSweepDeg = (totalSweepDeg * clampedValue) / 100;
  const valueEndDeg = arcStartDeg + valueSweepDeg;

  const makeSvgArc = (fromDeg: number, toDeg: number) => {
    const startPt = pointOnCircle(fromDeg % 360);
    const endPt = pointOnCircle(toDeg % 360);
    const sweep = toDeg - fromDeg;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;
  };

  const color = getColor(value);

  // Clip SVG at the top of the gap (just below center + some margin)
  const gapTopY = pointOnCircle(arcStartDeg).y;
  const svgHeight = gapTopY + strokeWidth / 2 + 2;

  return (
    <div className={classes.container}>
      <svg
        viewBox={`0 0 ${size} ${svgHeight}`}
        style={{ width: '100%', maxWidth: size, height: 'auto' }}
      >
        {/* Background track */}
        <path
          d={makeSvgArc(arcStartDeg, arcEndDeg)}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {clampedValue > 0.5 && (
          <path
            d={makeSvgArc(arcStartDeg, valueEndDeg)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Center percentage */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="28"
          fontWeight={700}
          fontFamily='"Red Hat Text", "Red Hat Display", sans-serif'
        >
          {Math.round(value)}%
        </text>
      </svg>
      {label && (
        <Typography className={classes.label}>{label}</Typography>
      )}
    </div>
  );
};
