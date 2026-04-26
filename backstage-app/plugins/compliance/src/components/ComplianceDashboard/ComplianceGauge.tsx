import React from 'react';
import { Typography, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(2, 0),
  },
  label: {
    marginTop: theme.spacing(1),
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
  size = 160,
  strokeWidth = 12,
  label,
}) => {
  const classes = useStyles();
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const range = endAngle - startAngle;
  const valueAngle = startAngle + (range * Math.min(Math.max(value, 0), 100)) / 100;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    startA: number,
    endA: number,
  ) => {
    const start = polarToCartesian(cx, cy, r, endA);
    const end = polarToCartesian(cx, cy, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const color = getColor(value);

  return (
    <div className={classes.container}>
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.85}`}>
        {/* Background track */}
        <path
          d={describeArc(center, center, radius, startAngle, endAngle)}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {value > 0 && (
          <path
            d={describeArc(center, center, radius, startAngle, valueAngle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Center text */}
        <text
          x={center}
          y={center + 4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size * 0.22}
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
