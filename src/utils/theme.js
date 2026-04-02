import { Dimensions } from 'react-native';

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const COLORS = {
  bg:         '#0a0a18',
  surface:    '#111126',
  surface2:   '#1a1a2e',
  border:     '#2a2a4a',
  accent:     '#4F7CFF',
  accent2:    '#FF6B6B',
  accent3:    '#00D2A0',
  warning:    '#FFB347',
  text:       '#e8e8ff',
  textMuted:  '#888',
  textDim:    '#555',
  white:      '#ffffff',
};

export const NB_COLORS = ['#4F7CFF','#FF6B6B','#00D2A0','#FFB347','#D47AFF','#FF9F9F','#00B4D8','#F72585'];
export const NB_ICONS  = ['📓','💼','💡','🔬','🎨','🏠','📚','✈️','🎵','❤️','🌿','🔑'];

export const PRIORITY_COLORS = {
  high:   '#FF6B6B',
  medium: '#FFB347',
  low:    '#4F7CFF',
};

export const STATUS_COLORS = {
  pending:     '#888',
  'in-progress': '#FFB347',
  done:        '#00D2A0',
};

export const FONTS = {
  regular: undefined,   // system default
  bold: undefined,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
};
