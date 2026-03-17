import { Text } from 'ink';

export function Indicator({ isSelected }: { isSelected?: boolean }) {
  return <Text>{isSelected ? '❯ ' : '  '}</Text>;
}

export function Item({ isSelected, label }: { isSelected?: boolean; label: string }) {
  return <Text dimColor={!isSelected}>{label}</Text>;
}
