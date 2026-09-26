import type * as React from 'react';

export type IconName = 'house' | 'search' | 'sliders' | 'person' | 'bell' | 'wifi' | 'moon' | 'music' | 'sun' | 'lock' | 'plus' | 'drop' | 'chevron';

export interface IconProps { name: IconName; size?: number; weight?: number; label?: string; className?: string }
/** 24px-grid line glyph drawn in currentColor. Pass `label` only when the icon stands alone. */
export declare function Icon(props: IconProps): React.ReactElement;

export interface GlassToggleProps { label?: React.ReactNode | null; onChange?: (on: boolean) => void; 'aria-label'?: string; className?: string }
/** The system-wide Liquid Glass switch (on by default). Ship it in every app's Appearance settings. */
export declare function GlassToggle(props: GlassToggleProps): React.ReactElement;

/** [on, set] for the Liquid Glass setting; re-renders when it changes anywhere. */
export declare function useLiquidGlass(): [boolean, (on: boolean) => void];
export declare function getLiquidGlass(): boolean;
/** Set Liquid Glass on or off app-wide. Persists to localStorage unless { persist: false }. */
export declare function setLiquidGlass(on: boolean, opts?: { persist?: boolean }): void;
/** Attach the refracting lens to a custom element that has the sg-glass class. */
export declare function useLens(ref: React.RefObject<HTMLElement>, opts?: { strong?: boolean; enabled?: boolean }): void;
/** true where backdrop-filter: url() refraction renders (Chromium engines). */
export declare const lensSupported: boolean;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tinted' | 'glass' | 'plain' | 'destructive';
  size?: 'small' | 'regular' | 'large';
  icon?: IconName;
}
/** Pill button. filled = the one primary action; tinted/glass = secondary; plain = tertiary. */
export declare function Button(props: ButtonProps): React.ReactElement;

export interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  strength?: 'regular' | 'strong';
  as?: keyof JSX.IntrinsicElements;
}
/** Floating translucent panel with blur, rim and lift. */
export declare function GlassCard(props: GlassCardProps): React.ReactElement;

export interface SwitchProps { label?: React.ReactNode; checked?: boolean; defaultChecked?: boolean; disabled?: boolean; onChange?: (checked: boolean) => void; 'aria-label'?: string; className?: string }
/** On/off toggle, 51x31. Controlled with checked, uncontrolled with defaultChecked. */
export declare function Switch(props: SwitchProps): React.ReactElement;

export interface SegmentedControlProps { options: string[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; 'aria-label'?: string; className?: string }
/** 2 to 5 mutually exclusive views with a sliding thumb. */
export declare function SegmentedControl(props: SegmentedControlProps): React.ReactElement;

export interface SliderProps { min?: number; max?: number; step?: number; value?: number; defaultValue?: number; onChange?: (value: number) => void; minIcon?: IconName; maxIcon?: IconName; 'aria-label'?: string; className?: string }
/** Continuous value with a filled accent track and white thumb. */
export declare function Slider(props: SliderProps): React.ReactElement;

export interface SearchFieldProps { placeholder?: string; value?: string; defaultValue?: string; onChange?: (value: string) => void; className?: string }
/** Glass pill search input with leading magnifier. */
export declare function SearchField(props: SearchFieldProps): React.ReactElement;

export interface ListProps { header?: React.ReactNode; footer?: React.ReactNode; glass?: boolean; children?: React.ReactNode; className?: string }
/** Inset grouped section holding ListRow children. */
export declare function List(props: ListProps): React.ReactElement;

export interface ListRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  detail?: React.ReactNode;
  icon?: IconName | React.ReactNode;
  /** CSS color for the icon square, e.g. 'var(--wall-indigo)'. Must hold 3:1 against white. */
  iconColor?: string;
  /** 'chevron' (default), 'none', or any node such as a Switch. */
  accessory?: 'chevron' | 'none' | React.ReactNode;
  onClick?: () => void;
  className?: string;
}
/** One 44px+ row inside a List. */
export declare function ListRow(props: ListRowProps): React.ReactElement;

export interface TabItem { id: string; label: string; icon: IconName }
export interface TabBarProps { items: TabItem[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; 'aria-label'?: string; className?: string }
/** Floating glass pill of 2 to 5 top-level destinations. */
export declare function TabBar(props: TabBarProps): React.ReactElement;

declare global {
  interface Window {
    SantiGlass: {
      GlassToggle: typeof GlassToggle; useLiquidGlass: typeof useLiquidGlass; getLiquidGlass: typeof getLiquidGlass; setLiquidGlass: typeof setLiquidGlass; useLens: typeof useLens; lensSupported: boolean;
      Button: typeof Button; GlassCard: typeof GlassCard; Switch: typeof Switch; SegmentedControl: typeof SegmentedControl;
      Slider: typeof Slider; SearchField: typeof SearchField; List: typeof List; ListRow: typeof ListRow; TabBar: typeof TabBar; Icon: typeof Icon;
    };
  }
}
