import React from 'react';
import { Typography, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(1, 0),
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
  size?: number;
  strokeWidth?: number;
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
  size = 140,
  strokeWidth = 10,
  label,
}) => {
  const classes = useStyles();

  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc from 150° to 390° = 240° sweep, leaving a 120° gap at the bottom
  const startDeg = 150;
  const endDeg = 390;
  const sweepDeg = endDeg - startDeg;

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const arcPoint = (deg: number) => ({
    x: cx + radius * Math.cos(toRad(deg)),
    y: cy + radius * Math.sin(toRad(deg)),
  });

  const makeArc = (from: number, to: number) => {
    const start = arcPoint(from);
    const end = arcPoint(to);
    const sweep = to - from;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const clampedValue = Math.min(Math.max(value, 0), 100);
  const valueDeg = startDeg + (sweepDeg * clampedValue) / 100;
  const color = getColor(value);

  // Clip the SVG height to cut off space below the arc gap
  const bottomPoint = arcPoint(startDeg);
  const svgHeight = bottomPoint.y + strokeWidth;

  return (
    <div className={classes.container}>
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${size} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: size }}
      >
        {/* Background track */}
        <path
          d={makeArc(startDeg, endDeg)}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {clampedValue > 0 && (
          <path
            d={makeArc(startDeg, valueDeg)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Center percentage */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size * 0.24}
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
